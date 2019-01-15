/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/input-filter.mustache';

const tag = 'input-filter';

export default can.Component.extend({
  template,
  tag,
  leakScope: true,
  viewModel: {
    value: '',
    excludeSymbols: '@',
    placeholder: '@',
    name: '@',
    tabindex: 0,
    autofocus: false,
    exclude(value, symbols) {
      const regex = new RegExp(`[${symbols}]`, 'gi');

      return value.replace(regex, '');
    },
    cleanUpInput(el) {
      const excludeSymbols = this.attr('excludeSymbols');
      const originalValue = el.val();
      const result = this.exclude(originalValue, excludeSymbols);

      el.val(result);
    },
  },
  events: {
    '.input-filter input'(el) {
      this.viewModel.cleanUpInput(el);
    },
  },
});
