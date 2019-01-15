/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './revision-log-data.mustache';

let viewModel = can.Map.extend({
  data: null,
  isLoading: false,
  define: {
    isObject: {
      type: 'boolean',
      get: function () {
        return _.isObject(this.attr('data'));
      },
    },
  },
});

export default can.Component.extend({
  tag: 'revision-log-data',
  template: template,
  leakScope: true,
  viewModel: viewModel,
});
