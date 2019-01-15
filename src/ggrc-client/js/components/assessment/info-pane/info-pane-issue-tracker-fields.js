/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../assessment/info-pane/confirm-edit-action';
import template from './templates/info-pane-issue-tracker-fields.mustache';
import {showTrackerNotification} from
  '../../issue-tracker/temporary-issue-tracker-notification.js';

const tag = 'info-pane-issue-tracker-fields';

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    instance: {},
  },
  events: {
    '{viewModel.instance.issue_tracker} hotlist_id'() {
      if (this.viewModel.instance.attr('type') === 'Assessment') {
        showTrackerNotification();
      }
    },
  },
});
