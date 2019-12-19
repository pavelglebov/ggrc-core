/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  getComponentVM,
  makeFakeInstance,
} from '../../../../js_specs/spec-helpers';
import Component from '../wrapper-assessment-template';
import AssessmentTemplate from '../../../models/business-models/assessment-template';

const PEOPLE_VALUES_OPTIONS = Object.freeze({
  Control: [
    {value: 'Admin', title: 'Object Admins'},
    {value: 'Audit Lead', title: 'Audit Captain'},
    {value: 'Auditors', title: 'Auditors'},
    {value: 'Principal Assignees', title: 'Principal Assignees'},
    {value: 'Secondary Assignees', title: 'Secondary Assignees'},
    {value: 'Control Operators', title: 'Control Operators'},
    {value: 'Control Owners', title: 'Control Owners'},
    {value: 'Other Contacts', title: 'Other Contacts'},
    {value: 'other', title: 'Others...'},
  ],
  scope: [
    {value: 'Admin', title: 'Object Admins'},
    {value: 'Audit Lead', title: 'Audit Captain'},
    {value: 'Auditors', title: 'Auditors'},
    {value: 'Principal Assignees', title: 'Principal Assignees'},
    {value: 'Secondary Assignees', title: 'Secondary Assignees'},
    {value: 'Compliance Contacts', title: 'Compliance Contacts'},
    {value: 'Other Contacts', title: 'Other Contacts'},
    {value: 'other', title: 'Others...'},
  ],
  defaults: [
    {value: 'Admin', title: 'Object Admins'},
    {value: 'Audit Lead', title: 'Audit Captain'},
    {value: 'Auditors', title: 'Auditors'},
    {value: 'Principal Assignees', title: 'Principal Assignees'},
    {value: 'Secondary Assignees', title: 'Secondary Assignees'},
    {value: 'Primary Contacts', title: 'Primary Contacts'},
    {value: 'Secondary Contacts', title: 'Secondary Contacts'},
    {value: 'other', title: 'Others...'},
  ],
});

const PEOPLE_LABELS_OPTIONS = Object.freeze({
  assignees: {
    assignee_1: 'Assignee Label 1',
    assignee_2: 'Assignee Label 2',
  },
  verifiers: {
    verifier_1: 'Verifier Label 1',
    verifier_2: 'Verifier Label 2',
  },
});

describe('wrapper-assessment-template component', function () {
  let viewModel;

  beforeEach(function () {
    viewModel = getComponentVM(Component);
  });

  describe('getter for showCaptainAlert', function () {
    it('sets showCaptainAlert is true if default_people.assignees ' +
    'in peopleTitlesList array', function () {
      viewModel.attr('instance.default_people', {assignees: 'Auditors'});

      expect(viewModel.attr('showCaptainAlert')).toBe(true);
    });

    it('sets showCaptainAlert is false if default_people.assignees ' +
    'not in peopleTitlesList array', function () {
      viewModel.attr('instance.default_people', {assignees: 'People'});

      expect(viewModel.attr('showCaptainAlert')).toBe(false);
    });
  });

  describe('peopleValues property', () => {
    beforeEach(() => {
      let model = makeFakeInstance({model: AssessmentTemplate})();
      viewModel.attr('instance', model);
    });

    it('returns correct values when template_object_type is Control', () => {
      viewModel.attr('instance.template_object_type', 'Control');

      let peopleValues = viewModel.attr('peopleValues');
      expect(peopleValues)
        .toEqual(PEOPLE_VALUES_OPTIONS.Control);
    });

    it('returns default values when template_object_type is not Control',
      () => {
        viewModel.attr('instance.template_object_type', 'Objective');

        let peopleValues = viewModel.attr('peopleValues');
        expect(peopleValues)
          .toEqual(PEOPLE_VALUES_OPTIONS.defaults);
      });
  });

  describe('defaultAssigneeLabel property', () => {
    beforeEach(() => {
      viewModel.attr('instance', {
        DEFAULT_PEOPLE_LABELS: PEOPLE_LABELS_OPTIONS.assignees,
      });
    });

    it('returns correct values when template_object_type is Control', () => {
      viewModel.attr('instance.default_people', {
        assignees: 'assignee_1',
      });

      let result = viewModel.attr('defaultAssigneeLabel');
      expect(result).toEqual(PEOPLE_LABELS_OPTIONS.assignees.assignee_1);
    });
  });

  describe('defaultVerifierLabel property', () => {
    beforeEach(() => {
      viewModel.attr('instance', {
        DEFAULT_PEOPLE_LABELS: PEOPLE_LABELS_OPTIONS.verifiers,
      });
    });

    it('returns correct values when template_object_type is Control', () => {
      viewModel.attr('instance.default_people', {
        verifiers: 'verifier_2',
      });

      let result = viewModel.attr('defaultVerifierLabel');
      expect(result).toEqual(PEOPLE_LABELS_OPTIONS.verifiers.verifier_2);
    });
  });
});
