/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../../info-pin-buttons/info-pin-buttons';
import '../taskgroup_clone';
import '../task-list/task-list';
import '../task-group-objects/task-group-objects';
import template from './templates/task-group.mustache';
import Permission from '../../../permission';

const viewModel = can.Map.extend({
  define: {
    canEdit: {
      get() {
        return (
          Permission.is_allowed_for('update', this.attr('instance')) &&
          this.attr('workflow.status') !== 'Inactive'
        );
      },
    },
    /**
     * We need to wait for the moment, when tree-widget-container
     * component fully loads the information for the info panel -
     * for actual case, it's important that "instance" will be refreshed.
     * Only after refreshing, objects mapped to "instance" can be rendered.
     * Example of the edge case:
     *  "instance" contains "objects" filed with stubs of mapped objects to
     *  "instance".
     *  When we open info panel for some task group then instance proceeds with
     *  refreshing (instance.refresh()).
     *  If we don't wait for the end of "refresh" operation then
     *  task-group-objects component will render unrefreshed list of mapped
     *  objects to task group.
     *
     *  Before refresh:
     *  instance: { objects: [{id: 1, ...}, {id: 2, ...}] }
     *
     *  instance.refresh(); // need to wait for the end of refreshing
     *
     *  After refresh:
     *  instance: { objects: [{id: 3, ...}, {id: 5, ...}, {id: 9, ...}] }
     *
     *  After refreshing, we can render the list of mapped objects.
     */
    readyToRenderTaskGroupObjects: {
      get(lastSetValue, setAttrValue) {
        this.attr('options.infoPaneLoadDfd')
          .then(() => setAttrValue(true))
          .fail(() => setAttrValue(false));
      },
    },
  },
  instance: null,
  workflow: null,
  options: null,
  async loadWorkflow() {
    const instance = this.attr('instance');
    const workflow = await instance.refresh_all('workflow');
    this.attr('workflow', workflow);
  },
});


const init = function () {
  this.viewModel.loadWorkflow();
};

export default can.Component.extend({
  tag: 'task-group',
  template,
  leakScope: true,
  viewModel,
  init,
});
