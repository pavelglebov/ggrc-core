/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import '../related-objects/related-people-access-control';
import '../related-objects/related-people-access-control-group';
import '../people/deletable-people-group';
import '../custom-attributes/custom-attributes-field-view';
import '../related-objects/related-people-access-control';
import template from './detailed-business-object-list-item.stache';
import {scopingObjects} from '../../plugins/models-types-collections';

const VISIBLE_ROLES = {
  Control: ['Admin', 'Control Operators', 'Control Owners', 'Other Contacts'],
  Risk: ['Admin', 'Risk Owners', 'Other Contacts'],
  scope: ['Admin', 'Compliance Contacts', 'Other Contacts'],
  defaults: ['Admin', 'Primary Contacts', 'Secondary Contacts'],
};

/**
 * Assessment specific mapped objects popover view component
 */
export default canComponent.extend({
  tag: 'detailed-business-object-list-item',
  view: canStache(template),
  leakScope: true,
  viewModel: canMap.extend({
    instance: {},
    customAttributes: null,
    deletableAdmin: false,
    define: {
      isSnapshot: {
        get: function () {
          return this.attr('instance.type') === 'Snapshot';
        },
      },
      itemData: {
        get: function () {
          return this.attr('isSnapshot') ?
            this.attr('instance.revision.content') :
            this.attr('instance');
        },
      },
      objectTitle: {
        get: function () {
          return this.attr('itemData.title') ||
            this.attr('itemData.name') ||
            this.attr('itemData.email') || false;
        },
      },
      visibleRoles: {
        get: function () {
          const objectType = scopingObjects.includes(
            this.attr('itemData.type')
          ) ? 'scope' : this.attr('itemData.type');

          return VISIBLE_ROLES[objectType] || VISIBLE_ROLES['defaults'];
        },
      },
    },
  }),
});
