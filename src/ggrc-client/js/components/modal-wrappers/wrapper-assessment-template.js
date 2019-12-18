/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canMap from 'can-map';
import canComponent from 'can-component';
import {scopingObjects} from '../../plugins/models-types-collections';

const peopleTitlesList = [
  'Auditors', 'Principal Assignees', 'Secondary Assignees',
  'Primary Contacts', 'Secondary Contacts', 'Control Operators',
  'Control Owners', 'Risk Owners',
];
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
  Risk: [
    {value: 'Admin', title: 'Object Admins'},
    {value: 'Audit Lead', title: 'Audit Captain'},
    {value: 'Auditors', title: 'Auditors'},
    {value: 'Principal Assignees', title: 'Principal Assignees'},
    {value: 'Secondary Assignees', title: 'Secondary Assignees'},
    {value: 'Risk Owners', title: 'Risk Owners'},
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

export default canComponent.extend({
  tag: 'wrapper-assessment-template',
  leakScope: true,
  viewModel: canMap.extend({
    instance: {},
    define: {
      showCaptainAlert: {
        type: Boolean,
        value: false,
        get() {
          return peopleTitlesList
            .includes(this.attr('instance.default_people.assignees'));
        },
      },
      peopleValues: {
        get() {
          const objectType = scopingObjects.includes(
            this.attr('instance.template_object_type')
          ) ? 'scope' : this.attr('instance.template_object_type');

          const options = PEOPLE_VALUES_OPTIONS[objectType];

          return options ? options : PEOPLE_VALUES_OPTIONS['defaults'];
        },
      },
      defaultAssigneeLabel: {
        type: String,
        get() {
          let labels = this.attr('instance.DEFAULT_PEOPLE_LABELS');
          let assignee = this.attr('instance.default_people.assignees');
          return labels[assignee];
        },
      },
      defaultVerifierLabel: {
        type: String,
        get() {
          let labels = this.attr('instance.DEFAULT_PEOPLE_LABELS');
          let verifiers = this.attr('instance.default_people.verifiers');
          return labels[verifiers];
        },
      },
    },
  }),
});
