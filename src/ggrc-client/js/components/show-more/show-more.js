/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './show-more.mustache';

/**
 * A component that limits list of items to acceptable count and shows
 * "Show more(<items count>)" link
 * Usage: <show-more limit="5" {items}="itemsToDisplay"
 *          should-show-all-items="true">
 *          <some-item-component></some-item-component>
 *        </show-more>
 */

export default can.Component.extend({
  tag: 'show-more',
  template,
  leakScope: true,
  viewModel: {
    define: {
      limit: {
        type: 'number',
        value: 5,
      },
      items: {
        value: function () {
          return [];
        },
      },
      shouldShowAllItems: {
        type: 'boolean',
        value: function () {
          let isOverLimit = this.attr('isOverLimit');
          return isOverLimit;
        },
      },
      isOverLimit: {
        get: function () {
          let itemsCount = this.attr('items.length');
          let limit = this.attr('limit');

          return itemsCount > limit;
        },
      },
      visibleItems: {
        get: function () {
          let limit = this.attr('limit');
          let isOverLimit = this.attr('isOverLimit');
          let shouldShowAllItems = this.attr('shouldShowAllItems');
          let items = this.attr('items');

          return (isOverLimit && !shouldShowAllItems) ?
            items.slice(0, limit) :
            items;
        },
      },
      showAllButtonText: {
        get: function () {
          let itemsCount = this.attr('items.length');
          let limit = this.attr('limit');
          let shouldShowAllItems = this.attr('shouldShowAllItems');

          return !shouldShowAllItems ?
            'Show more (' + (itemsCount - limit) + ')' :
            'Show less';
        },
      },
    },
    toggleShowAll: function (event) {
      let newValue;
      event.stopPropagation();
      newValue = !this.attr('shouldShowAllItems');
      this.attr('shouldShowAllItems', newValue);
    },
  },
});
