/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Cacheable from '../cacheable';
import {getRole} from '../../plugins/utils/acl-utils';
import UniqueTitle from '../mixins/unique-title';
import CaUpdate from '../mixins/ca-update';
import AccessControlList from '../mixins/access-control-list';
import ProgramNotifications from '../mixins/notifications/program-notifications';
import Proposable from '../mixins/proposable';
import MegaObject from '../mixins/mega-object';
import Stub from '../stub';
import Reviewable from '../mixins/reviewable';

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
    UniqueTitle,
    CaUpdate,
    AccessControlList,
    ProgramNotifications,
    Proposable,
    MegaObject,
    Reviewable,
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
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
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
}, {
  define: {
    title: {
      value: '',
      validate: {
        required: true,
        validateUniqueTitle: true,
      },
    },
    _transient_title: {
      value: '',
      validate: {
        validateUniqueTitle: true,
      },
    },
  },
  readOnlyProgramRoles: function () {
    const allowedRoles = ['Superuser', 'Administrator', 'Editor'];
    if (allowedRoles.indexOf(GGRC.current_user.system_wide_role) > -1) {
      return false;
    }
    const programManagerRole = getRole('Program', 'Program Managers').id;

    return !this.access_control_list.serialize().some((acl) =>
      acl.person.id === GGRC.current_user.id &&
      acl.ac_role_id === programManagerRole);
  },
});
