/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './templates/cycle-task-group-object-task.mustache';
import '../../object-change-state/object-change-state';
import '../../dropdown/dropdown';
import '../../comment/comment-data-provider';
import '../../comment/comment-add-form';
import '../../comment/mapped-comments';
import {updateStatus} from '../../../plugins/utils/workflow-utils';
import {getPageType} from '../../../plugins/utils/current-page-utils';
import Permission from '../../../permission';

let viewModel = can.Map.extend({
  define: {
    isEditDenied: {
      get() {
        const instance = this.attr('instance');
        return !Permission
          .is_allowed_for('update', instance) ||
          instance.attr('is_in_history');
      },
    },
    showWorkflowLink: {
      get() {
        return getPageType() !== 'Workflow';
      },
    },
    workflowLink: {
      get() {
        return `/workflows/${this.attr('instance.workflow.id')}`;
      },
    },
  },
  instance: {},
  initialState: 'Assigned',
  onStateChange(event) {
    const instance = this.attr('instance');
    const status = event.state;
    updateStatus(instance, status);
  },
});

export default can.Component.extend({
  tag: 'cycle-task-group-object-task',
  template,
  leakScope: true,
  viewModel,
});
