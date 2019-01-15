/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/text-form-field.mustache';

const TEXT_FORM_FIELD_VM = {
  define: {
    inputValue: {
      set(newValue) {
        let _value = this.attr('_value');
        if (_value === newValue ||
          newValue.length && !can.trim(newValue).length) {
          return;
        }

        this.attr('_value', newValue);
        this.valueChanged(newValue);
      },
      get() {
        return this.attr('_value');
      },
    },
    value: {
      set(newValue) {
        if (!this.isAllowToSet()) {
          return;
        }

        this.attr('_value', newValue);
      },
      get() {
        return this.attr('_value');
      },
    },
  },
  fieldId: null,
  placeholder: '',
  _value: '',
  textField: null,
  isAllowToSet() {
    let textField = this.attr('textField');

    if (!textField) {
      return true;
    }

    let isFocus = textField.is(':focus');
    let isEqualValues = textField.val() === this.attr('_value');

    return !isFocus || isEqualValues;
  },
  valueChanged(newValue) {
    this.dispatch({
      type: 'valueChanged',
      fieldId: this.fieldId,
      value: newValue,
    });
  },
};

export default can.Component.extend({
  template,
  tag: 'text-form-field',
  leakScope: true,
  viewModel: TEXT_FORM_FIELD_VM,
  events: {
    inserted() {
      this.viewModel.attr('textField', this.element.find('.text-field'));
    },
  },
});

export {TEXT_FORM_FIELD_VM};
