/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../sort/sort-by';
import template from './templates/tree-view.mustache';

let viewModel = can.Map.extend({
  define: {
    notResult: {
      type: Boolean,
      get: function () {
        return !this.attr('loading') && !this.attr('items').length;
      },
    },
  },
  items: [],
  parentInstance: null,
  model: null,
  selectedColumns: [],
  mandatory: [],
  disableConfiguration: null,
  loading: false,
  limitDepthTree: 0,
  depthFilter: '',
});

export default can.Component.extend({
  tag: 'tree-view',
  template,
  leakScope: true,
  viewModel,
});
