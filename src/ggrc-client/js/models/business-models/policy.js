/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Directive from './directive';
import AccessControlList from '../mixins/access-control-list';
import Reviewable from '../mixins/reviewable';

export default Directive.extend({
  root_object: 'policy',
  root_collection: 'policies',
  model_plural: 'Policies',
  table_plural: 'policies',
  title_plural: 'Policies',
  model_singular: 'Policy',
  title_singular: 'Policy',
  table_singular: 'policy',
  findAll: 'GET /api/policies',
  findOne: 'GET /api/policies/{id}',
  create: 'POST /api/policies',
  update: 'PUT /api/policies/{id}',
  destroy: 'DELETE /api/policies/{id}',
  tree_view_options: {},
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {},
  mixins: [
    AccessControlList,
    Reviewable,
  ],
  sub_tree_view_options: {
    default_filter: ['DataAsset'],
  },
  defaults: {
    status: 'Draft',
    kind: null,
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    Object.assign(this.attributes, Directive.attributes);
    Object.assign(this.tree_view_options, Directive.tree_view_options);
    this.tree_view_options.attr_list.push({
      attr_title: 'Kind/Type',
      attr_name: 'kind',
      attr_sort_field: 'kind',
      order: 86,
    });
    this._super(...arguments);
  },
}, {});
