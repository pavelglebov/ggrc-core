/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  isSnapshot,
} from '../../plugins/utils/snapshot-utils';
import Permission from '../../permission';

export default can.Component.extend({
  tag: 'related-people-access-control-group',
  leakScope: true,
  viewModel: {
    define: {
      canEdit: {
        get: function () {
          let instance = this.attr('instance');
          let canEdit = !this.attr('isReadonly') &&
            !isSnapshot(instance) &&
            !instance.attr('archived') &&
            !this.attr('readOnly') &&
            !this.attr('updatableGroupId') &&
            (this.attr('isNewInstance') ||
              this.attr('isProposal') ||
              Permission.is_allowed_for('update', instance));

          return canEdit;
        },
      },
      isLoading: {
        get: function () {
          return this.attr('updatableGroupId') ===
            this.attr('groupId');
        },
      },
      placeholder: {
        get: function () {
          return this.attr('singleUserRole') ?
            'Change person' : 'Add person';
        },
      },
    },
    instance: {},
    isNewInstance: false,
    groupId: '@',
    title: '@',
    singleUserRole: false,
    people: [],
    isDirty: false,
    required: false,
    backUpPeople: [],
    autoUpdate: false,
    updatableGroupId: null,
    readOnly: false,
    isProposal: false,

    changeEditableGroup: function (args) {
      if (args.editableMode) {
        this.attr('backUpPeople', this.attr('people').attr());
      } else {
        this.attr('isDirty', false);
        this.attr('people', this.attr('backUpPeople').attr());
      }
    },
    saveChanges: function () {
      if (this.attr('isDirty')) {
        this.attr('isDirty', false);
        this.dispatch({
          type: 'updateRoles',
          people: this.attr('people'),
          roleId: this.attr('groupId'),
          roleTitle: this.attr('title'),
        });
      }
    },
    personSelected: function (args) {
      this.addPerson(args.person, args.groupId);
    },
    addPerson: function (person, groupId) {
      let exist = _.find(this.attr('people'), {id: person.id});

      if (exist) {
        console.warn(
          `User "${person.id}" already has role "${groupId}" assigned`);
        return;
      }

      this.attr('isDirty', true);

      if (this.attr('singleUserRole')) {
        this.attr('people').replace(person);
      } else {
        this.attr('people').push(person);
      }

      if (this.attr('autoUpdate')) {
        this.saveChanges();
      }
    },
    removePerson: function (args) {
      let person = args.person;
      let idx = _.findIndex(
        this.attr('people'),
        {id: person.id});

      if (idx === -1) {
        console.warn(`User "${person.id}" does not present in "people" list`);
        return;
      }

      this.attr('isDirty', true);
      this.attr('people').splice(idx, 1);

      if (this.attr('autoUpdate')) {
        this.saveChanges();
      }
    },
  },
  events: {
    init: function ($element, options) {
      let vm = this.viewModel;
      vm.attr('backUpPeople', vm.attr('people').attr());
    },
  },
});
