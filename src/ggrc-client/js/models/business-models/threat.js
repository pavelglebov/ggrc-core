/*
 * Copyright (C) 2018 Google Inc.
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

export default can.Model.Cacheable('CMS.Models.Threat', {
  root_object: 'threat',
  root_collection: 'threats',
  category: 'risk',
  findAll: 'GET /api/threats',
  findOne: 'GET /api/threats/{id}',
  create: 'POST /api/threats',
  update: 'PUT /api/threats/{id}',
  destroy: 'DELETE /api/threats/{id}',
  mixins: [
    'unique_title',
    'ca_update',
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
    object_objectives: 'CMS.Models.ObjectObjective.stubs',
    objectives: 'CMS.Models.Objective.stubs',
    object_controls: 'CMS.Models.ObjectControl.stubs',
    controls: 'CMS.Models.Control.stubs',
    object_sections: 'CMS.Models.ObjectSection.stubs',
    requirements: 'CMS.Models.get_stubs',
  },
  tree_view_options: {
    add_item_view: GGRC.mustache_path +
    '/base_objects/tree_add_item.mustache',
    attr_view: GGRC.mustache_path + '/base_objects/tree-item-attr.mustache',
    attr_list: can.Model.Cacheable.attr_list.concat([
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
      }]),
  },
  sub_tree_view_options: {
    default_filter: ['Risk'],
  },
  defaults: {
    status: 'Draft',
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    if (this._super) {
      this._super(...arguments);
    }
    this.validatePresenceOf('title');
  },
}, {});
