/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import baseAutocompleteResults from './../custom-autocomplete/autocomplete-results';
import template from './templates/label-autocomplete-results.mustache';

export default can.Component.extend({
  tag: 'label-autocomplete-results',
  template: template,
  leakScope: true,
  viewModel: baseAutocompleteResults.extend({
    currentValue: '',
    showResults: false,
    showNewValue: false,
  }),
});
