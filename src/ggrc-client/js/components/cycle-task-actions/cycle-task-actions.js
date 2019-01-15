/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import tracker from '../../tracker';
import '../spinner/spinner';
import {
  getPageType,
} from '../../plugins/utils/current-page-utils';
import template from './cycle-task-actions.mustache';
import {updateStatus} from '../../plugins/utils/workflow-utils';
import Permission from '../../permission';
import {notifier} from '../../plugins/utils/notifiers-utils';

let viewModel = can.Map.extend({
  define: {
    cycle: {
      get: function () {
        return this.attr('instance').cycle;
      },
    },
    workflow: {
      get: function () {
        return this.attr('instance.cycle.workflow');
      },
    },
    cssClasses: {
      type: String,
      get: function () {
        let classes = [];

        if (this.attr('disabled')) {
          classes.push('disabled');
        }

        return classes.join(' ');
      },
    },
    isShowActionButtons: {
      get: function () {
        const pageType = getPageType();
        const instance = this.attr('instance');

        let showButtons = Permission.is_allowed_for('update', instance);

        if (pageType === 'Workflow') {
          return showButtons && this.attr('cycle').reify().attr('is_current');
        }

        return showButtons;
      },
    },
  },
  instance: null,
  disabled: false,
  oldValues: [],
  async changeStatus(ctx, el, ev) {
    let status = el.data('value');
    let instance = this.attr('instance');
    let oldValue = {
      status: instance.attr('status'),
    };

    ev.stopPropagation();
    const result = await this.setStatus(status);
    if (result) {
      this.attr('oldValues').unshift(oldValue);
    }
  },
  async undo(ctx, el, ev) {
    ev.stopPropagation();
    let previousValue = this.attr('oldValues.0');
    const result = await this.setStatus(previousValue.status);
    if (result) {
      this.attr('oldValues').shift();
    }
  },
  async setStatus(status) {
    const instance = this.attr('instance');
    const stopFn = tracker.start(
      instance.type,
      tracker.USER_JOURNEY_KEYS.LOADING,
      tracker.USER_ACTIONS.CYCLE_TASK.CHANGE_STATUS
    );
    this.attr('disabled', true);
    try {
      await updateStatus(instance, status);
      return true;
    } catch (e) {
      notifier(
        'error',
        "Task state wasn't updated due to server error. Please try again."
      );
      return false;
    } finally {
      this.attr('disabled', false);
      stopFn();
    }
  },
});

/**
 *
 */
export default can.Component.extend({
  tag: 'cycle-task-actions',
  template,
  leakScope: true,
  viewModel,
  events: {
    inserted: function () {
    },
  },
});
