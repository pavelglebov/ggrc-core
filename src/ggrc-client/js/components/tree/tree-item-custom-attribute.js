/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/tree-item-custom-attribute.mustache';
import {CONTROL_TYPE} from '../../plugins/utils/control-utils';
import {formatDate} from '../../plugins/utils/date-utils';

const formatValueMap = {
  [CONTROL_TYPE.CHECKBOX](caObject) {
    return caObject.value ? 'Yes' : 'No';
  },
  [CONTROL_TYPE.DATE](caObject) {
    const date = caObject.value === ''
      ? null
      : caObject.value;

    return formatDate(date, true);
  },
  [CONTROL_TYPE.PERSON](caObject, options) {
    const attr = caObject.attributeObject;
    return options.fn(options.contexts.add({
      object: attr ?
        attr.reify() :
        null,
    }));
  },
};

/*
  Used to get the string value for custom attributes
*/
const getCustomAttrValue = (instance, customAttributeId, options) => {
  let caObject;
  let hasHandler = false;
  let customAttrValue = null;
  instance = Mustache.resolve(instance);
  customAttributeId = Mustache.resolve(customAttributeId);
  caObject = instance.customAttr(customAttributeId);

  if (caObject) {
    hasHandler = _.has(formatValueMap, caObject.attributeType);
    customAttrValue = caObject.value;
  }

  if (hasHandler) {
    const handler = formatValueMap[caObject.attributeType];
    customAttrValue = handler(caObject, options);
  }

  return customAttrValue || '';
};

export const viewModel = can.Map.extend({
  instance: null,
  customAttributeId: null,
});

export const helpers = {
  getCustomAttrValue,
};

export default can.Component.extend({
  tag: 'tree-item-custom-attribute',
  template,
  leakScope: true,
  viewModel,
  helpers,
});
