/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './custom-attributes-actions.mustache';

export default can.Component.extend({
  tag: 'custom-attributes-actions',
  template,
  leakScope: true,
  viewModel: {
    instance: null,
    formEditMode: false,
    edit: function () {
      this.attr('formEditMode', true);
    },
  },
});
