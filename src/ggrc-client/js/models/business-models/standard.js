/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Directive from './directive';
import AccessControlList from '../mixins/access-control-list';
import Reviewable from '../mixins/reviewable';

export default Directive.extend({
  root_object: 'standard',
  root_collection: 'standards',
  model_plural: 'Standards',
  table_plural: 'standards',
  title_plural: 'Standards',
  model_singular: 'Standard',
  title_singular: 'Standard',
  table_singular: 'standard',
  findAll: 'GET /api/standards',
  findOne: 'GET /api/standards/{id}',
  create: 'POST /api/standards',
  update: 'PUT /api/standards/{id}',
  destroy: 'DELETE /api/standards/{id}',
  is_custom_attributable: true,
  isRoleable: true,
  attributes: {},
  mixins: [
    AccessControlList,
    Reviewable,
  ],
  sub_tree_view_options: {
    default_filter: ['Requirement'],
  },
  defaults: {
    status: 'Draft',
    kind: 'Standard',
  },
  statuses: ['Draft', 'Deprecated', 'Active'],
  init: function () {
    Object.assign(this.attributes, Directive.attributes);
    this._super(...arguments);
  },
}, {});
