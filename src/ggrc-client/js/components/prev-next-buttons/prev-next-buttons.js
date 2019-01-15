/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './prev-next-buttons.mustache';

export default can.Component.extend({
  tag: 'prev-next-buttons',
  template,
  leakScope: true,
  viewModel: {
    define: {
      currentIndex: {
        type: 'number',
      },
      totalCount: {
        type: 'number',
      },
      hasNext: {
        get: function () {
          let current = this.attr('currentIndex');
          let total = this.attr('totalCount');
          return !this.attr('disabled') && (current < total - 1);
        },
      },
      hasPrev: {
        get: function () {
          let current = this.attr('currentIndex');
          return !this.attr('disabled') && current > 0;
        },
      },
    },
    disabled: false,
    setNext: function () {
      let current = this.attr('currentIndex');
      let hasNext = this.attr('hasNext');

      if (hasNext) {
        this.attr('currentIndex', current + 1);
      }
    },
    setPrev: function () {
      let current = this.attr('currentIndex');
      let hasPrev = this.attr('hasPrev');

      if (hasPrev) {
        this.attr('currentIndex', current - 1);
      }
    },
  },
});
