/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  generateCycle,
  redirectToCycle,
} from '../../plugins/utils/workflow-utils';
import {
  initCounts,
} from '../../plugins/utils/widgets-utils';
import Permission from '../../permission';
import {countsMap as workflowCountsMap} from '../../apps/workflows';

const viewModel = can.Map.extend({
  instance: {},
  waiting: false,
  async initWorkflow(workflow) {
    await workflow.refresh();
    workflow.attr({
      recurrences: true,
      status: 'Active',
    });
    return workflow.save();
  },
  async updateActiveCycleCounts(workflow) {
    return initCounts([workflowCountsMap.activeCycles],
      workflow.type, workflow.id);
  },
  async repeatOnHandler(workflow) {
    let result = Promise.resolve();
    this.attr('waiting', true);
    try {
      await this.initWorkflow(workflow);
      await Permission.refresh();
      await this.updateActiveCycleCounts(workflow);
      await workflow.refresh_all('task_groups', 'task_group_tasks');
      redirectToCycle();
    } catch (err) {
      result = Promise.reject(err);
    } finally {
      this.attr('waiting', false);
    }

    return result;
  },
  async repeatOffHandler(workflow) {
    this.attr('waiting', true);
    try {
      await generateCycle(workflow);
      await workflow.refresh();
      await workflow.attr('status', 'Active').save();
    } catch (err) {
      return Promise.reject(err);
    } finally {
      this.attr('waiting', false);
    }
  },
  async activateWorkflow() {
    const workflow = this.attr('instance');
    try {
      if (workflow.unit !== null) {
        await this.repeatOnHandler(workflow);
      } else {
        await this.repeatOffHandler(workflow);
      }
    } catch (err) {
      // Do nothing
    }
  },
});

export default can.Component.extend({
  tag: 'workflow-activate',
  leakScope: true,
  viewModel,
});
