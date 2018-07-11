/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

/*

Spec setup file.
*/

window.GGRC = window.GGRC || {};
GGRC.current_user = GGRC.current_user || {
  id: 1,
  type: 'Person',
};
GGRC.permissions = {
  create: {},
  'delete': {},
  read: {},
  update: {},
  view_object_page: {},
};
GGRC.config = {
  snapshotable_parents: ['Audit'],
  snapshotable_objects: [
    'Control',
    'Product',
    'ProductGroup',
    'OrgGroup',
    'Vendor',
    'Risk',
    'Facility',
    'Process',
    'Clause',
    'Requirement',
    'DataAsset',
    'AccessGroup',
    'System',
    'Contract',
    'Standard',
    'Objective',
    'Regulation',
    'Threat',
    'Policy',
    'Market',
    'Metric',
    'TechnologyEnvironment',
  ],
  VERSION: '1.0-Test (abc)',
};
GGRC.Bootstrap = {
  exportable: [{
    title_plural: 'Audits',
    model_singular: 'Audit',
  }, {
    title_plural: 'Clauses',
    model_singular: 'Clause',
  }, {
    title_plural: 'Contracts',
    model_singular: 'Contract',
  }, {
    title_plural: 'Controls',
    model_singular: 'Control',
  }, {
    title_plural: 'Assessments',
    model_singular: 'Assessment',
  }, {
    title_plural: 'Cycles',
    model_singular: 'Cycle',
  }, {
    title_plural: 'Cycle Task Groups',
    model_singular: 'CycleTaskGroup',
  }, {
    title_plural: 'Cycle Task Group Object Tasks',
    model_singular: 'CycleTaskGroupObjectTask',
  }, {
    title_plural: 'Data Assets',
    model_singular: 'DataAsset',
  }, {
    title_plural: 'Facilities',
    model_singular: 'Facility',
  }, {
    title_plural: 'Issues',
    model_singular: 'Issue',
  }, {
    title_plural: 'Markets',
    model_singular: 'Market',
  }, {
    title_plural: 'Objectives',
    model_singular: 'Objective',
  }, {
    title_plural: 'Org Groups',
    model_singular: 'OrgGroup',
  }, {
    title_plural: 'People',
    model_singular: 'Person',
  }, {
    title_plural: 'Policies',
    model_singular: 'Policy',
  }, {
    title_plural: 'Processes',
    model_singular: 'Process',
  }, {
    title_plural: 'Products',
    model_singular: 'Product',
  }, {
    title_plural: 'Product Groups',
    model_singular: 'ProductGroup',
  }, {
    title_plural: 'Programs',
    model_singular: 'Program',
  }, {
    title_plural: 'Projects',
    model_singular: 'Project',
  }, {
    title_plural: 'Regulations',
    model_singular: 'Regulation',
  }, {
    title_plural: 'Requests',
    model_singular: 'Request',
  }, {
    title_plural: 'Risk Assessments',
    model_singular: 'RiskAssessment',
  }, {
    title_plural: 'Requirements',
    model_singular: 'Requirement',
  }, {
    title_plural: 'Standards',
    model_singular: 'Standard',
  }, {
    title_plural: 'Systems',
    model_singular: 'System',
  }, {
    title_plural: 'Metrics',
    model_singular: 'Metric',
  }, {
    title_plural: 'Technology Environments',
    model_singular: 'TechnologyEnvironment',
  }, {
    title_plural: 'Task Groups',
    model_singular: 'TaskGroup',
  }, {
    title_plural: 'Task Group Tasks',
    model_singular: 'TaskGroupTask',
  }, {
    title_plural: 'Vendors',
    model_singular: 'Vendor',
  }, {
    title_plural: 'Workflows',
    model_singular: 'Workflow',
  }],
  importable: [{
    title_plural: 'Audits',
    model_singular: 'Audit',
  }, {
    title_plural: 'Clauses',
    model_singular: 'Clause',
  }, {
    title_plural: 'Contracts',
    model_singular: 'Contract',
  }, {
    title_plural: 'Controls',
    model_singular: 'Control',
  }, {
    title_plural: 'Assessments',
    model_singular: 'Assessment',
  }, {
    title_plural: 'Data Assets',
    model_singular: 'DataAsset',
  }, {
    title_plural: 'Facilities',
    model_singular: 'Facility',
  }, {
    title_plural: 'Issues',
    model_singular: 'Issue',
  }, {
    title_plural: 'Markets',
    model_singular: 'Market',
  }, {
    title_plural: 'Objectives',
    model_singular: 'Objective',
  }, {
    title_plural: 'Org Groups',
    model_singular: 'OrgGroup',
  }, {
    title_plural: 'People',
    model_singular: 'Person',
  }, {
    title_plural: 'Policies',
    model_singular: 'Policy',
  }, {
    title_plural: 'Processes',
    model_singular: 'Process',
  }, {
    title_plural: 'Products',
    model_singular: 'Product',
  }, {
    title_plural: 'Product Groups',
    model_singular: 'ProductGroup',
  }, {
    title_plural: 'Programs',
    model_singular: 'Program',
  }, {
    title_plural: 'Projects',
    model_singular: 'Project',
  }, {
    title_plural: 'Regulations',
    model_singular: 'Regulation',
  }, {
    title_plural: 'Requests',
    model_singular: 'Request',
  }, {
    title_plural: 'Risk Assessments',
    model_singular: 'RiskAssessment',
  }, {
    title_plural: 'Requirements',
    model_singular: 'Requirement',
  }, {
    title_plural: 'Standards',
    model_singular: 'Standard',
  }, {
    title_plural: 'Systems',
    model_singular: 'System',
  }, {
    title_plural: 'Metrics',
    model_singular: 'Metric',
  }, {
    title_plural: 'Technology Environments',
    model_singular: 'TechnologyEnvironment',
  }, {
    title_plural: 'Task Groups',
    model_singular: 'TaskGroup',
  }, {
    title_plural: 'Task Group Tasks',
    model_singular: 'TaskGroupTask',
  }, {
    title_plural: 'Vendors',
    model_singular: 'Vendor',
  }, {
    title_plural: 'Workflows',
    model_singular: 'Workflow',
  }],
};
GGRC.custom_attr_defs = GGRC.custom_attr_defs || [];

GGRC.access_control_roles = GGRC.access_control_roles || [];
