/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import './issue-unmap-item';
import template from './issue-unmap.mustache';

export default can.Component.extend({
  tag: 'issue-unmap',
  template,
  leakScope: true,
  viewModel: {
    issueInstance: {},
    target: {},
  },
});
