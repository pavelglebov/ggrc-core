/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../related-objects/related-people-access-control';
import '../related-objects/related-people-access-control-group';
import '../people/deletable-people-group';
import '../autocomplete/autocomplete';
import '../external-data-autocomplete/external-data-autocomplete';
import template from './templates/custom-roles-modal.mustache';

export default can.Component.extend({
  tag: 'custom-roles-modal',
  template,
  leakScope: true,
  viewModel: {
    instance: {},
    updatableGroupId: null,
    isNewInstance: false,
    conflictRoles: [],
    orderOfRoles: [],
    isProposal: false,
    includeRoles: [],
    excludeRoles: [],
    readOnly: false,
    showGroupTooltip: false,
    groupTooltip: null,
  },
});
