/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {makeFakeInstance} from '../../../../js_specs/spec_helpers';

describe('GGRC.Components.treeItemExtraInfo', function () {
  'use strict';

  let viewModel;
  let activeModel = [
    'Regulation',
    'Contract',
    'Policy',
    'Standard',
    'Requirement',
  ];

  beforeEach(function () {
    viewModel = GGRC.Components.getViewModel('treeItemExtraInfo');
  });

  describe('is active if', function () {
    it('workflow_state is defined', function () {
      viewModel.attr('instance', {workflow_state: 'far'});
      expect(viewModel.attr('isActive')).toBeTruthy();
    });

    activeModel.forEach(function (model) {
      it('instance is ' + model, function () {
        viewModel.attr('instance', makeFakeInstance(
          {model: CMS.Models[model]}
        )());
        expect(viewModel.attr('isActive')).toBeTruthy();
      });
    });
  });

  describe('is not active if', function () {
    let allModels = Object.keys(GGRC.tree_view.attr('base_widgets_by_type'));
    let notActiveModels = _.difference(allModels, activeModel);

    it('workflow_state is not defined', function () {
      viewModel.attr('instance', {title: 'FooBar'});
      expect(viewModel.attr('isActive')).toBeFalsy();
    });

    notActiveModels.forEach(function (model) {
      if (CMS.Models[model]) {
        it('instance is ' + model, function () {
          viewModel.attr('instance', makeFakeInstance(
            {model: CMS.Models[model]}
          )());
          expect(viewModel.attr('isActive')).toBeFalsy();
        });
      }
    });
  });

  describe('isOverdue property', function () {
    it('returns true if workflow_status is "Overdue"', function () {
      let result;
      viewModel.attr('instance', {
        workflow_state: 'Overdue',
      });

      result = viewModel.attr('isOverdue');

      expect(result).toBe(true);
    });

    it('returns false if workflow_status is not "Overdue"', function () {
      let result;
      viewModel.attr('instance', {
        workflow_state: 'AnyState',
      });

      result = viewModel.attr('isOverdue');

      expect(result).toBe(false);
    });

    it('returns true if instance is "CycleTasks" and overdue', function () {
      let result;
      let instance = makeFakeInstance({
        model: CMS.Models.CycleTaskGroupObjectTask,
      })();
      instance.attr('end_date', moment().subtract(5, 'd'));
      viewModel.attr('instance', instance);

      result = viewModel.attr('isOverdue');

      expect(result).toBe(true);
    });

    it('returns false if instance is "CycleTasks" and not overdue',
      function () {
        let result;
        let instance = makeFakeInstance({
          model: CMS.Models.CycleTaskGroupObjectTask,
        })();
        instance.attr('end_date', moment().add(5, 'd'));
        viewModel.attr('instance', instance);

        result = viewModel.attr('isOverdue');

        expect(result).toBe(false);
      });
  });
});
