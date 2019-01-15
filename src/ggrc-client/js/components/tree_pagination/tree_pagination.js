/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './tree_pagination.mustache';

/**
 * A component that renders a tree pagination widget
 * Usage: <tree-pagination paging="paging"></tree-pagination>
 * Optional parameter: placement="top" - to display content above the control
 */
export default can.Component.extend({
  tag: 'tree-pagination',
  template: template,
  init: function () {
    /**
     * Entrance object validation
     *
     * paging = {
     *  current: {Number}, - current page number
     *  pageSize: {Number}, - amount elements on the page
     *  total: {Number}, - total amount of elements
     *  count: {Number}, - total amount of pages
     *  pageSizeSelect: {Array} - array of numbers that used for pageSize popover
     *  disabled: {Boolean} - true if frontend doesn't finish request to the server otherwise false
     * }
     */
    if (!this.viewModel.attr('paging')) {
      throw new Error('Paging object didn\'t init');
    }
  },
  leakScope: true,
  viewModel: {
    placement: '@',
    setCurrentPage: function (pageNumber) {
      this.paging.attr('current', pageNumber);
    },
    setLastPage: function () {
      this.paging.attr('current', this.paging.count);
    },
    setFirstPage: function () {
      this.paging.attr('current', 1);
    },
    setPrevPage: function () {
      if (this.paging.current > 1) {
        this.paging.attr('current', this.paging.current - 1);
      }
    },
    setNextPage: function () {
      if (this.paging.current < this.paging.count) {
        this.paging.attr('current', this.paging.current + 1);
      }
    },
    getPaginationInfo: function () {
      let current = this.attr('paging.current');
      let size = this.attr('paging.pageSize');
      let total = this.attr('paging.total');
      let first = (current - 1) * size + 1;
      let last = current * size < total ? current * size : total;

      return total ? `${first}-${last} of ${total}` :
        'No records';
    },
    setPageSize: function (pageSize) {
      if (parseInt(pageSize)) {
        this.paging.attr('pageSize', pageSize);
      }
    },
    pagesList: function () {
      return _.range(1, this.paging.attr('count') + 1);
    },
    getPageTitle: function (pageNumber) {
      let size = this.attr('paging.pageSize');
      let total = this.attr('paging.total');

      let first = (pageNumber - 1) * size + 1;
      let last = pageNumber * size < total ? pageNumber * size : total;

      return `Page ${pageNumber}: ${first}-${last}`;
    },
  },
});
