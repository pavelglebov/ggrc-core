/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './checkbox-form-field.mustache';

export default can.Component.extend({
  tag: 'checkbox-form-field',
  template,
  leakScope: true,
  viewModel: {
    define: {
      inputValue: {
        set(newValue) {
          this.attr('_value', newValue);
          this.valueChanged(newValue);
        },
        get() {
          return this.attr('_value');
        },
      },
      value: {
        set(newValue) {
          this.attr('_value', newValue);
        },
        get() {
          return this.attr('_value');
        },
      },
    },
    _value: false,
    fieldId: null,
    valueChanged: function (newValue) {
      this.dispatch({
        type: 'valueChanged',
        fieldId: this.fieldId,
        value: newValue,
      });
    },
  },
});
