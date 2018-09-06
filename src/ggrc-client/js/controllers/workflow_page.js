/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import TaskGroup from '../models/business-models/task-group';
import {changeHash} from '../router';

(function (CMS, GGRC, can, $) {
  can.Control('GGRC.Controllers.WorkflowPage', {
    defaults: {
    },
  }, {
    //  FIXME: This should trigger expansion of the TreeNode, without using
    //    global event listeners or routes or timeouts, but currently object
    //    creation and tree insertion is disconnected.
    '{CMS.Models.TaskGroup} created': function (model, ev, instance) {
      if (instance instanceof TaskGroup) {
        setTimeout(function () {
          // If the TaskGroup was created as part of a Workflow, we don't want to
          //  do a redirect here
          if (instance._no_redirect) {
            return;
          }
          changeHash({
            infoPaneType: 'task_group',
            infoPaneId: instance.id,
          });
        }, 250);
      }
    },
  });
})(window.CMS, window.GGRC, window.can, window.can.$);
