/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {getModelInstance} from '../../plugins/utils/models-utils';
const tag = 'sort-by';

export default can.Component.extend({
  tag,
  leakScope: true,
  viewModel: {
    sortedItems: [],
    isSnapshot: false,
    sortByProperty: 'name',
    _debounceInterval: null,
    define: {
      items: {
        value: [],
        set: function () {
          this.sortDebounce();
        },
      },
    },
    getModels(items, propertyName) {
      const promises = items.attr().map((item) =>
        getModelInstance(item.id, item.type, propertyName));

      return Promise.all(promises);
    },
    sort() {
      const items = this.attr('items');
      const propertyName = this.attr('sortByProperty');
      let sortedItems;

      this.attr('sortedItems', []);
      if (!items || !items.length || !propertyName) {
        this.attr('sortedItems', items);
        return;
      }

      if (this.attr('isSnapshot')) {
        sortedItems = _.sortBy(items, propertyName);
        this.attr('sortedItems', sortedItems);
        return;
      }

      this.getModels(items, propertyName).then((data) => {
        sortedItems = _.sortBy(data, propertyName);
        this.attr('sortedItems', sortedItems);
      });
    },
    sortDebounce() {
      let interval;
      if (this.attr('_debounceInterval')) {
        clearInterval(this.attr('_debounceInterval'));
      }
      interval = setTimeout(() => {
        this.sort();
      }, 350);
      this.attr('_debounceInterval', interval);
    },
  },
  events: {
    '{viewModel.items} change'() {
      this.viewModel.sortDebounce();
    },
    inserted() {
      this.viewModel.sort();
    },
  },
});
