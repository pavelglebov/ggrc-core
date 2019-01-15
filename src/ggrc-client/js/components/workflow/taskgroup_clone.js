/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../../models/cacheable';
import {BUTTON_VIEW_SAVE_CANCEL} from '../../plugins/utils/modals';
import {refreshTGRelatedItems} from '../../plugins/utils/workflow-utils';
import TaskGroup from '../../models/business-models/task-group';

let CloneTaskGroup = Cacheable({
  defaults: {
    clone_objects: true,
    clone_tasks: true,
    clone_people: true,
  },
}, {
  refresh() {
    return $.when(this);
  },
  save() {
    const taskGroup = new TaskGroup({
      clone: this.source_task_group.id,
      context: null,
      clone_objects: this.clone_objects,
      clone_tasks: this.clone_tasks,
      clone_people: this.clone_people,
    });

    return taskGroup.save();
  },
});

export default can.Component.extend({
  tag: 'task-group-clone',
  events: {
    click(el) {
      const $target = $('<div class="modal hide"></div>').uniqueId();
      $target.modal_form({}, el);
      import(/* webpackChunkName: "modalsCtrls" */'../../controllers/modals')
        .then(() => {
          const contentView =
            `${GGRC.mustache_path}/task_groups/clone_modal_content.mustache`;
          $target.ggrc_controllers_modals({
            modal_title: 'Clone Task Group',
            model: CloneTaskGroup,
            instance: new CloneTaskGroup({
              source_task_group: this.viewModel.taskGroup,
            }),
            content_view: contentView,
            custom_save_button_text: 'Proceed',
            button_view: BUTTON_VIEW_SAVE_CANCEL,
          }).on('modal:success', (e, clonedTg) => {
            refreshTGRelatedItems(clonedTg);
          });
        });
    },
  },
  leakScope: true,
});
