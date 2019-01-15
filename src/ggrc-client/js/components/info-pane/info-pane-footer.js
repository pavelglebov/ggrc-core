/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './info-pane-footer.mustache';

/**
 * Specific Info Pane Footer Component
 */
export default can.Component.extend({
  tag: 'info-pane-footer',
  template,
  leakScope: true,
  viewModel: {
    createdAt: '',
    modifiedAt: '',
    modifiedBy: {},
  },
});
