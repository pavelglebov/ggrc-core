/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {makeFakeInstance} from '../../../js_specs/spec_helpers';
import Permission from '../../permission';
import * as aclUtils from '../utils/acl-utils';
import {
  formatDate,
  getMappableTypes,
  isMappableType,
  allowedToMap,
  getAssigneeType,
} from '../ggrc_utils';
import Mappings from '../../models/mappers/mappings';

'use strict';

describe('allowedToMap() method', function () {
  let fakeOptions;
  let fakeProgram;
  let fakeAudit;

  beforeEach(function () {
    fakeOptions = {};
  });

  describe('given an Audit and Program pair', function () {
    beforeEach(function () {
      fakeProgram = makeFakeInstance({model: CMS.Models.Program})({
        type: 'Program',
      });
      fakeAudit = makeFakeInstance({model: CMS.Models.Audit})({
        type: 'Program',
      });

      spyOn(Mappings, 'get_canonical_mapping_name')
        .and.returnValue('audits');

      spyOn(Permission, 'is_allowed_for').and.returnValue(true);
    });

    it('returns false for Audit as source and Program as target', function () {
      let result = allowedToMap(fakeAudit, fakeProgram, fakeOptions);
      expect(result).toBe(false);
    });

    it('returns false for Program as source and Audit as target', function () {
      let result = allowedToMap(fakeProgram, fakeAudit, fakeOptions);
      expect(result).toBe(false);
    });
  });

  describe('given a Person instance', function () {
    let origShortName;
    let otherInstance;
    let person;

    beforeAll(function () {
      origShortName = can.Model.shortName;
      can.Model.shortName = 'cacheable';
    });

    afterAll(function () {
      can.Model.shortName = origShortName;
    });

    beforeEach(function () {
      person = makeFakeInstance({model: CMS.Models.Person})({type: 'Person'});
      otherInstance = new can.Model({type: 'Foo'});
    });

    it('returns false for any object', function () {
      let result = allowedToMap(otherInstance, person);
      expect(result).toBe(false);
    });
  });
});

describe('getMappableTypes() method', function () {
  beforeAll(function () {
    let canonicalMappings = {};
    let OBJECT_TYPES = [
      'DataAsset', 'Facility', 'Market', 'OrgGroup', 'Vendor', 'Process',
      'Product', 'Project', 'System', 'Regulation', 'Policy', 'Contract',
      'Standard', 'Program', 'Issue', 'Control', 'Requirement', 'Clause',
      'Objective', 'Audit', 'Assessment', 'AccessGroup',
      'Document', 'Risk', 'Threat',
    ];
    OBJECT_TYPES.forEach(function (item) {
      canonicalMappings[item] = {};
    });
    spyOn(Mappings, 'get_canonical_mappings_for')
      .and.returnValue(canonicalMappings);
  });

  it('excludes the References type from the result', function () {
    let result = getMappableTypes('Reference');
    expect(_.contains(result, 'Reference')).toBe(false);
  });
  it('does not return Issue type for Person', function () {
    let result = getMappableTypes('Person');
    expect(_.contains(result, 'Issue')).toBe(false);
  });
  it('returns only Audit type for AssessmentTemplate', function () {
    let result = getMappableTypes('AssessmentTemplate');
    expect(result.length).toBe(1);
    expect(result[0]).toBe('Audit');
  });
  it('always returns whitelisted items', function () {
    let whitelisted = ['Hello', 'World'];
    let result = getMappableTypes('AssessmentTemplate', {
      whitelist: whitelisted,
    });
    expect(_.intersection(result, whitelisted)).toEqual(whitelisted);
  });
  it('always remove forbidden items', function () {
    let forbidden = ['Policy', 'Process', 'Product', 'Program'];
    let list = getMappableTypes('DataAsset');
    let result = getMappableTypes('DataAsset', {
      forbidden: forbidden,
    });
    expect(_.difference(list, result).sort()).toEqual(forbidden.sort());
  });
  it('always leave whitelisted and remove forbidden items', function () {
    let forbidden = ['Policy', 'Process', 'Product', 'Program'];
    let whitelisted = ['Hello', 'World'];
    let list = getMappableTypes('DataAsset');
    let result = getMappableTypes('DataAsset', {
      forbidden: forbidden,
      whitelist: whitelisted,
    });
    let input = _.difference(list, result).concat(_.difference(result, list));
    let output = forbidden.concat(whitelisted);

    expect(input.sort()).toEqual(output.sort());
  });
});

describe('isMappableType() method', function () {
  it('returns false for AssessmentTemplate and  any type', function () {
    let result = isMappableType('AssessmentTemplate', 'Program');
    expect(result).toBe(false);
  });
  it('returns true for Program and Control', function () {
    let result = isMappableType('Program', 'Control');
    expect(result).toBe(true);
  });
});

describe('getAssigneeType() method', function () {
  let instance;

  beforeAll(function () {
    instance = {
      type: 'Assessment',
      id: 2147483647,
      access_control_list: [],
    };

    spyOn(aclUtils, 'getRolesForType').and.returnValue([
      {
        id: 1, object_type: 'Assessment', name: 'Admin',
      },
      {
        id: 3, object_type: 'Assessment', name: 'Verifiers',
      },
      {
        id: 4, object_type: 'Assessment', name: 'Creators',
      },
      {
        id: 5, object_type: 'Assessment', name: 'Assignees',
      },
    ]);
  });

  it('should return null. Empty ACL', function () {
    let userType = getAssigneeType(instance);
    expect(userType).toBeNull();
  });

  it('should return null. User is not in role', function () {
    let userType;
    instance.access_control_list = [
      {ac_role_id: 3, person: {id: 4}},
      {ac_role_id: 1, person: {id: 5}},
    ];

    userType = getAssigneeType(instance);
    expect(userType).toBeNull();
  });

  it('should return Verifiers type', function () {
    let userType;
    instance.access_control_list = [
      {ac_role_id: 3, person: {id: 1}},
      {ac_role_id: 1, person: {id: 3}},
    ];

    userType = getAssigneeType(instance);
    expect(userType).toEqual('Verifiers');
  });

  it('should return Verifiers and Creators types', function () {
    let userType;
    instance.access_control_list = [
      {ac_role_id: 3, person: {id: 1}},
      {ac_role_id: 1, person: {id: 3}},
      {ac_role_id: 4, person: {id: 1}},
      {ac_role_id: 3, person: {id: 5}},
    ];

    userType = getAssigneeType(instance);
    expect(userType.indexOf('Verifiers') > -1).toBeTruthy();
    expect(userType.indexOf('Creators') > -1).toBeTruthy();
  });

  it('should return Verifiers and Creators and Assigness types', function () {
    let userType;
    instance.access_control_list = [
      {ac_role_id: 3, person: {id: 1}},
      {ac_role_id: 1, person: {id: 3}},
      {ac_role_id: 4, person: {id: 1}},
      {ac_role_id: 3, person: {id: 5}},
      {ac_role_id: 5, person: {id: 1}},
    ];

    userType = getAssigneeType(instance);
    expect(userType.indexOf('Verifiers') > -1).toBeTruthy();
    expect(userType.indexOf('Creators') > -1).toBeTruthy();
    expect(userType.indexOf('Assignees') > -1).toBeTruthy();
  });

  it('should return string with types separated by commas', function () {
    let userType;
    let expectedString = 'Verifiers,Creators,Assignees';
    instance.access_control_list = [
      {ac_role_id: 3, person: {id: 1}},
      {ac_role_id: 1, person: {id: 3}},
      {ac_role_id: 4, person: {id: 1}},
      {ac_role_id: 3, person: {id: 5}},
      {ac_role_id: 5, person: {id: 1}},
    ];

    userType = getAssigneeType(instance);
    expect(userType).toEqual(expectedString);
  });
});

describe('GGRC utils formatDate() method', function () {
  it('should return empty string for false values', function () {
    expect(formatDate(null)).toEqual('');
    expect(formatDate(undefined)).toEqual('');
    expect(formatDate('')).toEqual('');
    expect(formatDate(false)).toEqual('');
    expect(formatDate(0)).toEqual('');
  });
});
