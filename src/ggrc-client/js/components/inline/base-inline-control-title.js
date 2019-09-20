/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import '../redirects/proposable-control/proposable-control';
import '../redirects/external-control/external-control';
import template from './base-inline-control-title.stache';

export default canComponent.extend({
  tag: 'base-inline-control-title',
  view: canStache(template),
  leakScope: false,
  viewModel: canMap.extend({
    define: {
      isEditIconAllowed: {
        get: function () {
          return !this.attr('editMode') &&
            !this.attr('isLoading') &&
            !this.attr('isEditIconDenied');
        },
      },
    },
    instance: null,
    title: '',
    isLoading: false,
    editMode: false,
    isEditIconDenied: false,
    redirectionEnabled: false,
    redirectionAttrName: '',
  }),
  events: {
    '.inline-edit-icon click': function () {
      this.viewModel.dispatch('setEditModeInline');
    },
  },
});
