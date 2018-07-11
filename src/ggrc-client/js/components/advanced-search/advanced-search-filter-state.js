/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../dropdown/multiselect-dropdown';
import * as StateUtils from '../../plugins/utils/state-utils';
import template from './advanced-search-filter-state.mustache';

/**
 * Filter State view model.
 * Contains logic used in Filter State component
 * @constructor
 */
let viewModel = can.Map.extend({
  define: {
    /**
     * Contains criterion's fields: operator, modelName, items.
     * Initializes fitlterStates.
     * @type {can.Map}
     */
    stateModel: {
      type: '*',
      set: function (state) {
        if (!state.attr('items')) {
          let defaultStates =
            StateUtils.getDefaultStatesForModel(this.attr('modelName'));
          state.attr('items', defaultStates);
        }
        if (!state.attr('operator')) {
          state.attr('operator', 'ANY');
        }
        state.attr('modelName', this.attr('modelName'));

        let allStates =
          StateUtils.getStatesForModel(this.attr('modelName'));
        this.attr('filterStates', allStates.map(function (filterState) {
          return {
            value: filterState,
            checked: (state.attr('items').indexOf(filterState) > -1),
          };
        }));

        return state;
      },
    },
    /**
     * Indicates whether status tooltip should be displayed
     * @type {boolean}
     */
    statusTooltipVisible: {
      type: 'boolean',
      value: false,
      get: function () {
        return StateUtils.hasFilterTooltip(this.attr('modelName'));
      },
    },
    /**
     * Indicates whether operator should be displayed.
     * @type {boolean}
     */
    showOperator: {
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
   * Contains available states for specific model.
   * @type {string}
   * @example
   * Active
   * Draft
   */
  filterStates: [],
  /**
   * Saves selected states.
   * @param {Array} selectedStates - selected states.
   */
  saveTreeStates: function (selectedStates) {
    let states;

    // in this case we save previous states
    if (!selectedStates) {
      return;
    }

    states = _.pluck(selectedStates, 'value');

    this.attr('stateModel.items', states);
  },
});

/**
 * Filter State is a specific kind of Advanced Search Filter items.
 */
export default can.Component.extend({
  tag: 'advanced-search-filter-state',
  template: template,
  viewModel: viewModel,
  events: {
    /**
     * Saves selected states.
     * @param {object} el - clicked element.
     * @param {object} ev - event object.
     * @param {Array} selected - selected items.
     */
    'multiselect-dropdown multiselect:changed': function (el, ev, selected) {
      ev.stopPropagation();
      this.viewModel.saveTreeStates(selected);
    },
  },
});
