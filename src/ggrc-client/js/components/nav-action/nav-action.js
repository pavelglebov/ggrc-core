/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Permission from '../../permission';
import {peopleWithRoleName} from '../../plugins/utils/acl-utils';

const viewModel = can.Map.extend({
  define: {
    canEdit: {
      get() {
        return Permission.is_allowed_for('update', this.attr('instance'));
      },
    },
    showSetupRequirement: {
      get() {
        const instance = this.attr('instance');
        return (
          this.attr('canEdit') &&
          instance.attr('status') === 'Draft' &&
          !instance.attr('can_start_cycle')
        );
      },
    },
    showMissingObjectsMessage: {
      get() {
        const instance = this.attr('instance');
        const statuses = ['Inactive', 'Draft'];
        return (
          this.attr('canEdit') &&
          !statuses.includes(instance.attr('status')) &&
          !instance.attr('can_start_cycle')
        );
      },
    },
    showAdminRequirement: {
      get() {
        const instance = this.attr('instance');
        const isRecurrentWorkflow = instance.attr('unit') !== null;
        const hasAdmins = peopleWithRoleName(instance, 'Admin').length > 0;
        const isExceptionalCase = this.attr('showMissingObjectsMessage');
        return (
          isRecurrentWorkflow &&
          !hasAdmins &&
          !isExceptionalCase
        );
      },
    },
  },
  instance: null,
});

export default can.Component.extend({
  tag: 'nav-actions',
  leakScope: true,
  viewModel,
});
