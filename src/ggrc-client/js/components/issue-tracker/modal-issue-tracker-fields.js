/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../dropdown/dropdown';
import '../numberbox/numberbox';
import template from './templates/modal-issue-tracker-fields.mustache';
import {showTrackerNotification} from
  './temporary-issue-tracker-notification';

const tag = 'modal-issue-tracker-fields';

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    instance: {},
    note: '',
    linkingNote: '',
    setIssueTitle: false,
    allowToChangeId: false,
  },
  events: {
    '{viewModel.instance.issue_tracker} hotlist_id'() {
      if (this.viewModel.instance.attr('type') === 'Assessment') {
        showTrackerNotification();
      }
    },
  },
});
