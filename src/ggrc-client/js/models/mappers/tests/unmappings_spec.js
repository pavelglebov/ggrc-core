/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import loKeys from 'lodash/keys';
import loDifference from 'lodash/difference';
import canMap from 'can-map';
import * as Mappings from '../mappings';
import * as Permission from '../../../permission';

describe('Mappings', function () {
  let allTypes = [];
  let notMappableModels = [];
  let modules = {
    core: {
      models: [
        'AccessGroup',
        'AccountBalance',
        'Assessment',
        'AssessmentTemplate',
        'Audit',
        'Contract',
        'Control',
        'DataAsset',
        'Document',
        'Evidence',
        'Facility',
        'Issue',
        'KeyReport',
        'Market',
        'Metric',
        'Objective',
        'OrgGroup',
        'Person',
        'Policy',
        'Process',
        'Product',
        'ProductGroup',
        'Program',
        'Project',
        'Regulation',
        'Requirement',
        'Standard',
        'System',
        'Vendor',
        'Risk',
        'TechnologyEnvironment',
        'Threat',
      ],
      notMappable: ['Assessment', 'AssessmentTemplate', 'Evidence', 'Person'],
      scope: {
        models: [
          'AccessGroup',
          'AccountBalance',
          'DataAsset',
          'Facility',
          'KeyReport',
          'Market',
          'Metric',
          'OrgGroup',
          'Process',
          'Product',
          'ProductGroup',
          'Project',
          'System',
          'TechnologyEnvironment',
          'Vendor',
        ],
        notMappable: [
          'Audit',
          'Control',
          'Risk',
          'Regulation',
          'Standard',
        ],
      },
    },
    workflows: {
      models: [
        'TaskGroup',
        'TaskGroupTask',
        'Workflow',
        'CycleTaskGroupObjectTask',
        'CycleTaskGroup',
      ],
      notMappable: [
        'Workflow',
        'TaskGroup',
        'TaskGroupTask',
        'CycleTaskGroupObjectTask',
        'CycleTaskGroup',
      ],
    },
  };

  Object.keys(modules).forEach(function (module) {
    allTypes = allTypes.concat(modules[module].models);
    notMappableModels = notMappableModels.concat(modules[module].notMappable);
  });

  const filtered = loDifference(allTypes, notMappableModels);

  const unmappingRules = Object.freeze({
    AccessGroup: loDifference(filtered,
      modules.core.scope.notMappable, modules.core.scope.models),
    AccountBalance: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Assessment: loDifference(filtered, ['Audit', 'Person', 'Program', 'Project',
      'Workflow', 'Assessment', 'Document']),
    AssessmentTemplate: [],
    Audit: ['Issue'],
    Contract: loDifference(filtered, ['Audit', 'Contract']),
    Control: loDifference(filtered, modules.core.scope.models,
      ['Audit', 'Regulation', 'Risk', 'Standard']),
    CycleTaskGroupObjectTask: loDifference(filtered, ['Person',
      'Workflow', 'Assessment', 'Document']),
    DataAsset: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Evidence: [],
    Document: loDifference(filtered,
      ['Audit', 'Assessment', 'Document', 'Person', 'Workflow']),
    Facility: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Issue: loDifference(allTypes,
      ['Person', 'AssessmentTemplate', 'Evidence']
        .concat(modules.workflows.notMappable)),
    KeyReport: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Market: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Metric: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Objective: loDifference(filtered, ['Audit']),
    OrgGroup: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Person: [],
    Policy: loDifference(filtered, ['Audit', 'Policy']),
    Process: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Product: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    ProductGroup: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Program: loDifference(allTypes,
      ['Audit', 'Assessment', 'Person']
        .concat(modules.core.notMappable, modules.workflows.notMappable)),
    Project: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    Regulation: loDifference(filtered, modules.core.scope.models,
      ['Audit', 'Regulation', 'Control', 'Risk']),
    Risk: loDifference(filtered, modules.core.scope.models,
      ['Audit', 'Control', 'Standard', 'Regulation']),
    Requirement: loDifference(filtered, ['Audit']),
    Standard: loDifference(filtered, modules.core.scope.models,
      ['Audit', 'Standard', 'Control', 'Risk']),
    System: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
    TaskGroup: loDifference(filtered, ['Audit', 'Person',
      'Workflow', 'Assessment', 'Document']),
    TechnologyEnvironment: loDifference(filtered,
      modules.core.scope.notMappable, modules.core.scope.models),
    Threat: loDifference(filtered, ['Audit']),
    Vendor: loDifference(filtered, modules.core.scope.notMappable,
      modules.core.scope.models),
  });

  describe('allowedToUnmap() method', () => {
    beforeEach(() => {
      spyOn(Permission, 'isAllowedFor').and.returnValue(true);
    });

    it('checks that types are mappable', () => {
      let result = Mappings.allowedToUnmap('SourceType', 'TargetType');

      expect(result).toBeFalsy();
      expect(Permission.isAllowedFor).not.toHaveBeenCalled();
    });

    it('checks permissions to update source', () => {
      let result = Mappings.allowedToUnmap('DataAsset', 'Program');

      expect(result).toBeTruthy();
      expect(Permission.isAllowedFor)
        .toHaveBeenCalledWith('update', 'DataAsset');
      expect(Permission.isAllowedFor.calls.count()).toEqual(1);
    });

    it('checks permissions to update target', () => {
      let source = new canMap({type: 'DataAsset'});
      let target = new canMap({type: 'Program'});
      let result = Mappings.allowedToUnmap(source, target);

      expect(result).toBeTruthy();
      expect(Permission.isAllowedFor.calls.count()).toEqual(2);
      expect(Permission.isAllowedFor.calls.argsFor(0))
        .toEqual(['update', source]);
      expect(Permission.isAllowedFor.calls.argsFor(1))
        .toEqual(['update', target]);
    });
  });

  describe('getAllowedToUnmapModels() method', () => {
    let modelsForTests = loDifference(allTypes, [
      'TaskGroupTask',
      'CycleTaskGroup',
      'Workflow',
    ]);

    modelsForTests.forEach(function (type) {
      it('returns mappable types for ' + type, function () {
        let expectedModels = unmappingRules[type];
        let result = Mappings.getAllowedToUnmapModels(type);
        let resultModels = loKeys(result);

        expect(expectedModels.sort()).toEqual(resultModels.sort());
      });
    });
  });
});
