/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  buildParam,
  batchRequests,
} from '../../plugins/utils/query-api-utils';
import template from './object-tasks.mustache';
import CycleTaskGroupObjectTask from '../../models/business-models/cycle-task-group-object-task';

const REQUIRED_TYPE = 'CycleTaskGroupObjectTask';
const REQUIRED_FIELDS = Object.freeze([
  'title',
  'status',
  'next_due_date',
  'end_date',
  'is_verification_needed',
]);

let viewModel = can.Map.extend({
  instanceId: null,
  instanceType: null,
  tasks: [],
  loadTasks: function () {
    let id = this.attr('instanceId');
    let type = this.attr('instanceType');
    let params = buildParam(
      REQUIRED_TYPE,
      {},
      {
        type: type,
        id: id,
        operation: 'relevant',
      },
      REQUIRED_FIELDS);

    return batchRequests(params)
      .then(function (response) {
        let tasks = [];

        response[REQUIRED_TYPE].values.forEach(function (item) {
          tasks.push(CycleTaskGroupObjectTask.model(item));
        });

        this.attr('tasks', tasks);
      }.bind(this));
  },
});

export default can.Component.extend({
  tag: 'object-tasks',
  template,
  leakScope: true,
  viewModel,
  events: {
    inserted: function () {
      this.viewModel.addContent(this.viewModel.loadTasks());
    },
  },
});
