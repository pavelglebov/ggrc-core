/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import '../redirects/proposable-control/proposable-control';
import '../redirects/external-control/external-control';
import '../redirects/role-attr-names-provider/role-attr-names-provider';
import template from './editable-people-group-header.stache';

export default canComponent.extend({
  tag: 'editable-people-group-header',
  view: canStache(template),
  leakScope: true,
  viewModel: canMap.extend({
    define: {
      peopleCount: {
        get: function () {
          return this.attr('people.length');
        },
      },
      showEditToolbar: {
        get() {
          return (
            this.attr('canEdit') &&
            !this.attr('editableMode')
          );
        },
      },
    },
    singleUserRole: false,
    editableMode: false,
    isLoading: false,
    canEdit: true,
    required: false,
    redirectionEnabled: false,
    people: [],
    title: '',
    openEditMode: function () {
      this.dispatch('editPeopleGroup');
    },
  }),
});
