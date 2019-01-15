/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../sortable-column/sortable-column';
import './tree-visible-column-checkbox';
import template from './templates/tree-header.mustache';
import {getVisibleColumnsConfig, getSortingForModel}
  from '../../plugins/utils/tree-view-utils';

export default can.Component.extend({
  tag: 'tree-header',
  template,
  leakScope: true,
  viewModel: {
    define: {
      cssClasses: {
        type: String,
        get: function () {
          let classes = [];

          if (this.isActiveActionArea()) {
            classes.push('active-action-area');
          }

          return classes.join(' ');
        },
      },
      selectableSize: {
        type: Number,
        get: function () {
          let attrCount = this.attr('selectedColumns').length;
          let result = 3;

          if (attrCount < 4) {
            result = 1;
          } else if (attrCount < 7) {
            result = 2;
          }
          return result;
        },
      },
    },
    model: null,
    columns: {},
    selectedColumns: [],
    availableColumns: [],
    disableConfiguration: null,
    mandatory: [],
    orderBy: {},
    sortingInfo: null,
    /**
     * Dispatches the event with names of selected columns.
     *
     * @fires updateColumns
     */
    setColumns: function () {
      const selectedNames = this.attr('columns')
        .attr()
        .filter((item) => item.selected)
        .map((item) => item.name);

      this.dispatch({
        type: 'updateColumns',
        columns: selectedNames,
      });
    },
    onOrderChange() {
      const field = this.attr('orderBy.field');
      const sortDirection = this.attr('orderBy.direction');

      this.dispatch({
        type: 'sort',
        field,
        sortDirection,
      });
    },
    initializeColumns: function () {
      let selectedColumns = this.attr('selectedColumns');
      let availableColumns = this.attr('availableColumns');
      let columns;

      if (selectedColumns.length && availableColumns.length) {
        columns = getVisibleColumnsConfig(availableColumns, selectedColumns);

        this.attr('columns', columns);
      }
    },
    isActiveActionArea: function () {
      let modelName = this.attr('model').shortName;

      return modelName === 'CycleTaskGroupObjectTask' || modelName === 'Cycle';
    },
    initializeOrder() {
      let sortingInfo;
      if (!this.attr('model')) {
        return;
      }

      sortingInfo = getSortingForModel(this.attr('model').shortName);
      this.attr('orderBy.field', sortingInfo.key);
      this.attr('orderBy.direction', sortingInfo.direction);
    },
    init: function () {
      this.initializeOrder();
      this.initializeColumns();
    },
  },
  events: {
    '{viewModel} availableColumns': function () {
      this.viewModel.initializeColumns();
    },
    '{viewModel} selectedColumns': function () {
      this.viewModel.initializeColumns();
    },
    '{viewModel.orderBy} changed'() {
      this.viewModel.onOrderChange();
    },
  },
});
