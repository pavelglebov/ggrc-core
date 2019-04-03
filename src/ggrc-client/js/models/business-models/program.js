/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import {getRole} from '../../plugins/utils/acl-utils';
import uniqueTitle from '../mixins/unique-title';
import caUpdate from '../mixins/ca-update';
import timeboxed from '../mixins/timeboxed';
import accessControlList from '../mixins/access-control-list';
import baseNotifications from '../mixins/base-notifications';
import megaObject from '../mixins/mega-object';
import Stub from '../stub';

export default Cacheable.extend({
  root_object: 'program',
  root_collection: 'programs',
  category: 'programs',
  findAll: '/api/programs',
  findOne: '/api/programs/{id}',
  create: 'POST /api/programs',
  update: 'PUT /api/programs/{id}',
  destroy: 'DELETE /api/programs/{id}',
  mixins: [
    uniqueTitle,
    caUpdate,
    timeboxed,
    accessControlList,
    baseNotifications,
    megaObject,
  ],
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {
    context: Stub,
    modified_by: Stub,
    audits: Stub.List,
  },
  programRoles: ['Program Managers', 'Program Editors', 'Program Readers'],
  orderOfRoles: ['Program Managers', 'Program Editors', 'Program Readers'],
  tree_view_options: {
    attr_list: Cacheable.attr_list.concat([
      {attr_title: 'Reference URL', attr_name: 'reference_url'},
      {attr_title: 'Effective Date', attr_name: 'start_date'},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date'},
      {
        attr_title: 'State',
        attr_name: 'status',
        order: 40,
      }, {
        attr_title: 'Description',
        attr_name: 'description',
        disable_sorting: true,
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
        disable_sorting: true,
      }, {
        attr_title: 'Review State',
        attr_name: 'review_status',
        order: 80,
      }]),
    display_attr_names: ['title', 'status', 'updated_at', 'Program Managers'],
  },
  sub_tree_view_options: {
    default_filter: ['Standard'],
  },
  defaults: {
    status: 'Draft',
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    this.validateNonBlank('title');
    this._super(...arguments);
  },
}, {
  readOnlyProgramRoles: function () {
    const allowedRoles = ['Superuser', 'Administrator', 'Editor'];
    if (allowedRoles.indexOf(GGRC.current_user.system_wide_role) > -1) {
      return false;
    }
    const programManagerRole = getRole('Program', 'Program Managers').id;

    return this.access_control_list.filter((acl) => {
      return acl.person_id === GGRC.current_user.id &&
              acl.ac_role_id === programManagerRole;
    }).length === 0;
  },
});
