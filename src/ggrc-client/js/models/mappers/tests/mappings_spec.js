/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as Utils from '../../../plugins/ggrc_utils';
import Mappings from '../mappings';

describe('Mappings', function () {
  let allTypes = [];
  let notMappableModels = [];
  let modules = {
    core: {
      models: [
        'AccessGroup',
        'Assessment',
        'AssessmentTemplate',
        'Audit',
        'Clause',
        'Contract',
        'Control',
        'DataAsset',
        'Document',
        'Evidence',
        'Facility',
        'Issue',
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
      notMappable: ['AssessmentTemplate', 'Evidence'],
    },
    risk_assessments: {
      models: ['RiskAssessment'],
      notMappable: ['RiskAssessment'],
    },
    workflows: {
      models: [
        'TaskGroup',
        'Workflow',
        'CycleTaskEntry',
        'CycleTaskGroupObjectTask',
        'CycleTaskGroupObject',
        'CycleTaskGroup',
      ],
      notMappable: [
        'CycleTaskEntry',
        'CycleTaskGroupObjectTask',
        'CycleTaskGroupObject',
        'CycleTaskGroup',
      ],
    },
  };
  let directives = ['Contract', 'Policy', 'Regulation', 'Standard'];
  let mappingRules;
  let filtered;

  function getModelsFromGroups(groups, groupNames) {
    let models = [];
    groupNames.forEach(function (groupName) {
      let groupModels = groups[groupName].items.map(function (item) {
        return item.singular;
      });
      models = models.concat(groupModels);
    });
    return models;
  }

  Object.keys(modules).forEach(function (module) {
    allTypes = allTypes.concat(modules[module].models);
    notMappableModels = notMappableModels.concat(modules[module].notMappable);
  });

  filtered = _.difference(allTypes, notMappableModels);

  mappingRules = {
    AccessGroup: _.difference(filtered, ['AccessGroup']),
    Assessment: _.difference(filtered, ['Audit', 'Person', 'Program', 'Project',
      'TaskGroup', 'Workflow', 'Assessment', 'Document']),
    AssessmentTemplate: _.difference(filtered, ['Audit', 'Person', 'Program',
      'Project', 'TaskGroup', 'Workflow', 'Assessment', 'Document']),
    Audit: _.difference(filtered, ['Audit', 'Person', 'Program', 'Project',
      'TaskGroup', 'Workflow', 'Assessment', 'Document']),
    Clause: _.difference(filtered, ['Clause']),
    Contract: _.difference(filtered, directives),
    Control: filtered,
    CycleTaskGroupObjectTask: _.difference(filtered, ['Person',
      'TaskGroup', 'Workflow', 'Assessment', 'Document']),
    DataAsset: filtered,
    Evidence: ['Assessment', 'Audit'],
    Document: _.difference(filtered,
      ['Audit', 'Assessment', 'Document', 'Person', 'Workflow', 'TaskGroup']),
    Facility: filtered,
    Issue: _.difference(filtered, [
      'Audit', 'Person', 'Workflow', 'Assessment']),
    Market: filtered,
    Metric: filtered,
    Objective: filtered,
    OrgGroup: filtered,
    Person: _.difference(filtered, ['Person', 'Audit', 'TaskGroup',
      'Workflow', 'Issue']),
    Policy: _.difference(filtered, directives),
    Process: filtered,
    Product: filtered,
    ProductGroup: filtered,
    Program: _.difference(allTypes,
      ['Program', 'Audit', 'RiskAssessment', 'Assessment']
        .concat(modules.core.notMappable, modules.workflows.notMappable)),
    Project: filtered,
    Regulation: _.difference(filtered, directives),
    Risk: filtered,
    RiskAssessment: [],
    Requirement: filtered,
    Standard: _.difference(filtered, directives),
    System: filtered,
    TaskGroup: _.difference(filtered, ['Audit', 'Person',
      'TaskGroup', 'Workflow', 'Assessment', 'Document']),
    TechnologyEnvironment: filtered,
    Threat: filtered,
    Vendor: filtered,
  };

  beforeAll(function () {
    // init all modules
    can.each(GGRC.extensions, function (extension) {
      if (modules[extension.name] && extension.init_widgets) {
        extension.init_widgets();
      }
    });
  });

  describe('getMappingTypes() method', function () {
    let EXPECTED_GROUPS = ['entities', 'business', 'governance'];
    let modelsForTests = _.difference(allTypes, [
      'CycleTaskEntry',
      'CycleTaskGroup',
      'CycleTaskGroupObject',
      'Workflow',
    ]);

    modelsForTests.forEach(function (type) {
      it('returns mappable types for ' + type, function () {
        let expectedModels = mappingRules[type];
        let result = Mappings.getMappingTypes(type, [], []);
        let resultGroups = Object.keys(result);
        let resultModels = getModelsFromGroups(result, EXPECTED_GROUPS);

        expect(EXPECTED_GROUPS).toEqual(resultGroups);
        expect(expectedModels.sort()).toEqual(resultModels.sort());
      });
    });
  });

  describe('_prepareCorrectTypeFormat() method', function () {
    let cmsModel = {
      category: 'category',
      title_plural: 'title_plural',
      model_singular: 'model_singular',
      table_plural: 'table_plural',
      title_singular: 'title_singular',
    };
    let expectedResult = {
      category: 'category',
      name: 'title_plural',
      value: 'model_singular',
      plural: 'title_plural',
      singular: 'model_singular',
      table_plural: 'table_plural',
      title_singular: 'title_singular',
    };

    it('returns specified object', function () {
      let result;
      result = Mappings._prepareCorrectTypeFormat(cmsModel);
      expect(result).toEqual(expectedResult);
    });

    it('converts models plural title to a snake_case', function () {
      let result;
      let cmsModel1 = _.assign({}, cmsModel, {
        title_plural: 'Title Plural',
      });
      result = Mappings._prepareCorrectTypeFormat(cmsModel1);
      expect(result.plural).toEqual(expectedResult.plural);
    });
  });

  describe('addFormattedType() method', function () {
    let groups;
    let type = {
      category: 'category',
    };

    beforeEach(function () {
      groups = {
        governance: {
          items: [],
        },
        category: {
          items: [],
        },
      };
      spyOn(Mappings, '_prepareCorrectTypeFormat')
        .and.returnValue(type);
    });

    it('adds type to governance group if no group with category of this type',
      function () {
        groups.category = undefined;
        spyOn(Utils, 'getModelByType')
          .and.returnValue({
            title_singular: 'title_singular',
          });
        Mappings._addFormattedType('name', groups);
        expect(groups.governance.items[0]).toEqual(type);
      });

    it('adds type to group of category of this type if this group exist',
      function () {
        groups.governance = undefined;
        spyOn(Utils, 'getModelByType')
          .and.returnValue({
            title_singular: 'title_singular',
          });
        Mappings._addFormattedType('name', groups);
        expect(groups[type.category].items[0]).toEqual(type);
      });

    it('does nothing if cmsModel is not defined', function () {
      spyOn(Utils, 'getModelByType');
      Mappings._addFormattedType('name', groups);
      expect(groups.governance.items.length).toEqual(0);
      expect(groups[type.category].items.length).toEqual(0);
    });
    it('does nothing if singular title of cmsModel is not defined',
      function () {
        spyOn(Utils, 'getModelByType')
          .and.returnValue({});
        Mappings._addFormattedType('name', groups);
        expect(groups.governance.items.length).toEqual(0);
        expect(groups[type.category].items.length).toEqual(0);
      });
    it('does nothing if singular title of cmsModel is "Reference"',
      function () {
        spyOn(Utils, 'getModelByType')
          .and.returnValue({
            title_singular: 'Reference',
          });
        Mappings._addFormattedType('name', groups);
        expect(groups.governance.items.length).toEqual(0);
        expect(groups[type.category].items.length).toEqual(0);
      });
  });
});
