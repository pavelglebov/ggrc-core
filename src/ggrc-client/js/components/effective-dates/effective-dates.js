/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../datepicker/datepicker';
import template from './effective-dates.mustache';

export default can.Component.extend({
  tag: 'effective-dates',
  template: template,
  leakScope: true,
  viewModel: {
    instance: null,
    configStartDate: {
      label: 'Effective Date',
      helpText: 'Enter the date this object becomes effective.',
      required: false,
    },
  },
});
