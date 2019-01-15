/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../form/field-views/checkbox-form-field-view';
import '../form/field-views/date-form-field-view';
import '../form/field-views/person-form-field-view';
import '../form/field-views/rich-text-form-field-view';
import '../form/field-views/text-form-field-view';
import template from './custom-attributes-field-view.mustache';

export default can.Component.extend({
  tag: 'custom-attributes-field-view',
  template,
  leakScope: true,
  viewModel: {
    type: null,
    value: null,
  },
});
