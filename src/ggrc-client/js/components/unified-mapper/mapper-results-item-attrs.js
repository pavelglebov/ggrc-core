/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../tree/tree-item-custom-attribute';
import '../tree/tree-field-wrapper';
import '../tree/tree-field';
import '../tree/tree-item-attr';
import template from './templates/mapper-results-item-attrs.stache';

export default can.Component.extend({
  tag: 'mapper-results-item-attrs',
  template: can.stache(template),
  leakScope: true,
  viewModel: {
    instance: null,
    columns: [],
    serviceColumns: [],
    modelType: '',
    aggregatedColumns() {
      return this.attr('columns').concat(this.attr('serviceColumns'));
    },
  },
  events: {
    click(element, event) {
      if ($(event.target).is('.link')) {
        event.stopPropagation();
      }
    },
  },
});
