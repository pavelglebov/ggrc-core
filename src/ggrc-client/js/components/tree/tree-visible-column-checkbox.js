/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/tree-visible-column-checkbox.mustache';
const tag = 'tree-visible-column-checkbox';

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    column: {},
    onChange(attr) {
      attr.attr('selected', !attr.attr('selected'));
    },
  },
});
