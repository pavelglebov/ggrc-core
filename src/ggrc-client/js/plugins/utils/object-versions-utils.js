/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as businessModels from '../../models/business-models';

/**
   * Util methods for work with Object versions.
   */
// let cachedObjects = {};
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

function getObjectVersionConfig(modelName, forceBuildFromOriginal) {
  let originalModelName;
  let objectVersion = {};
  if (!forceBuildFromOriginal) {
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

  return {
    originalModelName: modelName,
    widgetId: modelName + '_version',
    widgetName: businessModels[modelName].title_plural +
      ' Versions',
  };
}

// function getWidgetConfig(modelName, buildVersionFromOriginal) {
//   let config;
//   let isObjectVersion;
//   let originalModelName;
//   let configObject;

//   // Workflow approach
//   if (_.isObject(modelName)) {
//     modelName.widgetName = modelName.name;
//     modelName.widgetId = modelName.name;
//     return modelName;
//   }

//   if (cachedObjects[modelName]) {
//     return cachedObjects[modelName];
//   }

//   config = _getObjectVersionConfig(modelName, buildVersionFromOriginal);
//   isObjectVersion = !!config.originalModelName;
//   originalModelName = config.originalModelName || modelName;

//   configObject = {
//     name: originalModelName,
//     widgetId: config.widgetId || modelName,
//     widgetName: config.widgetName || modelName,
//     countsName: modelName,
//     isObjectVersion: isObjectVersion,
//   };

//   cachedObjects.modelName = configObject;
//   return configObject;
// }

// function getWidgetConfigs(modelNames) {
//   let configs = modelNames.map(function (modelName) {
//     return getWidgetConfig(modelName);
//   });
//   return configs;
// }

export {
  isObjectVersion,
  parentHasObjectVersions,
  getObjectVersionConfig,
  // getWidgetConfig,
  // getWidgetConfigs,
};
