/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import './confirm-edit-action';
import template from './inline-item.mustache';

export default can.Component.extend({
  tag: 'assessment-inline-item',
  template,
  leakScope: true,
  viewModel: {
    instance: {},
    propName: '@',
    value: '',
    type: '@',
    dropdownOptions: [],
    dropdownOptionsGroups: {},
    dropdownClass: '@',
    isGroupedDropdown: false,
    dropdownNoValue: false,
    withReadMore: false,
    isEditIconDenied: false,
    onStateChangeDfd: $.Deferred().resolve(),
    mandatory: false,
    isConfirmationNeeded: true,
  },
});
