/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import loDifference from 'lodash/difference';
import * as Mappings from '../mappings';
import MappingsConfig from '../mappings-ggrc';

describe('Mappings', () => {
  const types = MappingsConfig.MultitypeSearch.map;

  let modules = {
    core: [
      'AccessGroup',
      'AccountBalance',
      'Contract',
      'Control',
      'DataAsset',
      'Facility',
      'Issue',
      'KeyReport',
      'Market',
      'Metric',
      'Objective',
      'OrgGroup',
      'Policy',
      'Process',
      'Product',
      'ProductGroup',
      'Project',
      'Regulation',
      'Requirement',
      'Risk',
      'Standard',
      'System',
      'TechnologyEnvironment',
      'Threat',
      'Vendor',
    ],
    audit: [
      'Evidence',
      'Assessment',
      'AssessmentTemplate',
      'Audit',
    ],
    workflow: [
      'CycleTaskGroupObjectTask',
      'TaskGroup',
      'Workflow',
    ],
  };

  const coreObjectsRules = [
    ...modules.core,
    ...modules.workflow,
    'Assessment', 'Audit', 'Document', 'Person', 'Program',
  ];
  const snapshotableObjects = loDifference(modules.core, ['Project']);

  const mappingRules = {
    AccessGroup: coreObjectsRules,
    AccountBalance: coreObjectsRules,
    Assessment: [...snapshotableObjects, 'Evidence', 'Audit', 'Person'],
    AssessmentTemplate: ['Audit'],
    Audit: [...snapshotableObjects, 'Evidence', 'Assessment',
      'AssessmentTemplate', 'CycleTaskGroupObjectTask', 'Person', 'Program'],
    Contract: loDifference(coreObjectsRules, ['Contract']),
    Control: coreObjectsRules,
    CycleTaskGroupObjectTask: [...modules.core, 'Audit', 'Person', 'Program',
      'Workflow'],
    DataAsset: coreObjectsRules,
    Document: [...modules.core, 'Person', 'Program'],
    Evidence: ['Assessment', 'Audit', 'Person'],
    Facility: coreObjectsRules,
    Issue: coreObjectsRules,
    KeyReport: coreObjectsRules,
    Market: coreObjectsRules,
    Metric: coreObjectsRules,
    Objective: coreObjectsRules,
    OrgGroup: coreObjectsRules,
    Person: [...modules.core, 'Assessment', 'Audit', 'CycleTaskGroupObjectTask',
      'Evidence', 'Document', 'Program', 'TaskGroupTask', 'Workflow'],
    Policy: loDifference(coreObjectsRules, ['Policy']),
    Process: coreObjectsRules,
    Product: coreObjectsRules,
    ProductGroup: coreObjectsRules,
    Program: [...modules.core, ...modules.workflow, 'Audit', 'Document',
      'Person', 'Program'],
    Project: coreObjectsRules,
    Regulation: loDifference(coreObjectsRules, ['Regulation']),
    Requirement: coreObjectsRules,
    Risk: coreObjectsRules,
    Standard: loDifference(coreObjectsRules, ['Standard']),
    System: coreObjectsRules,
    TaskGroup: [...modules.core, 'Program', 'Workflow'],
    TaskGroupTask: ['Person', 'Workflow'],
    TechnologyEnvironment: coreObjectsRules,
    Threat: coreObjectsRules,
    Vendor: coreObjectsRules,
    Workflow: ['Person', 'TaskGroup', 'TaskGroupTask'],
  };

  describe('getAvailableMappings() method', () => {
    types.forEach(function (type) {
      it('returns available types for ' + type, function () {
        let expectedModels = mappingRules[type];
        let result = Mappings.getAvailableMappings(type);
        let resultModels = Object.keys(result);

        expect(expectedModels.sort()).toEqual(resultModels.sort());
      });
    });
  });
});
