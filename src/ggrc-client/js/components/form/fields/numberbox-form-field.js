/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../numberbox/numberbox';
import template from './templates/numberbox-form-field.mustache';
import {TEXT_FORM_FIELD_VM} from './text-form-field';

const tag = 'numberbox-form-field';

export default can.Component.extend({
  template,
  tag,
  leakScope: true,
  viewModel: TEXT_FORM_FIELD_VM,
  events: {
    inserted() {
      this.viewModel.attr('textField', this.element.find('.text-field'));
    },
  },
});
