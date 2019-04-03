/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as businessModels from '../../models/business-models';

/**
   * Util methods for work with Object versions.
   */
let modelsIncludeVersions = [
  'Issue',
];

/**
 * Check provided model name.
 * Returns true if model name contains '_version'
 * @param {String} modelName - model to check
 * @return {Boolean} True or False
 */
function isObjectVersion(modelName) {
  return modelName && typeof modelName === 'string' ?
    modelName.indexOf('_version') > -1 :
    false;
}

/**
 * Check provided parent model name.
 * Returns true if parent model has object versions tabs
 * @param {String} parentModelName - parent model to check
 * @return {Boolean} True or False
 */
function parentHasObjectVersions(parentModelName) {
  return modelsIncludeVersions.indexOf(parentModelName) > -1;
}

function getObjectVersionConfig(modelName) {
  let originalModelName;
  let objectVersion = {};

  if (!isObjectVersion(modelName)) {
    return objectVersion;
  }
  originalModelName = modelName.split('_')[0];

  return {
    originalModelName: originalModelName,
    isObjectVersion: !!originalModelName,
    widgetId: modelName,
    widgetName: businessModels[originalModelName].title_plural +
      ' Versions',
  };
}

export {
  isObjectVersion,
  parentHasObjectVersions,
  getObjectVersionConfig,
};
