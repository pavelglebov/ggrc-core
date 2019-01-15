/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './mapping-type-selector.mustache';

export default can.Component.extend({
  tag: 'mapping-type-selector',
  template,
  leakScope: true,
  viewModel: {
    disabled: false,
    readonly: false,
    types: [],
    selectedType: '',
  },
  init: function () {
    let selectedType = this.viewModel.selectedType;
    let types = this.viewModel.types;
    let groups = ['scope', 'entities', 'governance'];
    let values = [];

    groups.forEach(function (name) {
      let groupItems = types.attr(name + '.items');
      values = values.concat(_.map(groupItems, 'value'));
    });
    if (values.indexOf(selectedType) < 0) {
      this.viewModel.attr('selectedType', values[0]);
    }
  },
});
