/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as businessModels from '../../models/business-models';

function getRelatedModelNames(widgetName) {
  return [widgetName + '_child', widgetName + '_parent'];
}

function isMegaObjectRelated(widgetName) {
  return widgetName && typeof widgetName === 'string' ?
    (widgetName.indexOf('_child') > -1 || widgetName.indexOf('_parent') > -1) :
    false;
}

function isMegaMapping(obj1, obj2) {
  return obj1 === obj2 && businessModels[obj1].isMegaObject;
}

function getMegaObjectConfig(modelName) {
  let originalModelName,
      postfix;

  [originalModelName, postfix] = modelName.split('_');

  return {
    name: originalModelName,
    originalModelName: originalModelName,
    widgetId: modelName,
    widgetName: postfix.charAt(0).toUpperCase() + postfix.slice(1) + ' '
      + businessModels[originalModelName].title_plural,
    isMegaObject: true,
  };
}

function getMegaObjectRelation(widgetName) {
  if (!isMegaObjectRelated(widgetName)) return false;

  const parts = widgetName.split('_');
  if (parts && parts.length > 1) {
    return {
      source: parts[0],
      relation: parts[parts.length - 1],
    };
  }
}

/**
 * Transform query for objects into query for mega object
 * @param {Object} query - original query
 * @return {Object} The transformed query
 */
function transformQueryForMega(query) {
  let expression = query.filters.expression;
  const relation = getMegaObjectRelation(query.object_name);

  if (relation) {
    query.object_name = relation.source;

    if (expression) {
      expression.op = {
        name: relation.relation,
      }
    }

    if (query.fields && query.fields.indexOf('is_mega') == -1) {
      query.fields = query.fields.concat(['is_mega']);
    }
  }
  return query;
}

export {
  getRelatedModelNames,
  isMegaObjectRelated,
  isMegaMapping,
  getMegaObjectConfig,
  getMegaObjectRelation,
  transformQueryForMega,
};
