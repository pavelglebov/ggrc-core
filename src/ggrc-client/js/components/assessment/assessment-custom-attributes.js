/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './info-pane/confirm-edit-action';
import template from './custom-attributes.mustache';

export default can.Component.extend({
  tag: 'assessment-custom-attributes',
  template,
  leakScope: true,
  viewModel: {
    items: [],
    editMode: false,
    modifiedFields: {},
    isEditDenied: false,
    updateGlobalAttribute: function (event, field) {
      this.attr('modifiedFields').attr(field.customAttributeId, event.value);
      this.dispatch({
        type: 'onUpdateAttributes',
        globalAttributes: this.attr('modifiedFields'),
      });
      this.attr('modifiedFields', {}, true);
    },
  },
});
