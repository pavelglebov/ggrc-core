
/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {getPageInstance} from '../../plugins/utils/current-page-utils';

export default can.Component.extend({
  tag: 'workflow-deactivate',
  events: {
    click: function () {
      let workflow = getPageInstance();
      workflow.refresh().then(function (workflow) {
        workflow.attr('recurrences', false).save();
      });
    },
  },
  leakScope: true,
});
