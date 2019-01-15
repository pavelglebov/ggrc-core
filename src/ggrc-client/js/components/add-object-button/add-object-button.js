/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './add-object-button.mustache';

export default can.Component.extend({
  tag: 'add-object-button',
  template,
  leakScope: true,
  viewModel: {
    instance: null,
    linkclass: '@',
    content: '@',
    text: '@',
    singular: '@',
    plural: '@',
  },
});
