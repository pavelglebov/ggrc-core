/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './sortable-column.mustache';

export default can.Component.extend({
  tag: 'sortable-column',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      isSorted: {
        type: 'boolean',
        get: function () {
          return this.attr('sort.field') === this.attr('sortField');
        },
      },
      isSortedAsc: {
        type: 'boolean',
        get: function () {
          return this.attr('sort.direction') === 'asc';
        },
      },
    },
    sort: null,
    sortField: '@',
    applySort: function () {
      if (this.attr('isSorted')) {
        this.toggleSortDirection();
      } else {
        this.attr('sort.field', this.attr('sortField'));
        this.attr('sort.direction', 'asc');
      }

      this.attr('sort').dispatch('changed');
    },
    toggleSortDirection: function () {
      if (this.attr('sort.direction') === 'asc') {
        this.attr('sort.direction', 'desc');
      } else {
        this.attr('sort.direction', 'asc');
      }
    },
  },
  events: {
    '{$content} click': function () {
      this.viewModel.applySort();
    },
  },
});
