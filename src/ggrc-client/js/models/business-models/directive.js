/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

export default can.Model.Cacheable('CMS.Models.Directive', {
  root_object: 'directive',
  root_collection: 'directives',
  category: 'governance',
  // `rootModel` overrides `model.shortName` when determining polymorphic types
  root_model: 'Directive',
  findAll: '/api/directives',
  findOne: '/api/directives/{id}',
  mixins: ['unique_title', 'timeboxed', 'ca_update', 'base-notifications'],
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/directives/tree-item-attr.mustache',
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
      }]),
    add_item_view: GGRC.mustache_path + '/snapshots/tree_add_item.mustache',
  },
  model: function (params) {
    if (this.shortName !== 'Directive') {
      return this._super(params);
    }
    if (!params) {
      return params;
    }
    params = this.object_from_resource(params);
    if (!params.selfLink) {
      if (params.type !== 'Directive') {
        return CMS.Models[params.type].model(params);
      }
    } else {
      if (CMS.Models.Contract.meta_kinds.indexOf(params.kind) > -1) {
        return CMS.Models.Contract.model(params);
      } else if (CMS.Models.Regulation.meta_kinds.indexOf(params.kind) > -1) {
        return CMS.Models.Regulation.model(params);
      } else if (CMS.Models.Policy.meta_kinds.indexOf(params.kind) > -1) {
        return CMS.Models.Policy.model(params);
      } else if (CMS.Models.Standard.meta_kinds.indexOf(params.kind) > -1) {
        return CMS.Models.Standard.model(params);
      }
    }
  },
  attributes: {
    context: 'CMS.Models.Context.stub',
    modified_by: 'CMS.Models.Person.stub',
    object_people: 'CMS.Models.ObjectPerson.stubs',
    people: 'CMS.Models.Person.stubs',
    objectives: 'CMS.Models.Objective.stubs',
    programs: 'CMS.Models.Program.stubs',
    requirements: 'CMS.Models.get_stubs',
    controls: 'CMS.Models.Control.stubs',
  },
  init: function () {
    this.validateNonBlank('title');
    this._super(...arguments);
  },
  meta_kinds: [],
}, {
  init: function () {
    this._super && this._super(...arguments);
  },
  lowercase_kind: function () {
    return this.kind ? this.kind.toLowerCase() : undefined;
  },
});
