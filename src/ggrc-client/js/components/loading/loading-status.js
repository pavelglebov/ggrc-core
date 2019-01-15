/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './loading-status.mustache';

export default can.Component.extend({
  tag: 'loading-status',
  template,
  leakScope: true,
  viewModel: {
    define: {
      showSpinner: {
        type: 'boolean',
        value: false,
      },
      alwaysShowText: {
        type: 'boolean',
        value: false,
      },
      isLoading: {
        type: 'boolean',
        value: false,
      },
    },
    loadingText: '@',
  },
});
