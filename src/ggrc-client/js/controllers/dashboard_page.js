/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import RefreshQueue from '../models/refresh_queue';
import '../components/inline/people-with-role-inline-field';
import Search from '../models/service-models/search';

export default can.Component.extend({
  tag: 'dashboard-widgets',
  template: '<content/>',
  leakScope: true,
  scope: {
    initial_wf_size: 5,
    workflow_view: GGRC.mustache_path +
      '/dashboard/info/workflow_progress.mustache',
    workflow_data: {},
    workflow_count: 0,
    workflow_show_all: false,
    loading: true,
  },
  events: {
    // Click action to show all workflows
    'a.workflow-trigger.show-all click'(el, ev) {
      this.scope.workflow_data.attr('list', this.scope.workflow_data.cur_wfs);

      el.text('Show top 5 workflows');
      el.removeClass('show-all');
      el.addClass('show-5');

      ev.stopPropagation();
    },
    // Show onlt top 5 workflows
    'a.workflow-trigger.show-5 click'(el, ev) {
      this.scope.workflow_data.attr('list', this.scope.workflow_data.cur_wfs5);

      el.text('Show all my workflows');
      el.removeClass('show-5');
      el.addClass('show-all');

      ev.stopPropagation();
    },

    // Show Workflows
    'li.workflow-tab click'(el, ev) {
      el.addClass('active');
      this.element.find('.workflow-wrap-main').show();
      ev.stopPropagation();
    },
  },
  init() {
    this.init_my_workflows();
  },
  init_my_workflows() {
    let self = this;
    let workflowData = {};
    let curWfs5; // list of top 5 workflows with current cycle

    if (!GGRC.current_user) {
      return;
    }

    Search
      .search_for_types('', ['Workflow'], {
        contact_id: GGRC.current_user.id,
        extra_params: 'Workflow:status=Active',
      })
      .then(function (resultSet) {
        let wfData = resultSet.getResultsForType('Workflow');
        let refreshQueue = new RefreshQueue();
        refreshQueue.enqueue(wfData);
        return refreshQueue.trigger();
      }).then(function (curWfs) {
        if (curWfs.length > 0) {
          self.scope.attr('workflow_count', curWfs.length);
          workflowData.cur_wfs = curWfs;

          if (curWfs.length > self.scope.initial_wf_size) {
            curWfs5 = curWfs.slice(0, self.scope.initial_wf_size);
            self.scope.attr('workflow_show_all', true);
          } else {
            curWfs5 = curWfs;
            self.scope.attr('workflow_show_all', false);
          }
          workflowData.cur_wfs5 = curWfs5;
          workflowData.list = curWfs5;
          self.scope.attr('workflow_data', workflowData);
        }
        self.scope.attr('loading', false);
      });

    return 0;
  },
  /*
    sort_by_end_date sorts workflows in assending order with respect to task_data.first_end_date
    This should be called with workflows with current tasks.
  */
  sort_by_end_date(a, b) {
    return (a.task_data.first_end_dateD.getTime() -
      b.task_data.first_end_dateD.getTime());
  },
});
