/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../object-list-item/comment-list-item';
import '../object-list/object-list';
import template from './mapped-comments.mustache';

/**
 * Assessment specific mapped controls view component
 */
export default can.Component.extend({
  tag: 'mapped-comments',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      noItemsText: {
        type: 'string',
        get() {
          if (this.attr('showNoItemsText') && !this.attr('isLoading')) {
            return 'No comments';
          }
          return '';
        },
      },
    },
    isLoading: false,
    mappedItems: [],
    baseInstance: {},
    showNoItemsText: false,
  },
});
