/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as businessModels from '../../models/business-models';

/**
 * Util methods for work with Mega Object.
 */

/**
 * Compose mega object specific widget names,
 * e.g. ['Program_child', 'Program_parent']
 * @param {String} widgetName - widget name
 * @return {Array} Array of related widget names
 */
function getRelatedModelNames(widgetName) {
  return [widgetName + '_child', widgetName + '_parent'];
}

/**
 * Check if widget name has relation to Mega object
 * @param {String} widgetName - widget name
 * @return {Boolean} True or False
 */
function isMegaObjectRelated(widgetName) {
  return widgetName && typeof widgetName === 'string' ?
    (widgetName.indexOf('_child') > -1 || widgetName.indexOf('_parent') > -1) :
    false;
}

/**
 * Check if mapping between models is mega mapping
 * @param {String} model1 - First model
 * @param {String} model2 - Second model
 * @return {Boolean} True or False
 */
function isMegaMapping(model1, model2) {
  return model1 === model2 && businessModels[model1].isMegaObject;
}

/**
 * Config for mega object
 * @param {String} modelName - model name
 * @return {Object} config
 */
function getMegaObjectConfig(modelName) {
  let originalModelName;
  let postfix;

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

/**
 * Get relation to mega object (child or parent)
 * @param {String} modelName - name of a model
 * @return {Object} Source model and relation
 */
function getMegaObjectRelation(modelName) {
  if (!isMegaObjectRelated(modelName)) return false;

  const parts = modelName.split('_');
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
      };
    }

    if (query.fields && (query.fields.indexOf('is_mega') === -1)) {
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
