/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  buildParam,
  batchRequests,
} from '../../plugins/utils/query-api-utils';
import {
  getPageInstance,
} from '../../plugins/utils/current-page-utils';
import {initCounts} from '../../plugins/utils/widgets-utils';
import {
  REFRESH_MAPPING,
  DESTINATION_UNMAPPED,
} from '../../events/eventTypes';
import pubsub from '../../pub-sub';
import Relationship from '../../models/service-models/relationship';
import Context from '../../models/service-models/context';
import Evidence from '../../models/business-models/evidence';
import Document from '../../models/business-models/document';
import * as businessModels from '../../models/business-models';

let DOCUMENT_KIND_MAP = {
  FILE: 'documents_file',
  REFERENCE_URL: 'documents_reference_url',
};

export default can.Component.extend({
  tag: 'related-documents',
  leakScope: true,
  viewModel: {
    instance: {},
    modelType: 'Document',
    kind: '@',
    documents: [],
    isLoading: false,
    pubsub,
    define: {

      // automatically refresh instance on related document create/remove
      autorefresh: {
        type: 'boolean',
        value: true,
      },
    },
    getDocumentsQuery: function () {
      let relevantFilters = [{
        type: this.attr('instance.type'),
        id: this.attr('instance.id'),
        operation: 'relevant',
      }];
      let additionalFilter = this.attr('kind') ?
        {
          expression: {
            left: 'kind',
            op: {name: '='},
            right: this.attr('kind'),
          },
        } :
        [];

      let modelType = this.attr('modelType');
      let query =
        buildParam(modelType, {}, relevantFilters, [], additionalFilter);
      query.order_by = [{name: 'created_at', desc: true}];

      return query;
    },
    loadDocuments: function () {
      const query = this.getDocumentsQuery();

      this.attr('isLoading', true);
      this.refreshTabCounts();

      let modelType = this.attr('modelType');
      return batchRequests(query).then((response) => {
        const documents = response[modelType].values;
        this.attr('documents').replace(documents);
        this.attr('isLoading', false);
      });
    },
    setDocuments: function () {
      let instance;
      let kind;
      let documentPath;
      let documents;

      // load documents for non-snapshots objects
      if (!this.attr('isSnapshot')) {
        this.loadDocuments();
        return;
      }

      instance = this.attr('instance');
      kind = this.attr('kind');

      if (kind) {
        documentPath = DOCUMENT_KIND_MAP[kind];
        documents = instance[documentPath];
      } else {
        // We need to display URL and Evidences together ("Related
        // Assessments pane")
        documents = instance.document_url.concat(instance.document_evidence);
      }

      this.attr('documents').replace(documents);
    },
    createDocument: function (data) {
      let modelType = this.attr('modelType');
      let context = modelType === 'Evidence'
        ? this.instance.context
        : new Context({id: null});

      let document = new businessModels[modelType]({
        link: data,
        title: data,
        context,
        kind: this.kind,
      });
      return document;
    },
    saveDocument: function (document) {
      return document.save();
    },
    createRelationship: function (document) {
      let relationship = new Relationship({
        source: this.instance,
        destination: document,
        context: this.instance.context ||
          new Context({id: null}),
      });
      return relationship.save();
    },
    createRelatedDocument: function (data) {
      let self = this;
      let document = this.createDocument(data);

      this.attr('documents').unshift(document);
      this.attr('isLoading', true);

      return this.saveDocument(document)
        .then(this.createRelationship.bind(this))
        .then(function () {
          self.refreshRelatedDocuments();
        })
        .fail(function (err) {
          console.error(`Unable to create related document: ${err}`);
        })
        .done(function () {
          self.attr('isLoading', false);
        });
    },
    removeRelatedDocument: async function (document) {
      let self = this;
      let documents;
      let relationship = await Relationship.findRelationship(
        document, this.instance);
      if (!relationship.id) {
        console.warn('Unable to find relationship');
        return $.Deferred().reject({
          error: 'Unable to find relationship',
        });
      }

      documents = this.attr('documents').filter(function (item) {
        return item.id !== document.id;
      });

      this.attr('isLoading', true);
      this.attr('documents', documents);

      return relationship.destroy()
        .then(function () {
          self.refreshRelatedDocuments();
        })
        .fail(function (err) {
          console.error(`Unable to remove related document: ${err}`);
        })
        .done(function () {
          self.attr('isLoading', false);
        });
    },
    markDocumentForDeletion: function (document) {
      let documents = this.attr('documents').filter(function (item) {
        return item !== document;
      });

      this.attr('documents', documents);
      this.dispatch({
        type: 'removeMappings',
        object: document,
      });
    },
    markDocumentForAddition: function (data) {
      let document = this.createDocument(data);

      this.attr('documents').unshift(document);
      this.attr('isLoading', true);

      return this.saveDocument(document)
        .then(() => {
          this.dispatch({
            type: 'addMappings',
            objects: [document],
          });
        })
        .always(() => this.attr('isLoading', false));
    },
    refreshRelatedDocuments: function () {
      if (this.autorefresh) {
        this.loadDocuments();
      }
    },
    refreshTabCounts: function () {
      let pageInstance = getPageInstance();
      let modelType = this.attr('modelType');
      initCounts(
        [modelType],
        pageInstance.type,
        pageInstance.id
      );
    },
  },
  init: function () {
    let instance = this.viewModel.attr('instance');
    let isNew = instance.isNew();
    let isSnapshot = !!(instance.snapshot || instance.isRevision);

    // don't need to load documents for unsaved instance
    if (!isNew) {
      this.viewModel.attr('isSnapshot', isSnapshot);
      this.viewModel.setDocuments();
    }
  },
  events: {
    [`{viewModel.instance} ${REFRESH_MAPPING.type}`](instance, event) {
      if (this.viewModel.attr('modelType') === event.destinationType) {
        this.viewModel.refreshRelatedDocuments();
      }
    },
    [`{viewModel.instance} ${DESTINATION_UNMAPPED.type}`](instance, event) {
      let item = event.item;
      let viewModel = this.viewModel;

      if (item.attr('type') === viewModel.attr('modelType')
        && item.attr('kind') === viewModel.attr('kind')) {
        viewModel.loadDocuments();
      }
    },
    '{pubsub} objectDeleted'(pubsub, event) {
      let instance = event.instance;
      if (instance instanceof Evidence ||
        instance instanceof Document) {
        this.viewModel.refreshRelatedDocuments();
      }
    },
  },
});
