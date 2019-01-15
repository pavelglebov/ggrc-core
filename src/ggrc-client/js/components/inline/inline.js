/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import './readonly-inline-content';
import '../form/fields/checkbox-form-field';
import '../form/fields/date-form-field';
import '../form/fields/dropdown-form-field';
import '../form/fields/person-form-field';
import '../form/fields/rich-text-form-field';
import '../form/fields/text-form-field';
import '../form/fields/numberbox-form-field';
import {isInnerClick, getPlainText} from '../../plugins/ggrc_utils';
import template from './inline.mustache';

export default can.Component.extend({
  tag: 'inline-edit-control',
  template,
  leakScope: true,
  viewModel: {
    define: {
      isValid: {
        get() {
          if (this.attr('mandatory')) {
            let value = this.attr('context.value');

            if (this.attr('type') === 'text') {
              value = getPlainText(value).trim();
            }

            return !!value;
          }
          return true;
        },
      },
      isShowContent: {
        get: function () {
          return this.attr('hideContentInEditMode') ?
            this.attr('editMode') :
            true;
        },
      },
    },
    instance: {},
    editMode: false,
    withReadMore: false,
    isLoading: false,
    type: '@',
    value: '@',
    placeholder: '@',
    propName: '@',
    dropdownOptions: [],
    dropdownNoValue: false,
    dropdownOptionsGroups: {},
    isGroupedDropdown: false,
    isLastOpenInline: false,
    isEditIconDenied: false,
    hideContentInEditMode: false,
    mandatory: false,
    context: {
      value: null,
    },
    setEditModeInline: function (args) {
      this.attr('isLastOpenInline', args.isLastOpenInline);
      this.attr('editMode', true);
    },
    setPerson: function (scope, el, ev) {
      this.attr('context.value', ev.selectedItem.serialize().id);
    },
    unsetPerson: function (scope, el, ev) {
      ev.preventDefault();
      this.attr('context.value', null);
    },
    save: function () {
      let oldValue = this.attr('value');
      let value = this.attr('context.value');

      if (!this.attr('isValid')) {
        return;
      }

      this.attr('editMode', false);

      if (typeof value === 'string') {
        value = value.trim();
      }

      if (oldValue === value) {
        return;
      }

      this.attr('value', value);

      this.dispatch({
        type: 'inlineSave',
        value: value,
        propName: this.attr('propName'),
      });
    },
    cancel: function () {
      let value = this.attr('value');
      this.attr('editMode', false);
      this.attr('context.value', value);
    },
    updateContext: function () {
      let value = this.attr('value');
      this.attr('context.value', value);
    },
    fieldValueChanged: function (args) {
      this.attr('context.value', args.value);
    },
  },
  events: {
    init: function () {
      this.viewModel.updateContext();
    },
    '{viewModel} value': function () {
      // update value in the readonly mode
      if (!this.viewModel.attr('editMode')) {
        this.viewModel.updateContext();
      }
    },
    '{window} mousedown': function (el, ev) {
      let viewModel = this.viewModel;
      let isInside;
      let editMode;

      // prevent closing of current inline after opening...
      if (viewModel.attr('isLastOpenInline')) {
        viewModel.attr('isLastOpenInline', false);
        return;
      }

      isInside = isInnerClick(this.element, ev.target);
      editMode = viewModel.attr('editMode');

      if (editMode && !isInside) {
        viewModel.cancel();
      }
    },
  },
});
