/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

export default can.Model.Cacheable('CMS.Models.Objective', {
  root_object: 'objective',
  root_collection: 'objectives',
  category: 'objectives',
  title_singular: 'Objective',
  title_plural: 'Objectives',
  findAll: 'GET /api/objectives',
  findOne: 'GET /api/objectives/{id}',
  create: 'POST /api/objectives',
  update: 'PUT /api/objectives/{id}',
  destroy: 'DELETE /api/objectives/{id}',
  mixins: [
    'unique_title',
    'ca_update',
    'accessControlList',
    'base-notifications',
    'relatedAssessmentsLoader',
  ],
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {
    context: 'CMS.Models.Context.stub',
    modified_by: 'CMS.Models.Person.stub',
    requirements: 'CMS.Models.get_stubs',
    controls: 'CMS.Models.Control.stubs',
    object_people: 'CMS.Models.ObjectPerson.stubs',
    objective_objects: 'CMS.Models.ObjectObjective.stubs',
  },
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/objectives/tree-item-attr.mustache',
    attr_list: can.Model.Cacheable.attr_list.concat([
      {
        attr_title: 'Last Assessment Date',
        attr_name: 'last_assessment_date',
        order: 45, // between State and Primary Contact
      },
      {attr_title: 'Effective Date', attr_name: 'start_date'},
      {attr_title: 'Last Deprecated Date', attr_name: 'last_deprecated_date'},
      {attr_title: 'Reference URL', attr_name: 'reference_url'},
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
    display_attr_names: ['title', 'status', 'last_assessment_date',
      'updated_at'],
    add_item_view: GGRC.mustache_path + '/snapshots/tree_add_item.mustache',
    create_link: true,
    show_related_assessments: true,
    // draw_children: true,
    start_expanded: false,
  },
  sub_tree_view_options: {
    default_filter: ['Control'],
  },
  defaults: {
    status: 'Draft',
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    this.validateNonBlank('title');
    this._super(...arguments);
  },
}, {});
