/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {hasQuestions} from '../../plugins/utils/ggrcq-utils';

export default can.Model.Cacheable('CMS.Models.Product', {
  root_object: 'product',
  root_collection: 'products',
  category: 'business',
  findAll: 'GET /api/products',
  findOne: 'GET /api/products/{id}',
  create: 'POST /api/products',
  update: 'PUT /api/products/{id}',
  destroy: 'DELETE /api/products/{id}',
  mixins: [
    'unique_title',
    'ca_update',
    'timeboxed',
    'accessControlList',
    'base-notifications',
  ],
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {
    context: 'CMS.Models.Context.stub',
    modified_by: 'CMS.Models.Person.stub',
    object_people: 'CMS.Models.ObjectPerson.stubs',
    people: 'CMS.Models.Person.stubs',
    objectives: 'CMS.Models.Objective.stubs',
    controls: 'CMS.Models.Control.stubs',
    requirements: 'CMS.Models.get_stubs',
    kind: 'CMS.Models.Option.stub',
  },
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/base_objects/tree-item-attr.mustache',
    attr_list: can.Model.Cacheable.attr_list.concat([
      {attr_title: 'Kind/Type', attr_name: 'type', attr_sort_field: 'kind'},
      {attr_title: 'Reference URL', attr_name: 'reference_url'},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date'},
      {
        attr_title: 'Description',
        attr_name: 'description',
        disable_sorting: true,
      }, {
        attr_title: 'Notes',
        attr_name: 'notes',
        disable_sorting: true,
      }, {
        attr_title: 'Assessment Procedure',
        attr_name: 'test_plan',
        disable_sorting: true,
      },
    ]),
    add_item_view:
      GGRC.mustache_path + '/base_objects/tree_add_item.mustache',
  },
  sub_tree_view_options: {
    default_filter: ['System'],
  },
  links_to: {
    System: {},
    Process: {},
    Program: {},
    Product: {},
    Facility: {},
    OrgGroup: {},
    Vendor: {},
    Project: {},
    DataAsset: {},
    AccessGroup: {},
    Market: {},
  },
  defaults: {
    status: 'Draft',
    kind: null,
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    if (this._super) {
      this._super(...arguments);
    }

    if (hasQuestions(this.shortName)) {
      this.tree_view_options.attr_list.push({
        attr_title: 'Questionnaire',
        attr_name: 'questionnaire',
        disable_sorting: true,
      });
    }

    this.validateNonBlank('title');
  },
}, {});
