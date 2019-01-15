/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../../models/cacheable';
import {BUTTON_VIEW_SAVE_CANCEL} from '../../plugins/utils/modals';
import {navigate} from '../../plugins/utils/current-page-utils';
import Workflow from '../../models/business-models/workflow';

let CloneWorkflow = Cacheable({
  defaults: {
    clone_people: true,
    clone_tasks: true,
    clone_objects: true,
  },
}, {
  refresh() {
    return $.when(this);
  },
  save() {
    let workflow = new Workflow({
      clone: this.source_workflow.id,
      context: null,
      clone_people: this.clone_people,
      clone_tasks: this.clone_tasks,
      clone_objects: this.clone_objects,
    });

    return workflow.save().then((workflow) => {
      navigate(workflow.viewLink);
      return this;
    });
  },
});

export default can.Component.extend({
  tag: 'workflow-clone',
  events: {
    click(el) {
      let $target;

      $target = $('<div class="modal hide"></div>').uniqueId();
      $target.modal_form({}, el);
      import(/* webpackChunkName: "modalsCtrls" */'../../controllers/modals')
        .then(() => {
          $target.ggrc_controllers_modals({
            modal_title: 'Clone Workflow',
            model: CloneWorkflow,
            instance: new CloneWorkflow({source_workflow: this.scope.workflow}),
            content_view: GGRC.mustache_path +
              '/workflows/clone_modal_content.mustache',
            custom_save_button_text: 'Proceed',
            button_view: BUTTON_VIEW_SAVE_CANCEL,
          });
        });
    },
  },
  leakScope: true,
});
