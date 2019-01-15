/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './comment-input.mustache';

export default can.Component.extend({
  tag: 'comment-input',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      disabled: {
        type: 'boolean',
        value: false,
      },
      placeholder: {
        type: 'string',
        value: '',
      },
      isEmpty: {
        type: 'boolean',
        value: true,
        get: function () {
          let value = this.attr('value') || '';
          return !value.length;
        },
      },
      clean: {
        type: 'boolean',
        value: true,
        set: function (newValue) {
          if (newValue) {
            this.attr('value', '');
          }
          return newValue;
        },
      },
      value: {
        type: 'string',
        value: '',
        set: function (newValue) {
          return newValue || '';
        },
      },
    },
  },
});
