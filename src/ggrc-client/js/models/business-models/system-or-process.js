/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

export default can.Model.Cacheable('CMS.Models.SystemOrProcess', {
  root_object: 'system_or_process',
  root_collection: 'systems_or_processes',
  title_plural: 'Systems/Processes',
  category: 'business',
  findAll: 'GET /api/systems_or_processes',
  model: function (params) {
    if (this.shortName !== 'SystemOrProcess') {
      return this._super(params);
    }
    if (!params) {
      return params;
    }
    params = this.object_from_resource(params);
    if (!params.selfLink) {
      if (params.type !== 'SystemOrProcess') {
        return CMS.Models[params.type].model(params);
      }
    } else if (params.is_biz_process) {
      return CMS.Models.Process.model(params);
    } else {
      return CMS.Models.System.model(params);
    }
  },
  mixins: [
    'unique_title',
    'timeboxed',
    'base-notifications',
    'ca_update',
    'accessControlList',
  ],
  attributes: {
    context: 'CMS.Models.Context.stub',
    modified_by: 'CMS.Models.Person.stub',
    object_people: 'CMS.Models.ObjectPerson.stubs',
    people: 'CMS.Models.Person.stubs',
    objectives: 'CMS.Models.Objective.stubs',
    controls: 'CMS.Models.Control.stubs',
    requirements: 'CMS.Models.get_stubs',
    network_zone: 'CMS.Models.Option.stub',
  },
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/base_objects/tree-item-attr.mustache',
    attr_list: can.Model.Cacheable.attr_list.concat([
      {
        attr_title: 'Network Zone',
        attr_name: 'network_zone',
        attr_sort_field: 'network_zone',
      },
      {attr_title: 'Effective Date', attr_name: 'start_date'},
      {attr_title: 'Last Deprecated Date', attr_name: 'end_date'},
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
    add_item_view: GGRC.mustache_path + '/base_objects/tree_add_item.mustache',
    link_buttons: true,
  },
  links_to: {
    System: {},
    Process: {},
    Control: {},
    Product: {},
    Facility: {},
    OrgGroup: {},
    Vendor: {},
    Project: {},
    DataAsset: {},
    AccessGroup: {},
    Program: {},
    Market: {},
    Regulation: {},
    Policy: {},
    Standard: {},
    Contract: {},
    Objective: {},
  },
}, {
  system_or_process: function () {
    let result;
    if (this.attr('is_biz_process')) {
      result = 'process';
    } else {
      result = 'system';
    }
    return result;
  },
  system_or_process_capitalized: function () {
    let str = this.system_or_process();
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
});
