/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  uploadFiles,
} from '../../plugins/utils/gdrive-picker-utils';
import {
  confirm,
} from '../../plugins/utils/modals';
import {
  BEFORE_DOCUMENT_CREATE,
  DOCUMENT_CREATE_FAILED,
  MAP_OBJECTS,
} from '../../events/eventTypes';
import Permission from '../../permission';
import template from './create-document-button.mustache';
import Document from '../../models/business-models/document';
import Context from '../../models/service-models/context';

const viewModel = can.Map.extend({
  parentInstance: null,
  mapDocuments(files) {
    return this.checkDocumentsExist(files)
      .then((statuses) => {
        let newFiles = [];
        let existingDocuments = [];
        statuses.forEach((status) => {
          if (status.exists) {
            existingDocuments.push(status);
          } else {
            let file = files.find((file) => file.id === status.gdrive_id);
            newFiles.push(file);
          }
        });

        return $.when(
          this.useExistingDocuments(existingDocuments),
          this.createDocuments(newFiles)
        ).then((existingDocs, newDocs) => {
          return [...can.makeArray(existingDocs), ...can.makeArray(newDocs)];
        });
      })
      .then((documents) => this.refreshPermissionsAndMap(documents));
  },
  checkDocumentsExist(files) {
    return $.post('/api/document/documents_exist', {
      gdrive_ids: files.map((file) => file.id),
    });
  },
  /*
   * Adds current user to admins for existing document
   */
  makeAdmin(documents) {
    return $.post('/api/document/make_admin', {
      gdrive_ids: documents.map((document) => document.gdrive_id),
    });
  },
  useExistingDocuments(documents) {
    let dfd = $.Deferred();

    if (!documents.length) {
      return dfd.resolve([]);
    }

    this.showConfirm(documents)
      .then(
        () => this.makeAdmin(documents),
        () => dfd.resolve([]))
      .then(() => {
        let docs = documents.map((doc) => new Document(doc.object));
        dfd.resolve(docs);
      });

    return dfd;
  },
  createDocuments(files) {
    if (!files.length) {
      return $.Deferred().resolve([]);
    }

    this.attr('parentInstance').dispatch(BEFORE_DOCUMENT_CREATE);

    let dfdDocs = files.map((file) => {
      let instance = new Document({
        title: file.title,
        source_gdrive_id: file.id,
        context: new Context({id: null}),
      });

      return instance.save();
    });

    return $.when(...dfdDocs)
      .fail(() => {
        this.attr('parentInstance').dispatch(DOCUMENT_CREATE_FAILED);
      });
  },
  refreshPermissionsAndMap(documents) {
    if (!documents.length) {
      // handler in object-mapper will close mapper permanently
      // if it still exists and removes html from the dom
      if (this.attr('element')) {
        this.attr('element').trigger('modal:dismiss');
      }

      return $.Deferred().resolve();
    }

    return Permission.refresh()
      .then(function () {
        this.attr('parentInstance')
          .dispatch({
            ...MAP_OBJECTS,
            objects: documents,
          });
      }.bind(this));
  },
  showConfirm(documents) {
    let confirmation = $.Deferred();
    let parentInstance = this.attr('parentInstance');
    let docsCount = documents.length;
    confirm({
      modal_title: 'Warning',
      modal_description: `${docsCount}
        ${docsCount > 1 ? 'files are' : 'file is'}
        already mapped to GGRC. </br></br>
        Please proceed to map existing docs to
        "${parentInstance.type} ${parentInstance.title}"`,
      button_view:
        `${GGRC.mustache_path}/modals/confirm_cancel_buttons.mustache`,
      modal_confirm: 'Proceed',
    }, confirmation.resolve, confirmation.reject);

    return confirmation;
  },
});

export default can.Component.extend({
  tag: 'create-document-button',
  template,
  leakScope: true,
  viewModel,
  events: {
    inserted() {
      this.viewModel.attr('element', this.element);
    },
    '.pick-file click'() {
      uploadFiles()
        .then((files) => {
          this.viewModel.mapDocuments(files);
        }, () => {
          // event handler in object-mapper will open mapper again
          $(window).trigger('modal:dismiss');
        });
    },
  },
});
