/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../object-tasks/object-tasks';
import '../mapped-counter/mapped-counter';
import Directive from '../../models/business-models/directive';
import Requirement from '../../models/business-models/requirement';
import CycleTaskGroupObjectTask from '../../models/business-models/cycle-task-group-object-task';
import CycleTaskGroup from '../../models/business-models/cycle-task-group';
import Cycle from '../../models/business-models/cycle';
import {formatDate} from '../../plugins/utils/date-utils';
import template from './templates/tree-item-extra-info.mustache';

let viewModel = can.Map.extend({
  define: {
    isActive: {
      type: 'boolean',
      get: function () {
        return this.attr('drawStatuses') ||
          this.attr('isDirective') ||
          this.attr('isCycleTasks') ||
          this.attr('isRequirement');
      },
    },
    isDirective: {
      type: 'boolean',
      get: function () {
        return this.attr('instance') instanceof Directive;
      },
    },
    isRequirement: {
      type: 'boolean',
      get: function () {
        return this.attr('instance') instanceof Requirement;
      },
    },
    isCycleTaskGroupObjectTask: {
      type: 'boolean',
      get: function () {
        return this.attr('instance') instanceof CycleTaskGroupObjectTask;
      },
    },
    isCycleTaskGroup: {
      type: 'boolean',
      get: function () {
        return this.attr('instance') instanceof CycleTaskGroup;
      },
    },
    isCycleTasks: {
      type: 'boolean',
      get: function () {
        return this.attr('isCycleTaskGroup') ||
          this.attr('isCycleTaskGroupObjectTask') ||
          this.attr('instance') instanceof Cycle;
      },
    },
    isLoading: {
      type: 'boolean',
      value: false,
    },
    readyStatus: {
      type: 'boolean',
      value: false,
    },
    raisePopover: {
      type: 'boolean',
      value: false,
      get: function () {
        return this.attr('hovered') || this.attr('readyStatus');
      },
    },
    disablePopover: {
      type: 'boolean',
      get: function () {
        return this.attr('instance') instanceof Cycle;
      },
    },
    drawStatuses: {
      type: 'boolean',
      get: function () {
        return !!this.attr('instance.workflow_state');
      },
    },
    isShowOverdue: {
      type: 'boolean',
      get: function () {
        return this.attr('isCycleTaskGroup') ||
          this.attr('isCycleTaskGroupObjectTask');
      },
    },
    isOverdue: {
      type: 'boolean',
      get: function () {
        let isWorkflowOverdue =
          this.attr('drawStatuses') &&
          this.attr('instance.workflow_state') === 'Overdue';

        let isCycleTasksOverdue =
          this.attr('isCycleTasks') &&
          this.attr('instance.isOverdue');

        return isWorkflowOverdue || isCycleTasksOverdue;
      },
    },
    endDate: {
      type: String,
      get() {
        let date = this.attr('instance.end_date');
        let today = moment().startOf('day');
        let startOfDate = moment(date).startOf('day');
        if (!date || today.diff(startOfDate, 'days') === 0) {
          return 'Today';
        }
        return formatDate(date, true);
      },
    },
    cssClasses: {
      type: 'string',
      get: function () {
        let classes = [];

        if (this.attr('isOverdue')) {
          classes.push('state-overdue');
        }

        if (this.attr('spin')) {
          classes.push('fa-spinner');
          classes.push('fa-spin');
        } else if (this.attr('active')) {
          classes.push('active');
          classes.push('fa-info-circle');
        } else {
          classes.push('fa-info-circle');
        }

        return classes.join(' ');
      },
    },
  },
  onEnter: function () {
    this.processPendingContent();
    this.attr('active', true);
    if (!this.attr('triggered')) {
      this.attr('triggered', true);
    }
  },
  onLeave: function () {
    this.attr('active', false);
  },
  processPendingContent() {
    const extractedPendingContent = this.attr('pendingContent').splice(0);
    const resolvedContent = extractedPendingContent.map((pending) => pending());

    this.addContent(...resolvedContent);
  },
  addDeferredContent({deferredCallback}) {
    this.attr('pendingContent').push(deferredCallback);
  },
  addContent(...dataPromises) {
    let dfds = this.attr('contentPromises');
    let dfdReady = this.attr('dfdReady');

    this.attr('spin', true);
    dfds.push(...dataPromises);

    dfdReady = $.when(...dfds).then(() => {
      this.attr('spin', false);
    });

    this.attr('dfdReady', dfdReady);
  },
  pendingContent: [],
  contentPromises: [],
  dfdReady: $.Deferred(),
  classes: [],
  instance: null,
});

export default can.Component.extend({
  tag: 'tree-item-extra-info',
  template,
  leakScope: true,
  viewModel,
});
