/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../rich_text/rich_text';
import template from './rich-text-form-field.mustache';

export default can.Component.extend({
  tag: 'rich-text-form-field',
  template,
  leakScope: true,
  viewModel: {
    _value: '',
    _oldValue: null,
    placeholder: '',
    editorHasFocus: false,
    define: {
      value: {
        set(newValue) {
          if (!_.isNull(newValue) && this.isAllowToSet(newValue)) {
            this.attr('_oldValue', newValue);
            this.attr('_value', newValue);
          }
        },
        get() {
          return this.attr('_value');
        },
      },
      inputValue: {
        set(newValue) {
          let oldValue = this.attr('_oldValue');
          if (newValue === oldValue ||
              newValue.length && !can.trim(newValue).length) {
            return;
          }

          this.attr('_value', newValue);

          setTimeout(function () {
            this.checkValueChanged();
          }.bind(this), 5000);
        },
        get() {
          return this.attr('_value');
        },
      },
    },
    fieldId: null,
    isAllowToSet() {
      let isFocus = this.attr('editorHasFocus');
      let isEqualValues = this.attr('_value') === this.attr('_oldValue');

      return !isFocus || isEqualValues;
    },
    checkValueChanged: function () {
      let newValue = this.attr('_value');
      let oldValue = this.attr('_oldValue');
      if (newValue !== oldValue) {
        this.attr('_oldValue', newValue);
        this.valueChanged(newValue);
      }
    },
    valueChanged: function (newValue) {
      this.dispatch({
        type: 'valueChanged',
        fieldId: this.fieldId,
        value: newValue,
      });
    },
    onBlur: function () {
      this.checkValueChanged();
    },
  },
  events: {
    '.ql-editor blur': function () {
      this.viewModel.onBlur();
    },
  },
});
