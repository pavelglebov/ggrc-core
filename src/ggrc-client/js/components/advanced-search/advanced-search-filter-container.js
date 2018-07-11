/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './advanced-search-filter-attribute';
import './advanced-search-filter-group';
import './advanced-search-filter-operator';
import './advanced-search-filter-state';
import AdvancedSearchContainer from '../view-models/advanced-search-container-vm';
import * as StateUtils from '../../plugins/utils/state-utils';
import * as AdvancedSearch from '../../plugins/utils/advanced-search-utils';
import template from './advanced-search-filter-container.mustache';

/**
 * Filter Container view model.
 * Contains logic used in Filter Container component
 * @constructor
 */
let viewModel = AdvancedSearchContainer.extend({
  define: {
    /**
     * Contains Filter Attributes, Groups and Operators.
     * Initializes Items with State Attribute by default.
     * @type {can.List}
     */
    items: {
      type: '*',
      Value: can.List,
      get: function (items) {
        if (this.attr('defaultStatusFilter') && items && !items.length &&
          StateUtils.hasFilter(this.attr('modelName'))) {
          items.push(AdvancedSearch.create.state());
        }
        return items;
      },
    },
    /**
     * Indicates whether status filter should be added by default.
     * @type {boolean}
     */
    defaultStatusFilter: {
      type: 'boolean',
      value: true,
    },
    /**
     * Indicates whether 'Add' button should be displayed.
     */
    showAddButton: {
      type: 'boolean',
      value: true,
    },
  },
  /**
   * Contains specific model name.
   * @type {string}
   * @example
   * Requirement
   * Regulation
   */
  modelName: null,
  /**
   * Contains available attributes for specific model.
   * @type {can.List}
   */
  availableAttributes: can.List(),
  /**
   * Adds Filter Operator and Filter Attribute to the collection.
   */
  addFilterCriterion: function () {
    let items = this.attr('items');
    if (items.length) {
      items.push(AdvancedSearch.create.operator('AND'));
    }
    items.push(AdvancedSearch.create.attribute());
  },
  /**
   * Transforms Filter Attribute to Filter Group.
   * @param {can.Map} attribute - Filter Attribute.
   */
  createGroup: function (attribute) {
    let items = this.attr('items');
    let index = items.indexOf(attribute);
    items.attr(index, AdvancedSearch.create.group([
      attribute,
      AdvancedSearch.create.operator('AND'),
      AdvancedSearch.create.attribute(),
    ]));
  },
});

/**
 * Filter Container is a component allowing to compose Filter Attributes, Groups and Operators.
 */
export default can.Component.extend({
  tag: 'advanced-search-filter-container',
  template: template,
  viewModel: viewModel,
});
