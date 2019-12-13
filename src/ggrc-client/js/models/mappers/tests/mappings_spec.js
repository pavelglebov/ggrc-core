/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import loDifference from 'lodash/difference';
import canMap from 'can-map';
import * as Mappings from '../mappings';
import * as Permission from '../../../permission';

describe('Mappings', () => {
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

  Object.keys(modules).forEach((module) => {
    allTypes = allTypes.concat(modules[module].models);
    notMappableModels = notMappableModels.concat(modules[module].notMappable);
  });

  const filtered = loDifference(allTypes, notMappableModels);

  const mappingRules = Object.freeze({
    AccessGroup: filtered,
    AccountBalance: filtered,
    Assessment: loDifference(filtered, ['Audit', 'Person', 'Program', 'Project',
      'Workflow', 'Assessment', 'Document']),
    AssessmentTemplate: [],
    Audit: loDifference(filtered, ['Audit', 'Person', 'Program', 'Project',
      'Workflow', 'Assessment', 'Document']),
    Contract: loDifference(filtered, ['Contract']),
    Control: filtered,
    CycleTaskGroupObjectTask: loDifference(filtered, ['Person',
      'Workflow', 'Assessment', 'Document']),
    DataAsset: filtered,
    Evidence: [],
    Document: loDifference(filtered,
      ['Audit', 'Assessment', 'Document', 'Person', 'Workflow']),
    Facility: filtered,
    Issue: loDifference(filtered, [
      'Audit', 'Person', 'Workflow', 'Assessment']),
    KeyReport: filtered,
    Market: filtered,
    Metric: filtered,
    Objective: filtered,
    OrgGroup: filtered,
    Person: [],
    Policy: loDifference(filtered, ['Policy']),
    Process: filtered,
    Product: filtered,
    ProductGroup: filtered,
    Program: loDifference(allTypes,
      ['Audit', 'Assessment', 'Person']
        .concat(modules.core.notMappable, modules.workflows.notMappable)),
    Project: filtered,
    Regulation: loDifference(filtered, ['Regulation']),
    Risk: filtered,
    Requirement: filtered,
    Standard: loDifference(filtered, ['Standard']),
    System: filtered,
    TaskGroup: loDifference(filtered, ['Audit', 'Person',
      'Workflow', 'Assessment', 'Document']),
    TechnologyEnvironment: filtered,
    Threat: filtered,
    Vendor: filtered,
    MultitypeSearch: loDifference(allTypes, ['CycleTaskGroup']),
  });

  describe('getMappingList() method', () => {
    let types = allTypes.concat('MultitypeSearch');
    let modelsForTests = loDifference(types, [
      'TaskGroupTask',
      'CycleTaskGroup',
      'Workflow',
    ]);

    modelsForTests.forEach(function (type) {
      it('returns mappable types for ' + type, function () {
        let expectedModels = mappingRules[type];
        let result = Mappings.getMappingList(type);

        expect(expectedModels.sort()).toEqual(result.sort());
      });
    });
  });

  describe('allowedToMap() method', () => {
    beforeEach(() => {
      spyOn(Permission, 'isAllowedFor').and.returnValue(true);
    });

    it('checks that types are mappable', () => {
      let result = Mappings.allowedToMap('SourceType', 'TargetType');

      expect(result).toBeFalsy();
      expect(Permission.isAllowedFor).not.toHaveBeenCalled();
    });

    it('checks map collection', () => {
      let result = Mappings.allowedToMap('Program', 'Document');
      expect(result).toBeTruthy();
    });

    it('checks externalMap collection', () => {
      let result = Mappings.allowedToMap('Control', 'Risk');
      expect(result).toBeTruthy();
    });

    it('checks permissions to update source', () => {
      let result = Mappings.allowedToMap('Program', 'Document');

      expect(result).toBeTruthy();
      expect(Permission.isAllowedFor)
        .toHaveBeenCalledWith('update', 'Program');
      expect(Permission.isAllowedFor.calls.count()).toEqual(1);
    });

    it('checks permissions to update target', () => {
      let source = new canMap({type: 'Program'});
      let target = new canMap({type: 'Document'});
      let result = Mappings.allowedToMap(source, target);

      expect(result).toBeTruthy();
      expect(Permission.isAllowedFor.calls.count()).toEqual(2);
      expect(Permission.isAllowedFor.calls.argsFor(0))
        .toEqual(['update', source]);
      expect(Permission.isAllowedFor.calls.argsFor(1))
        .toEqual(['update', target]);
    });
  });

  describe('allowedToCreate() method', () => {
    beforeEach(() => {
      spyOn(Permission, 'isAllowedFor').and.returnValue(true);
    });

    it('checks that types are mappable', () => {
      let result = Mappings.allowedToCreate('SourceType', 'TargetType');

      expect(result).toBeFalsy();
      expect(Permission.isAllowedFor).not.toHaveBeenCalled();
    });

    it('checks permissions to update source', () => {
      let result = Mappings.allowedToCreate('Program', 'Audit');

      expect(result).toBeTruthy();
      expect(Permission.isAllowedFor)
        .toHaveBeenCalledWith('update', 'Program');
      expect(Permission.isAllowedFor.calls.count()).toEqual(1);
    });

    it('checks permissions to update target', () => {
      let source = new canMap({type: 'Program'});
      let target = new canMap({type: 'Audit'});
      let result = Mappings.allowedToCreate(source, target);

      expect(result).toBeTruthy();
      expect(Permission.isAllowedFor.calls.count()).toEqual(2);
      expect(Permission.isAllowedFor.calls.argsFor(0))
        .toEqual(['update', source]);
      expect(Permission.isAllowedFor.calls.argsFor(1))
        .toEqual(['update', target]);
    });
  });

  describe('allowedToUnmap() method', () => {
    beforeEach(() => {
      spyOn(Permission, 'isAllowedFor').and.returnValue(true);
    });

    it('checks that types are unmappable', () => {
      let result = Mappings.allowedToUnmap('SourceType', 'TargetType');

      expect(result).toBeFalsy();
      expect(Permission.isAllowedFor).not.toHaveBeenCalled();
    });

    it('checks permissions to update source', () => {
      let result = Mappings.allowedToUnmap('Program', 'Document');

      expect(result).toBeTruthy();
      expect(Permission.isAllowedFor)
        .toHaveBeenCalledWith('update', 'Program');
      expect(Permission.isAllowedFor.calls.count()).toEqual(1);
    });

    it('checks permissions to update target', () => {
      let source = new canMap({type: 'Program'});
      let target = new canMap({type: 'Document'});
      let result = Mappings.allowedToUnmap(source, target);

      expect(result).toBeTruthy();
      expect(Permission.isAllowedFor.calls.count()).toEqual(2);
      expect(Permission.isAllowedFor.calls.argsFor(0))
        .toEqual(['update', source]);
      expect(Permission.isAllowedFor.calls.argsFor(1))
        .toEqual(['update', target]);
    });
  });
});
