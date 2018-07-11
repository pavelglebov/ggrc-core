/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import * as StateUtils from '../utils/state-utils';
import * as CurrentPageUtils from '../utils/current-page-utils';

describe('StateUtils', function () {
  describe('buildStatusFilter() method', function () {
    it('buildStatusFilter() should return filter with all statuses',
      function () {
        let statuses = [
          'Draft', 'Active', 'Deprecated',
        ];
        let expectedFilter = {
          expression: {
            left: 'Status',
            op: {name: 'IN'},
            right: ['Draft', 'Active', 'Deprecated'],
          },
        };

        let statesFilter = StateUtils.buildStatusFilter(statuses);

        expect(statesFilter).toEqual(expectedFilter);
      }
    );

    it('statesFilter should not update Assessmnet statuses',
      function () {
        let statuses = [
          'Not Started', 'In Progress', 'In Review',
        ];
        let expectedFilter = {
          expression: {
            left: 'Status',
            op: {name: 'IN'},
            right: ['Not Started', 'In Progress', 'In Review'],
          },
        };

        let statesFilter =
          StateUtils.buildStatusFilter(statuses, 'Assessment');

        expect(statesFilter).toEqual(expectedFilter);
      }
    );

    it('statesFilter should have "Completed" status and "verified=true"',
      function () {
        let statuses = [
          'In Review', 'Completed and Verified',
        ];
        let expectedFilter = {
          expression: {
            left: {
              left: 'Status',
              op: {name: 'IN'},
              right: ['In Review'],
            },
            op: {name: 'OR'},
            right: {
              left: {
                left: 'Status',
                op: {name: '='},
                right: 'Completed',
              },
              op: {name: 'AND'},
              right: {
                left: 'verified',
                op: {name: '='},
                right: 'true',
              },
            },
          },
        };

        let statesFilter = StateUtils.buildStatusFilter(statuses, 'Assessment');

        expect(statesFilter).toEqual(expectedFilter);
      }
    );

    it('statesFilter should have "Completed" status and "verified=false"',
      function () {
        let statuses = [
          'In Review', 'Completed (no verification)',
        ];
        let expectedFilter = {
          expression: {
            left: {
              left: 'Status',
              op: {name: 'IN'},
              right: ['In Review'],
            },
            op: {name: 'OR'},
            right: {
              left: {
                left: 'Status',
                op: {name: '='},
                right: 'Completed',
              },
              op: {name: 'AND'},
              right: {
                left: 'verified',
                op: {name: '='},
                right: 'false',
              },
            },
          },
        };

        let statesFilter = StateUtils.buildStatusFilter(statuses, 'Assessment');

        expect(statesFilter).toEqual(expectedFilter);
      }
    );

    it('statesFilter should have "Completed" status',
      function () {
        let statuses = [
          'In Progress', 'Completed (no verification)',
          'Completed and Verified',
        ];
        let expectedFilter = {
          expression: {
            left: 'Status',
            op: {name: 'IN'},
            right: ['In Progress', 'Completed'],
          },
        };

        let statesFilter = StateUtils.buildStatusFilter(statuses, 'Assessment');

        expect(statesFilter).toEqual(expectedFilter);
      }
    );
  });

  describe('getDefaultStatesForModel() method', function () {
    it('get default states for "MyAssessments" page', function () {
      let defaultStates;

      spyOn(CurrentPageUtils, 'isMyAssessments')
        .and.returnValue(true);

      defaultStates = StateUtils.getDefaultStatesForModel('Assessment');

      expect(defaultStates.length).toEqual(2);
      expect(defaultStates[0]).toEqual('Not Started');
    });

    it('get default states for "Control" type', function () {
      let defaultStates;

      spyOn(CurrentPageUtils, 'isMyAssessments')
        .and.returnValue(false);

      defaultStates = StateUtils.getDefaultStatesForModel('Control');

      expect(defaultStates.length).toEqual(3);
      expect(defaultStates[0]).toEqual('Active');
    });
  });

  describe('getStatusFieldName() method', function () {
    it('returns "Task State" for CycleTaskGroupObjectTask', function () {
      let expected = 'Task State';

      let actual = StateUtils.getStatusFieldName('CycleTaskGroupObjectTask');

      expect(actual).toEqual(expected);
    });

    it('returns "Status" when model is not provided', function () {
      let expected = 'Status';

      let actual = StateUtils.getStatusFieldName('');

      expect(actual).toEqual(expected);
    });

    it('returns "Status" for non-CycleTaskGroupObjectTask models',
      function () {
        let models = ['Standard', 'Regulation', 'Requirement', 'Objective',
          'Control', 'Product', 'System', 'Process', 'AccessGroup',
          'Assessment', 'Clause', 'Contract', 'DataAsset', 'Facility',
          'Issue', 'Market', 'OrgGroup', 'Policy', 'Program', 'Project',
          'Risk', 'Threat', 'Vendor', 'Audit', 'RiskAssessment', 'Workflow',
          'AssessmentTemplate', 'Person', 'TaskGroup', 'TaskGroupTask',
          'Cycle', 'CycleTaskGroup'];

        _.forEach(models, function (model) {
          expect(StateUtils.getStatusFieldName(model))
            .toEqual('Status');
        });
      });
  });

  describe('getBulkStatesForModel() method', function () {
    it('returns expected states for CycleTaskGroupObjectTask', function () {
      let expected = ['In Progress', 'Finished',
        'Declined', 'Deprecated', 'Verified'];

      let actual = StateUtils
        .getBulkStatesForModel('CycleTaskGroupObjectTask');

      expect(actual).toEqual(expected);
    });

    it('returns an empty array when model is not provided', function () {
      let expected = [];

      let actual = StateUtils.getBulkStatesForModel('');

      expect(actual).toEqual(expected);
    });

    it('returns an empty array for non-CycleTaskGroupObjectTask models',
      function () {
        let expected = [];
        let models = ['Standard', 'Regulation', 'Requirement', 'Objective',
          'Control', 'Product', 'System', 'Process', 'AccessGroup',
          'Assessment', 'Clause', 'Contract', 'DataAsset', 'Facility',
          'Issue', 'Market', 'OrgGroup', 'Policy', 'Program', 'Project',
          'Risk', 'Threat', 'Vendor', 'Audit', 'RiskAssessment', 'Workflow',
          'AssessmentTemplate', 'Person', 'TaskGroup', 'TaskGroupTask',
          'Cycle', 'CycleTaskGroup'];

        _.forEach(models, function (model) {
          expect(StateUtils.getBulkStatesForModel(model))
            .toEqual(expected);
        });
      });
  });
});
