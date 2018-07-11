/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

export default can.Model.Cacheable('CMS.Models.OrgGroup', {
  root_object: 'org_group',
  root_collection: 'org_groups',
  category: 'business',
  findAll: 'GET /api/org_groups',
  findOne: 'GET /api/org_groups/{id}',
  create: 'POST /api/org_groups',
  update: 'PUT /api/org_groups/{id}',
  destroy: 'DELETE /api/org_groups/{id}',
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
  },
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/base_objects/tree-item-attr.mustache',
    add_item_view:
    GGRC.mustache_path + '/base_objects/tree_add_item.mustache',
    attr_list: can.Model.Cacheable.attr_list.concat([
      {attr_title: 'Reference URL', attr_name: 'reference_url'},
      {attr_title: 'Effective Date', attr_name: 'start_date'},
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
  },
  sub_tree_view_options: {
    default_filter: ['Program'],
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
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    if (this._super) {
      this._super(...arguments);
    }

    this.validateNonBlank('title');
  },
}, {});
