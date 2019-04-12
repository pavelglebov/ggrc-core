/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/mapper-results-items-header.stache';

export default can.Component.extend({
  tag: 'mapper-results-items-header',
  template: can.stache(template),
  leakScope: true,
  viewModel: {
    columns: [],
    serviceColumns: [],
    sortKey: '',
    sortDirection: 'asc',
    modelType: '',
    aggregatedColumns() {
      return this.attr('columns').concat(this.attr('serviceColumns'));
    },
    isSorted(attr) {
      return attr.attr('attr_sort_field') === this.attr('sortKey');
    },
    isSortedAsc() {
      return this.attr('sortDirection') === 'asc';
    },
    applySort(attr) {
      if (this.isSorted(attr)) {
        this.toggleSortDirection();
        return;
      }
      this.attr('sortKey', attr.attr('attr_sort_field'));
      this.attr('sortDirection', 'asc');
    },
    toggleSortDirection() {
      if (this.attr('sortDirection') === 'asc') {
        this.attr('sortDirection', 'desc');
      } else {
        this.attr('sortDirection', 'asc');
      }
    },
  },
});
