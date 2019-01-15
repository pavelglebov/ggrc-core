/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import './clipboard-link';

export default can.Component.extend({
  tag: 'permalink',
  leakScope: true,
  viewModel: {
    instance: null,
    define: {
      text: {
        type: String,
        get() {
          let instance = this.attr('instance');
          let host = window.location.origin;

          if (['Cycle', 'CycleTaskGroupObjectTask'].includes(instance.type)) {
            let wf = instance.attr('workflow.id');
            return wf ? `${host}/workflows/${wf}#!current` : '';
          } else {
            return instance.viewLink ? `${host}${instance.viewLink}` : '';
          }
        },
      },
    },
  },
  template:
    `<clipboard-link {text}="text">
       <i class="fa fa-link"></i>
       Get permalink
     </clipboard-link>`,
});
