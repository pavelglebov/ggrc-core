/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../related-objects/related-people-access-control';
import '../related-objects/related-people-access-control-group';
import '../people/editable-people-group';
import template from './templates/custom-roles.mustache';

export default can.Component.extend({
  tag: 'custom-roles',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      isReadonly: {
        get() {
          let instance = this.attr('instance');
          if (!instance) {
            return false;
          }

          let readonly = this.attr('readOnly');
          return instance.class.isProposable || readonly;
        },
      },
    },
    instance: null,
    deferredSave: null,
    updatableGroupId: null,
    includeRoles: [],
    excludeRoles: [],
    conflictRoles: [],
    orderOfRoles: [],
    readOnly: false,
    // When we delete some role this action can delete another acl role on the backend.
    // In this case we get in response less objects then was in request.
    // But canJs is merging array-attributes not replacing.
    // As result it doesn't remove redundant element.
    filterACL() {
      let filteredACL = this.attr('instance.access_control_list')
        .filter((role) => role.id);

      this.attr('instance.access_control_list').replace(filteredACL);
    },
    save(args) {
      let saveDfd;

      if (this.attr('deferredSave')) {
        saveDfd = this.attr('deferredSave').push(() => {
          this.attr('updatableGroupId', args.groupId);
        });
      } else {
        this.attr('updatableGroupId', args.groupId);

        saveDfd = this.attr('instance').save();
      }

      saveDfd.then(() => {
        this.filterACL();
      }).always(() => {
        this.attr('updatableGroupId', null);
      });
    },
  },
});
