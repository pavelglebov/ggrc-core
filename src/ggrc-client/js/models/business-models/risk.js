/*
 * Copyright (C) 2020 Google Inc.
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../cacheable';
import Proposable from '../mixins/proposable';
import Reviewable from '../mixins/reviewable';
import ChangeableExternally from '../mixins/changeable-externally';
import Stub from '../stub';

export default Cacheable.extend({
  root_object: 'risk',
  root_collection: 'risks',
  category: 'risk',
  findAll: 'GET /api/risks',
  findOne: 'GET /api/risks/{id}',
  create: 'POST /api/risks',
  update: 'PUT /api/risks/{id}',
  destroy: 'DELETE /api/risks/{id}',
  mixins: [
    Proposable,
    Reviewable,
    ChangeableExternally,
  ],
  migrationDate: '06/13/2019',
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {
    context: Stub,
    modified_by: Stub,
  },
  tree_view_options: {
    attr_list: Cacheable.attr_list.concat([
      {attr_title: 'Reference URL', attr_name: 'reference_url', order: 85},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date', order: 110},
      {
        attr_title: 'State',
        attr_name: 'status',
        order: 40,
      }, {
        attr_title: 'Description',
        attr_name: 'description',
        order: 90,
      }, {
        attr_title: 'Risk Type',
        attr_name: 'risk_type',
        disable_sorting: true,
        order: 95,
      }, {
        attr_title: 'Threat Source',
        attr_name: 'threat_source',
        disable_sorting: true,
        order: 96,
      }, {
        attr_title: 'Threat Event',
        attr_name: 'threat_event',
        disable_sorting: true,
        order: 97,
      }, {
        attr_title: 'Vulnerability',
        attr_name: 'vulnerability',
        disable_sorting: true,
        order: 98,
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
        order: 100,
      }, {
        attr_title: 'Assessment Procedure',
        attr_name: 'test_plan',
        order: 105,
      }, {
        attr_title: 'Review Status',
        attr_name: 'external_review_status',
        attr_sort_field: 'review_status_display_name',
        order: 80,
      }, {
        attr_title: 'Created By',
        attr_name: 'created_by',
        attr_sort_field: 'created_by',
      }, {
        attr_title: 'Due Date',
        attr_name: 'due_date',
        attr_sort_field: 'due_date',
      }, {
        attr_title: 'Last Owner Reviewed Date',
        attr_name: 'last_submitted_at',
        attr_sort_field: 'last_submitted_at',
      }, {
        attr_title: 'Last Owner Reviewed By',
        attr_name: 'last_submitted_by',
        attr_sort_field: 'last_submitted_by',
      }, {
        attr_title: 'Last Compliance Reviewed Date',
        attr_name: 'last_verified_at',
        attr_sort_field: 'last_verified_at',
      }, {
        attr_title: 'Last Compliance Reviewed By',
        attr_name: 'last_verified_by',
        attr_sort_field: 'last_verified_by',
      }]),
  },
  sub_tree_view_options: {
    default_filter: ['Control'],
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
}, {});
