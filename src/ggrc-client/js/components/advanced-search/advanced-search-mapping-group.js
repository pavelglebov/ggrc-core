/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import AdvancedSearchContainer from '../view-models/advanced-search-container-vm';
import * as AdvancedSearch from '../../plugins/utils/advanced-search-utils';
import template from './advanced-search-mapping-group.mustache';

/**
 * Mapping Group view model.
 * Contains logic used in Mapping Group component.
 * @constructor
 */
let viewModel = AdvancedSearchContainer.extend({
  /**
   * Contains specific model name.
   * @type {string}
   * @example
   * Requirement
   * Regulation
   */
  modelName: null,
  /**
   * Indicates that Group is created on the root level.
   * @type {boolean}
   */
  root: false,
  /**
   * Adds Filter Operator and Mapping Criteria to the collection.
   */
  addMappingCriteria: function () {
    let items = this.attr('items');
    items.push(AdvancedSearch.create.operator('AND'));
    items.push(AdvancedSearch.create.mappingCriteria());
  },
});

/**
 * Mapping Group is a component allowing to compose Mapping Criteria and Operators.
 */
export default can.Component.extend({
  tag: 'advanced-search-mapping-group',
  template: template,
  viewModel: viewModel,
});
