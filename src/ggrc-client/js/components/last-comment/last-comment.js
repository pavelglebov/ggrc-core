/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './last-comment.mustache';
import RefreshQueue from '../../models/refresh_queue';
import {peopleWithRoleName} from '../../plugins/utils/acl-utils.js';
import {COMMENT_CREATED} from '../../events/eventTypes';
import {formatDate} from '../../plugins/utils/date-utils';
import Comment from '../../models/service-models/comment';

export default can.Component.extend({
  tag: 'last-comment',
  template: template,
  leakScope: true,
  viewModel: can.Map.extend({
    define: {
      instance: {
        set(instance) {
          const comment = new Comment({
            id: instance.last_comment_id,
            description: instance.last_comment,
          });

          this.attr('comment', comment);
          return instance;
        },
      },
    },
    comment: null,
    author: null,
    getAuthor() {
      const person = peopleWithRoleName(this.attr('comment'), 'Admin')[0];

      this.attr('author', person);
    },
    tooltip() {
      const date = formatDate(this.attr('comment.created_at'), true);
      const authorEmail = this.attr('author.email');

      if (date && authorEmail) {
        return `${date}, ${authorEmail}`;
      }
      return '';
    },
  }),
  events: {
    ['{this} mouseover']() {
      const vm = this.viewModel;

      new RefreshQueue()
        .enqueue(vm.attr('comment'))
        .trigger()
        .done((response) => {
          vm.attr('comment', response[0]);
          if (!vm.attr('author')) {
            vm.getAuthor();
          }
        });
    },
    [`{instance} ${COMMENT_CREATED.type}`](instance, {comment}) {
      this.viewModel.attr('comment', comment);
      this.viewModel.getAuthor();
    },
  },
  helpers: {
    getText(html, options) {
      let resolvedHtml = Mustache.resolve(html) || '';
      const regexTags = /<[^>]*>?/g;
      const regexNewLines = /<\/p>?/g;

      let lines = resolvedHtml
        .replace(regexNewLines, '\n')
        .replace(regexTags, ' ')
        .trim();
      return lines;
    },
  },
});
