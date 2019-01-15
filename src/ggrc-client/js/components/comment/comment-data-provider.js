/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as QueryAPI from '../../plugins/utils/query-api-utils';
import {
  REFRESH_COMMENTS,
  REFRESH_MAPPED_COUNTER,
} from '../../events/eventTypes';
import Relationship from '../../models/service-models/relationship';
import Context from '../../models/service-models/context';

export default can.Component.extend({
  tag: 'comment-data-provider',
  leakScope: true,
  viewModel: {
    instance: null,
    comments: [],
    isLoading: false,

    loadComments() {
      let query = this.buildQuery();
      let comments = this.getComments(query);
      this.attr('comments').replace(comments);
    },
    buildQuery() {
      let query = QueryAPI.buildParam('Comment', {sort: [{
        key: 'created_at',
        direction: 'desc',
      }]}, {
        type: this.attr('instance.type'),
        id: this.attr('instance.id'),
        operation: 'relevant',
      });
      return query;
    },
    getComments(query) {
      let dfd = $.Deferred();
      this.attr('isLoading', true);
      QueryAPI.batchRequests(query)
        .done((response) => {
          let type = Object.keys(response)[0];
          let values = response[type].values;
          dfd.resolve(values);
        })
        .fail(() => {
          dfd.resolve([]);
        })
        .always(() => {
          this.attr('isLoading', false);
        });
      return dfd.promise();
    },
    addComment(event) {
      let newComment = event.items[0];
      return this.attr('comments').unshift(newComment);
    },
    removeComment(commentToRemove) {
      let comments = this.attr('comments');
      comments.replace(comments.filter((comment) => {
        return comment !== commentToRemove;
      }));
    },
    processComment(event) {
      if (event.success) {
        this.mapToInstance(event.item).then(() => {
          const instance = this.attr('instance');
          instance.dispatch({
            ...REFRESH_MAPPED_COUNTER,
            modelType: 'Comment',
          });
          instance.refresh();
        });
      } else {
        this.removeComment(event.item);
      }
    },
    mapToInstance(comment) {
      return (new Relationship({
        context: this.attr('instance.context') || new Context({id: null}),
        source: this.attr('instance'),
        destination: comment,
      }))
        .save()
        .fail(() => {
          this.removeComment(comment);
        });
    },
  },
  init() {
    this.viewModel.loadComments();
  },
  events: {
    [`{viewModel.instance} ${REFRESH_COMMENTS.type}`]() {
      this.viewModel.loadComments();
    },
  },
});
