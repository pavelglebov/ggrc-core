/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './reusable-objects-item.mustache';

export default can.Component.extend({
  tag: 'reusable-objects-item',
  template: template,
  leakScope: true,
  viewModel: {
    disabled: false,
    reuseAllowed: true,
    instance: {},
    selectedList: [],
    isChecked: false,
  },
  events: {
    '{viewModel} isChecked'(viewModel, ev, isChecked) {
      let list = viewModel.attr('selectedList');
      let instance = viewModel.attr('instance');
      let index = list.indexOf(instance);

      if (isChecked && index < 0) {
        list.push(instance);
      } else if (!isChecked) {
        if (index >= 0) {
          list.splice(index, 1);
        }
      }
    },
    '{viewModel.selectedList} change'(list) {
      let instance = this.viewModel.attr('instance');
      let index = list.indexOf(instance);

      this.viewModel.attr('isChecked', index >= 0);
    },
  },
});
