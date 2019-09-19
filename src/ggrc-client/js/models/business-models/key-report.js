/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../cacheable';
import UniqueTitle from '../mixins/unique-title';
import CaUpdate from '../mixins/ca-update';
import AccessControlList from '../mixins/access-control-list';
import ScopeObjectNotifications from '../mixins/notifications/scope-object-notifications';
import Questionnaire from '../mixins/questionnaire';
import Stub from '../stub';
import ChangeableExternally from '../mixins/changeable-externally';

export default Cacheable.extend({
  root_object: 'key_report',
  root_collection: 'key_reports',
  category: 'scope',
  findAll: 'GET /api/key_reports',
  findOne: 'GET /api/key_reports/{id}',
  create: 'POST /api/key_reports',
  update: 'PUT /api/key_reports/{id}',
  destroy: 'DELETE /api/key_reports/{id}',
  mixins: [
    UniqueTitle,
    CaUpdate,
    AccessControlList,
    ScopeObjectNotifications,
    Questionnaire,
    ChangeableExternally,
  ],
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {
    context: Stub,
    modified_by: Stub,
  },
  defaults: {
    title: '',
    url: '',
    status: 'Draft',
  },
  tree_view_options: {
    attr_list: Cacheable.attr_list.concat([
      {attr_title: 'Effective Date', attr_name: 'start_date'},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date'},
      {attr_title: 'Reference URL', attr_name: 'reference_url'},
      {
        attr_title: 'Launch Status',
        attr_name: 'status',
        order: 40,
      }, {
        attr_title: 'Description',
        attr_name: 'description',
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
      }, {
        attr_title: 'Assessment Procedure',
        attr_name: 'test_plan',
      }]),
  },
  sub_tree_view_options: {
    default_filter: ['Control'],
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  orderOfRoles: ['Admin', 'Assignee', 'Verifier'],
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
});
