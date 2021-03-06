/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import loMap from 'lodash/map';
import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import template from './multiselect-form-field.stache';

export default canComponent.extend({
  tag: 'multiselect-form-field',
  view: canStache(template),
  viewModel: canMap.extend({
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
      options: {
        set(newValue) {
          this.attr('_options', newValue);
        },
        get() {
          const selected = this.attr('_value').split(',');
          return loMap(this.attr('_options'), (item) => {
            return {value: item, checked: selected.includes(item)};
          });
        },
      },
    },
    _value: '',
    _options: [],
    dropdownOptions: [],
    fieldId: null,
    isInlineMode: false,
    valueChanged(newValue) {
      this.dispatch({
        type: 'valueChanged',
        fieldId: this.fieldId,
        value: newValue.selected.map((item) => item.attr('value')).join(','),
      });
    },
  }),
  events: {
    // use dropdownOptions attr to prevent unnecessary
    // update options from parent to child component
    // after changing option checked state
    inserted() {
      const options = this.viewModel.attr('options');
      this.viewModel.attr('dropdownOptions', options);
    },
  },
});
