/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {generateCycle} from '../../plugins/utils/workflow-utils';
import {getPageInstance} from '../../plugins/utils/current-page-utils';

export default can.Component.extend({
  tag: 'workflow-start-cycle',
  content: '<content/>',
  events: {
    click: function () {
      let workflow = getPageInstance();
      generateCycle(workflow)
        .then(function () {
          return workflow.refresh_all('task_groups', 'task_group_tasks');
        });
    },
  },
  leakScope: true,
});
