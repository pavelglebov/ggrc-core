/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import template from './templates/autocomplete-dropdown.stache';

export default canComponent.extend({
  tag: 'autocomplete-dropdown',
  view: canStache(template),
  leakScope: true,
  viewModel: canMap.extend({
    options: [],
    filteredOptions: [],
    isOpen: false,
    canOpen: false,
    define: {
      isEmpty: {
        type: 'boolean',
        get() {
          return !this.attr('filteredOptions').length;
        },
      },
    },
    initOptions() {
      this.attr('filteredOptions', this.attr('options'));
    },
    filterOptions(el) {
      let value = el.val().toLowerCase();
      let filteredOptions = this.attr('options').filter((item) => {
        return item.value.toLowerCase().includes(value);
      });
      this.attr('filteredOptions', filteredOptions);
    },
    openDropdown() {
      this.attr('canOpen', true);
    },
    closeDropdown() {
      this.attr('isOpen', false);
      this.attr('canOpen', false);
    },
    changeOpenCloseState() {
      if (!this.attr('isOpen')) {
        if (this.attr('canOpen')) {
          this.initOptions();
          this.attr('canOpen', false);
          this.attr('isOpen', true);
        }
      } else {
        this.closeDropdown();
      }
    },
    onBodyClick(ev) {
      ev.stopPropagation();
    },
    onChange(item) {
      this.attr('value', item.value);
      this.closeDropdown();
    },
  }),
  events: {
    '{window} click'() {
      this.viewModel.changeOpenCloseState();
    },
  },
});
