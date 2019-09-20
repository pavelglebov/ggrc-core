/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import loDifference from 'lodash/difference';
import {
  businessObjects,
  coreObjects,
  scopingObjects,
  snapshotableObjects,
  externalDirectiveObjects,
  externalBusinessObjects,
} from '../../plugins/models-types-collections';
import {getRoleableModels} from '../../plugins/utils/models-utils';

/*
  To configure a new mapping, use the following format :
  { <source object type> : {
      create: [ <object name>, ...],
      map : [ <object name>, ...],
      externalMap: [ <object name>, ...],
      unmap : [ <object name>, ...],
      indirectMappings: [ <object name>, ...],
    }
  }

  <create> - models that cannot be mapped but can be created in scope of source
    object
  <map> - models that can be mapped to source object directly
    using object mapper
  <externalMap> - models that can be mapped only through external system
    not locally
  <unmap> - models that can be unmapped from source
  <externalUnmap> - models that can be unmapped only through external system
    not locally
  <indirectMappings> - models which cannot be directly mapped to object
    through Relationship but linked by another way. Currently used for Mapping
    Filter in Object mapper and Global Search
*/

const roleableObjects = getRoleableModels()
  .map((model) => model.model_singular);

const createRule = {
  create: ['CycleTaskGroupObjectTask'],
};

const coreObjectConfig = {
  ...createRule,
  map: loDifference(businessObjects, ['Assessment']),
  unmap: loDifference(businessObjects, ['Assessment', 'Audit']),
  indirectMappings: ['Assessment', 'Person', 'TaskGroup', 'Workflow'],
};

const scopingObjectConfig = {
  ...createRule,
  map: loDifference(businessObjects,
    ['Assessment', ...externalBusinessObjects, ...externalDirectiveObjects]),
  externalMap: [...externalBusinessObjects, ...externalDirectiveObjects],
  unmap: loDifference(businessObjects, [
    'Assessment',
    'Audit',
    ...externalBusinessObjects,
    ...externalDirectiveObjects,
  ]),
  externalUnmap: [...externalBusinessObjects, ...externalDirectiveObjects],
  indirectMappings: ['Assessment', 'Person', 'TaskGroup', 'Workflow'],
};

export default {
  Person: {
    indirectMappings: ['CycleTaskGroupObjectTask', 'TaskGroupTask', 'Workflow',
      ...roleableObjects],
  },

  Program: {
    create: ['Audit', 'CycleTaskGroupObjectTask'],
    map: [...coreObjects, 'Program', 'Document'],
    unmap: [...coreObjects, 'Program', 'Document'],
    indirectMappings: ['Person', 'TaskGroup', 'Workflow'],
  },

  Document: {
    map: [...coreObjects, 'Program'],
    unmap: [...coreObjects, 'Program'],
    indirectMappings: ['Person'],
  },

  // Core objects
  Issue: {
    ...createRule,
    map: [...coreObjects, 'Document', 'Program'],
    // mapping audit and assessment to issue is not allowed,
    // but unmapping possible
    unmap: [...coreObjects, 'Assessment', 'Audit', 'Document', 'Program'],
    indirectMappings: ['Assessment', 'Audit', 'Person', 'TaskGroup',
      'Workflow'],
  },
  Contract: {
    ...createRule,
    map: loDifference(businessObjects, ['Assessment', 'Contract']),
    unmap: loDifference(businessObjects, ['Assessment', 'Audit', 'Contract']),
    indirectMappings: ['Assessment', 'Person', 'TaskGroup', 'Workflow'],
  },
  Control: {
    ...createRule,
    map: loDifference(businessObjects,
      ['Assessment', ...scopingObjects, ...externalDirectiveObjects, 'Risk']),
    externalMap: [...scopingObjects, ...externalDirectiveObjects, 'Risk'],
    unmap: loDifference(businessObjects, [
      'Assessment',
      'Audit',
      ...scopingObjects,
      ...externalDirectiveObjects,
      'Risk',
    ]),
    externalUnmap: [...scopingObjects, ...externalDirectiveObjects, 'Risk'],
    indirectMappings: ['Assessment', 'Person', 'TaskGroup', 'Workflow'],
  },
  Objective: {
    ...coreObjectConfig,
  },
  Policy: {
    ...createRule,
    map: loDifference(businessObjects, ['Assessment', 'Policy']),
    unmap: loDifference(businessObjects, ['Assessment', 'Audit', 'Policy']),
    indirectMappings: ['Assessment', 'Person', 'TaskGroup', 'Workflow'],
  },
  Requirement: {
    ...coreObjectConfig,
  },
  Regulation: {
    ...createRule,
    map: loDifference(businessObjects,
      [...scopingObjects, 'Assessment', 'Regulation',
        ...externalBusinessObjects]),
    externalMap: [...scopingObjects, ...externalBusinessObjects],
    unmap: loDifference(businessObjects, [
      'Assessment',
      'Audit',
      'Regulation',
      ...scopingObjects,
      ...externalBusinessObjects,
    ]),
    externalUnmap: [...scopingObjects, ...externalBusinessObjects],
    indirectMappings: ['Assessment', 'Person', 'TaskGroup', 'Workflow'],
  },
  Risk: {
    ...createRule,
    map: loDifference(businessObjects, ['Assessment',
      ...scopingObjects,
      ...externalDirectiveObjects, 'Control']),
    externalMap: [...scopingObjects, ...externalDirectiveObjects, 'Control'],
    unmap: loDifference(businessObjects, [
      'Assessment',
      'Audit',
      ...scopingObjects,
      ...externalDirectiveObjects,
      'Control',
    ]),
    externalUnmap: [...scopingObjects, ...externalDirectiveObjects, 'Control'],
    indirectMappings: ['Assessment', 'Person', 'TaskGroup', 'Workflow'],
  },
  Standard: {
    ...createRule,
    map: loDifference(businessObjects,
      [...scopingObjects, 'Assessment', 'Standard',
        ...externalBusinessObjects]),
    externalMap: [...scopingObjects, ...externalBusinessObjects],
    unmap: loDifference(businessObjects, [
      'Assessment',
      'Audit',
      'Standard',
      ...scopingObjects,
      ...externalBusinessObjects,
    ]),
    externalUnmap: [...scopingObjects, ...externalBusinessObjects],
    indirectMappings: ['Assessment', 'Person', 'TaskGroup', 'Workflow'],
  },
  Threat: {
    ...coreObjectConfig,
  },

  // Scoping objects
  AccessGroup: {
    ...createRule,
    map: loDifference(businessObjects,
      ['Assessment', 'AccessGroup',
        ...externalBusinessObjects,
        ...externalDirectiveObjects,
      ]),
    externalMap: [...externalBusinessObjects, ...externalDirectiveObjects],
    unmap: loDifference(businessObjects, [
      'Assessment',
      'AccessGroup',
      'Audit',
      ...externalBusinessObjects,
      ...externalDirectiveObjects,
    ]),
    externalUnmap: [...externalBusinessObjects, ...externalDirectiveObjects],
    indirectMappings: ['Assessment', 'Person', 'TaskGroup', 'Workflow'],
  },
  AccountBalance: {
    ...scopingObjectConfig,
  },
  DataAsset: {
    ...scopingObjectConfig,
  },
  Facility: {
    ...scopingObjectConfig,
  },
  KeyReport: {
    ...scopingObjectConfig,
  },
  Market: {
    ...scopingObjectConfig,
  },
  Metric: {
    ...scopingObjectConfig,
  },
  OrgGroup: {
    ...scopingObjectConfig,
  },
  Process: {
    ...scopingObjectConfig,
  },
  Product: {
    ...scopingObjectConfig,
  },
  ProductGroup: {
    ...scopingObjectConfig,
  },
  Project: {
    ...scopingObjectConfig,
  },
  System: {
    ...scopingObjectConfig,
  },
  TechnologyEnvironment: {
    ...scopingObjectConfig,
  },
  Vendor: {
    ...scopingObjectConfig,
  },

  // Audit
  Audit: {
    create: ['Assessment', 'AssessmentTemplate', 'CycleTaskGroupObjectTask'],
    map: [...snapshotableObjects, 'Issue'],
    unmap: ['Issue'],
    indirectMappings: ['Evidence', 'Person', 'Program'],
  },
  Assessment: {
    map: [...snapshotableObjects, 'Issue'],
    unmap: [...snapshotableObjects, 'Issue'],
    indirectMappings: ['Audit', 'Evidence', 'Person'],
  },
  Evidence: {
    indirectMappings: ['Assessment', 'Audit', 'Person'],
  },
  AssessmentTemplate: {
    indirectMappings: ['Audit'],
  },

  // Workflow
  TaskGroup: {
    map: [...coreObjects, 'Program'],
    unmap: [...coreObjects, 'Program'],
    indirectMappings: ['Workflow'],
  },
  TaskGroupTask: {
    indirectMappings: ['Person', 'Workflow'],
  },
  Workflow: {
    indirectMappings: ['Person', 'TaskGroup', 'TaskGroupTask'],
  },
  CycleTaskGroupObjectTask: {
    map: [...coreObjects, 'Audit', 'Program'],
    unmap: [...coreObjects, 'Audit', 'Program'],
    indirectMappings: ['Person', 'Workflow'],
  },

  // Other
  MultitypeSearch: {
    map: [
      'AccessGroup', 'AccountBalance', 'Assessment', 'AssessmentTemplate',
      'Audit', 'Contract', 'Control', 'CycleTaskGroupObjectTask', 'DataAsset',
      'Document', 'Evidence', 'Facility', 'Issue', 'KeyReport', 'Market',
      'Metric', 'Objective', 'OrgGroup', 'Person', 'Process', 'Product',
      'ProductGroup', 'Project', 'Policy', 'Program', 'Regulation',
      'Requirement', 'Risk', 'Standard', 'System', 'TaskGroup',
      'TaskGroupTask', 'TechnologyEnvironment', 'Threat',
      'Vendor', 'Workflow',
    ],
  },
};

