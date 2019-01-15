/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as StateUtils from '../../plugins/utils/state-utils';
import {getAvailableAttributes} from '../../plugins/utils/tree-view-utils';
import * as AdvancedSearch from '../../plugins/utils/advanced-search-utils';

export default can.Component.extend({
  tag: 'advanced-search-wrapper',
  leakScope: true,
  viewModel: can.Map.extend({
    define: {
      hasStatusFilter: {
        get: function () {
          return StateUtils.hasFilter(this.attr('modelName'));
        },
      },
    },
    modelName: null,
    modelDisplayName: null,
    filterItems: [AdvancedSearch.create.attribute()],
    mappingItems: [],
    statusItem: AdvancedSearch.create.state(),
    relevantTo: [],
    availableAttributes: function () {
      return getAvailableAttributes(this.attr('modelName'));
    },
    addFilterAttribute: function () {
      let items = this.attr('filterItems');
      if (items.length) {
        items.push(AdvancedSearch.create.operator('AND'));
      }
      items.push(AdvancedSearch.create.attribute());
    },
    addMappingFilter: function () {
      let items = this.attr('mappingItems');
      if (items.length) {
        items.push(AdvancedSearch.create.operator('AND'));
      }
      items.push(AdvancedSearch.create.mappingCriteria());
    },
    resetFilters: function () {
      this.attr('filterItems', [AdvancedSearch.create.attribute()]);
      this.attr('mappingItems', []);
      this.attr('statusItem.value', {});
    },
  }),
  events: {
    '{viewModel} modelName': function () {
      this.viewModel.resetFilters();
    },
  },
});
