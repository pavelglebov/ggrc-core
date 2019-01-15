/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../form/fields/dropdown-form-field';
import '../person/person-data';
import template from './readonly-inline-content.mustache';

export default can.Component.extend({
  tag: 'readonly-inline-content',
  template,
  leakScope: true,
  viewModel: {
    withReadMore: false,
    value: '@',
  },
});
