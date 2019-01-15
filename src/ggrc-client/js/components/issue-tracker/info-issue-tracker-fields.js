/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/info-issue-tracker-fields.mustache';

const tag = 'info-issue-tracker-fields';

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    instance: {},
    showTitle: false,
    note: '',
    linkingNote: '',
    snowId: false,
  },
});
