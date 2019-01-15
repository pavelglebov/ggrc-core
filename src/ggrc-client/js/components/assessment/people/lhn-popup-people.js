/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../../related-objects/related-people-access-control';
import '../../related-objects/related-people-access-control-group';
import '../../people/deletable-people-group';

import template from './templates/lhn-popup-people.mustache';

export default can.Component.extend({
  tag: 'lhn-popup-people',
  template,
  leakScope: true,
  viewModel: {
    define: {
      instance: {
        set: function (value, setValue) {
          if (!value) {
            return;
          }

          value.refresh().then((refreshedInstance) => {
            this.attr('denyUnmap', false);
            setValue(refreshedInstance);
          });
        },
      },
    },
    denyUnmap: true,
    hasConflicts: false,
    conflictRoles: ['Assignees', 'Verifiers'],
    includeRoles: ['Creators', 'Assignees', 'Verifiers'],
    saveRoles: function () {
      this.attr('denyUnmap', true);
      this.attr('instance').save().then(() => {
        this.attr('denyUnmap', false);
      });
    },
  },
});
