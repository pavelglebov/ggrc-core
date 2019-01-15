/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './gca-controls.mustache';
import '../custom-attributes/custom-attributes-field';
import {CUSTOM_ATTRIBUTE_TYPE} from '../../plugins/utils/custom-attribute/custom-attribute-config';
import {CONTROL_TYPE} from './../../plugins/utils/control-utils';

const errorMessages = {
  [CONTROL_TYPE.CHECKBOX]: 'this checkbox is required',
  any: 'cannot be blank',
};

/**
 * This component renders edit controls for Global Custom Attributes
 */

export default can.Component.extend({
  tag: 'gca-controls',
  template,
  leakScope: true,
  viewModel: {
    instance: {},
    items: [],
    allowHide: false,
    validateControls: function () {
      const items = this.attr('items');
      let valid;
      items.each((caObject) => caObject.validate());

      valid = _.find(items, (caObject) =>
        caObject.validationState.hasGCAErrors
      ) === undefined;
      this.instance.attr('_gca_valid', valid);
    },
    initGlobalAttributes: function () {
      const instance = this.attr('instance');
      const globalCaObjects = instance.customAttr({
        type: CUSTOM_ATTRIBUTE_TYPE.GLOBAL,
      });
      this.attr('items', globalCaObjects);
    },
    updateGlobalAttribute: function (event) {
      const instance = this.attr('instance');
      const {
        fieldId: caId,
        value: caValue,
      } = event;

      instance.customAttr(caId, caValue);
      this.validateControls();
    },
  },
  helpers: {
    errorMessage(type) {
      type = Mustache.resolve(type);
      return errorMessages[type] || errorMessages.any;
    },
    isHidable(item, options) {
      const hidable = (this.attr('allowHide') && !item.mandatory);
      return hidable
        ? options.fn()
        : options.inverse();
    },
  },
  init: function () {
    if (!this.viewModel.attr('items').length) {
      this.viewModel.initGlobalAttributes();
    }

    this.viewModel.validateControls();
  },
});
