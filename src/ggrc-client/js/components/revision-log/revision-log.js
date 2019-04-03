/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../tree_pagination/tree_pagination';
import './revision-page';

import RefreshQueue from '../../models/refresh_queue';
import template from './revision-log.stache';
import tracker from '../../tracker';
import Revision from '../../models/service-models/revision';
import Stub from '../../models/stub';
import {reify as reifyUtil, isReifiable} from '../../plugins/utils/reify-utils';

import {
  buildParam,
  batchRequests,
} from '../../plugins/utils/query-api-utils';
import QueryParser from '../../generated/ggrc_filter_query_parser';
import Pagination from '../base-objects/pagination';
import {notifier} from '../../plugins/utils/notifiers-utils';

export default can.Component.extend({
  tag: 'revision-log',
  template: can.stache(template),
  leakScope: true,
  /**
   * The component's entry point. Invoked when a new component instance has
   * been created.
   */
  init: function () {
    const viewModel = this.viewModel;

    viewModel.initObjectReview();

    viewModel.fetchItems();
  },
  viewModel: {
    define: {
      showFilter: {
        get() {
          return (this.attr('review.status') === 'Unreviewed') &&
            !!this.attr('review.last_reviewed_by');
        },
      },
      pageInfo: {
        value: function () {
          return new Pagination({
            pageSizeSelect: [10, 25, 50],
            pageSize: 10,
          });
        },
      },
    },
    options: {},
    instance: null,
    review: null,
    isLoading: false,
    revisions: null,
    fetchItems: function () {
      this.attr('isLoading', true);
      this.attr('revisions', null);

      const stopFn = tracker.start(
        this.attr('instance.type'),
        tracker.USER_JOURNEY_KEYS.LOADING,
        tracker.USER_ACTIONS.CHANGE_LOG);

      return this.fetchRevisions()
        .then(this.fetchAdditionalInfoForRevisions.bind(this))
        .then(this.composeRevisionsData.bind(this))
        .done((revisionsData) => {
          this.attr('revisions', revisionsData);
          stopFn();
        })
        .fail(function () {
          stopFn(true);
          notifier('error', 'Failed to fetch revision history data.');
        })
        .always(function () {
          this.attr('isLoading', false);
        }.bind(this));
    },
    fetchRevisions() {
      const filter = this.getQueryFilter();
      const pageInfo = this.attr('pageInfo');
      const page = {
        current: pageInfo.current,
        pageSize: pageInfo.pageSize,
        buffer: 1, // we need additional item to calculate diff for last item on page
        sort: [{
          direction: 'desc',
          key: 'created_at',
        }],
      };
      let params = buildParam(
        'Revision',
        page,
        null,
        null,
        filter
      );

      return batchRequests(params).then((data) => {
        data = data.Revision;
        const total = data.total;
        this.attr('pageInfo.total', total);

        return this.makeRevisionModels(data);
      });
    },
    getQueryFilter() {
      const instance = this.attr('instance');

      if (!this.attr('options.showLastReviewUpdates')) {
        return QueryParser.parse(
          `${instance.type} not_empty_revisions_for ${instance.id} OR
          source_type = ${instance.type} AND
          source_id = ${instance.id} OR
          destination_type = ${instance.type} AND
          destination_id = ${instance.id}`);
      } else {
        const reviewDate = moment(this.attr('review.last_reviewed_at'))
          .format('YYYY-MM-DD HH:mm:ss');

        return QueryParser.parse(
          `${instance.type} not_empty_revisions_for ${instance.id} AND
          created_at >= "${reviewDate}" OR
          source_type = ${instance.type} AND
          source_id = ${instance.id} AND
          created_at >= "${reviewDate}" OR
          destination_type = ${instance.type} AND
          destination_id = ${instance.id} AND
          created_at >= "${reviewDate}"`);
      }
    },
    makeRevisionModels(data) {
      let revisions = data.values;
      revisions = revisions.map(function (source) {
        return Revision.model(source, 'Revision');
      });

      return revisions;
    },
    fetchAdditionalInfoForRevisions(revisions) {
      const refreshQueue = new RefreshQueue();

      _.forEach(revisions, (revision) => {
        this.enqueueRelated(revision, refreshQueue);
        if (revision.content && revision.content.automapping) {
          this.enqueueRelated(revision.content.automapping, refreshQueue);
        }
      });

      return refreshQueue.trigger().then(() => revisions);
    },
    enqueueRelated(object, refreshQueue) {
      if (object.modified_by) {
        refreshQueue.enqueue(object.modified_by);
      }
      if (object.destination_type && object.destination_id) {
        object.destination = new Stub({
          id: object.destination_id,
          type: object.destination_type,
        });
        refreshQueue.enqueue(object.destination);
      }
      if (object.source_type && object.source_id) {
        object.source = new Stub({
          id: object.source_id,
          type: object.source_type,
        });
        refreshQueue.enqueue(object.source);
      }
    },
    composeRevisionsData(revisions) {
      let objRevisions = [];
      let mappings = [];
      let revisionsForCompare = [];

      if (this.attr('pageInfo.pageSize') < revisions.length) {
        revisionsForCompare = revisions.splice(-1);
      }
      _.forEach(revisions, (revision) => {
        if (revision.destination || revision.source) {
          mappings.push(revision);
        } else {
          objRevisions.push(revision);
        }

        if (revision.content && revision.content.automapping) {
          this.reifyObject(revision.content.automapping);
        }
      });

      return {
        object: _.map(objRevisions, this.reifyObject),
        mappings: _.map(mappings, this.reifyObject),
        revisionsForCompare: _.map(revisionsForCompare, this.reifyObject),
      };
    },
    reifyObject(object) {
      _.forEach(['modified_by', 'source', 'destination'],
        function (field) {
          if (object[field] && isReifiable(object[field])) {
            object.attr(field, reifyUtil(object[field]));
          }
        });
      return object;
    },
    changeLastUpdatesFilter(element) {
      const isChecked = element.checked;
      this.attr('options.showLastReviewUpdates', isChecked);

      this.attr('pageInfo.current', 1);
      this.fetchItems();
    },
    initObjectReview() {
      const review = this.attr('instance.review');

      if (review) {
        this.attr('review', reifyUtil(review));
      }
    },
  },
  events: {
    '{viewModel.instance} refreshInstance': function () {
      this.viewModel.fetchItems();
    },
    '{viewModel.pageInfo} current'() {
      this.viewModel.fetchItems();
    },
    '{viewModel.pageInfo} pageSize'() {
      this.viewModel.fetchItems();
    },
    removed() {
      this.viewModel.attr('options.showLastReviewUpdates', false);
    },
  },
});
