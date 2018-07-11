/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as StateUtils from '../../../plugins/utils/state-utils';
import {getComponentVM} from '../../../../js_specs/spec_helpers';
import Component from '../advanced-search-filter-state';

describe('advanced-search-filter-state component', function () {
  'use strict';

  let viewModel;

  beforeEach(() => {
    viewModel = getComponentVM(Component);
  });

  describe('stateModel set() method', function () {
    it('initializes all "filterStates" checked if "stateModel" is empty',
      function () {
        let states = ['state1', 'state2', 'state3'];
        spyOn(StateUtils, 'getDefaultStatesForModel')
          .and.returnValue(states);
        spyOn(StateUtils, 'getStatesForModel')
          .and.returnValue(states);
        viewModel.attr('modelName', 'Requirement');

        viewModel.attr('stateModel', new can.Map());

        viewModel.attr('filterStates').each(function (item) {
          expect(item.checked).toBeTruthy();
        });
      });

    it('initializes all "filterStates" unchecked ' +
       'if "stateModel.items" is empty',
    function () {
      viewModel.attr('modelName', 'Requirement');

      viewModel.attr('stateModel', new can.Map({
        items: [],
      }));

      viewModel.attr('filterStates').each(function (item) {
        expect(item.checked).toBeFalsy();
      });
    });

    it('initializes "filterStates" checked with items from "stateModel"',
      function () {
        let selectedItems;
        viewModel.attr('modelName', 'Requirement');
        viewModel.attr('stateModel', new can.Map({
          items: ['Active'],
        }));

        selectedItems = _.filter(viewModel.attr('filterStates'), function (it) {
          return it.checked;
        });
        expect(selectedItems.length).toBe(1);
        expect(selectedItems[0].value).toBe('Active');
      });
  });

  describe('saveTreeStates() method', function () {
    it('updates items collection', function () {
      let items;
      let selectedStates = [{value: 'Active'}, {value: 'Draft'}];
      viewModel.attr('stateModel', new can.Map({
        items: [],
      }));

      viewModel.saveTreeStates(selectedStates);

      items = viewModel.attr('stateModel.items');
      expect(items.length).toBe(2);
      expect(items[0]).toBe('Active');
      expect(items[1]).toBe('Draft');
    });
  });
});
