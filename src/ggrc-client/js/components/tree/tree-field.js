/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './templates/tree-field.mustache';
import viewModel from '../aggregate-field-vm';

export default can.Component.extend({
  tag: 'tree-field',
  template,
  leakScope: true,
  viewModel,
  events: {
    '{viewModel} source': function () {
      this.viewModel.refreshItems();
    },
  },
});
