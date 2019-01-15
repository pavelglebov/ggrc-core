/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './mapper-results-item-status';
import './mapper-results-item-details';
import './mapper-results-item-attrs';
import '../object-selection/object-selection-item';
import template from './templates/mapper-results-item.mustache';
import Snapshot from '../../models/service-models/snapshot';
import * as businessModels from '../../models/business-models';

export default can.Component.extend({
  tag: 'mapper-results-item',
  template,
  leakScope: true,
  viewModel: {
    itemData: {},
    searchOnly: false,
    drawRelatedAssessments: false,
    selectedColumns: [],
    showDetails: false,
    title() {
      let displayItem = this.displayItem();
      return displayItem.title ||
        displayItem.description_inline ||
        displayItem.name ||
        displayItem.email;
    },
    displayItem() {
      let itemData = this.attr('itemData');
      return itemData.revision ?
        itemData.revision.content :
        itemData;
    },
    objectTypeIcon() {
      let objectType = this.objectType();
      let Model = businessModels[objectType];
      return 'fa-' + Model.table_singular;
    },
    toggleIconCls() {
      return this.attr('showDetails') ? 'fa-caret-down' : 'fa-caret-right';
    },
    toggleDetails() {
      this.attr('showDetails', !this.attr('showDetails'));
    },
    isSnapshot() {
      return this.attr('itemData.type') === Snapshot.model_singular;
    },
    objectType() {
      if (this.isSnapshot()) {
        return this.attr('itemData.child_type');
      }
      return this.attr('itemData.type');
    },
    showRelatedAssessments() {
      this.dispatch({
        type: 'showRelatedAssessments',
        instance: this.displayItem(),
      });
    },
  },
});
