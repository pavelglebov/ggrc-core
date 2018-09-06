/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {confirm} from '../../plugins/utils/modals';
import Permission from '../../permission';
import Cycle from '../../models/business-models/cycle';
import Stub from '../../models/stub';
import {changeHash} from '../../router';

/**
 * A set of properties which describe minimum information
 * about cycle.
 * @typedef {Object} CycleStub
 * @property {number} id - cycle id.
 * @property {string} type - cycle type.
 * @example
 * // stub for cycle
 * const cycleStub = {
 *  id: 123,
 *  type: "Cycle",
 * };
 */

/**
 * Creates cycle instance.
 * @param {Workflow} workflow - a workflow instance.
 * @return {Cycle} - a new cycle based on workflow.
 */
function createCycle(workflow) {
  return new Cycle({
    context: new Stub(workflow.context),
    workflow: new Stub(workflow),
    autogenerate: true,
  });
}

/**
 * Redirects to cycle with certain id.
 * @param {Cycle|CycleStub} cycle - an object containing cycle id.
 * @param {number} id - cycle id.
 */
function redirectToCycle({id}) {
  changeHash({
    widget: 'current',
    infoPaneType: 'cycle',
    infoPaneId: id,
  });
}

function generateCycle(workflow) {
  let dfd = new $.Deferred();
  let cycle;

  confirm({
    modal_title: 'Confirm',
    modal_confirm: 'Proceed',
    skip_refresh: true,
    button_view: GGRC.mustache_path +
      '/workflows/confirm_start_buttons.mustache',
    content_view: GGRC.mustache_path +
      '/workflows/confirm_start.mustache',
    instance: workflow,
  }, (params, option) => {
    let data = {};

    can.each(params, function (item) {
      data[item.name] = item.value;
    });

    cycle = createCycle(workflow);

    cycle.save().then((cycle) => {
      // Cycle created. Workflow started.
      setTimeout(() => {
        dfd.resolve();
        redirectToCycle(cycle);
      }, 250);
    });
  }, function () {
    dfd.reject();
  });
  return dfd;
}

async function updateStatus(instance, status) {
  // we refresh the instance, because without this
  // the server will return us 409 error
  const refreshed = await instance.refresh();
  refreshed.attr('status', status);
  return refreshed.save();
}

function refreshTGRelatedItems(taskGroup) {
  Permission.refresh();
  taskGroup.refresh_all_force('workflow', 'context');
}

export {
  createCycle,
  redirectToCycle,
  generateCycle,
  updateStatus,
  refreshTGRelatedItems,
};
