/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as TreeViewUtils from './tree-view-utils';
import {
  batchRequests,
  buildParam,
} from './query-api-utils';
import {
  isSnapshotRelated,
  isSnapshotRelatedType,
  getSnapshotsCounts,
} from './snapshot-utils';
import {
  isObjectVersion,
  getObjectVersionConfig,
} from './object-versions-utils';
import {
  isMegaObjectRelated,
  getMegaObjectConfig,
} from './mega-object-utils';
import WidgetList from '../../modules/widget_list';
import {
  getPageType,
  getPageInstance,
} from './current-page-utils';
import QueryParser from '../../generated/ggrc_filter_query_parser';
import Person from '../../models/business-models/person';

let widgetsCounts = new can.Map({});
let cachedObjects = {};

let CUSTOM_COUNTERS = {
  MY_WORK: () => _getCurrentUser().getWidgetCountForMyWorkPage(),
  ALL_OBJECTS: () => _getCurrentUser().getWidgetCountForAllObjectPage(),
};

function _getCurrentUser() {
  let userId = GGRC.current_user.id;

  return Person.findInCacheById(userId);
}

const widgetModules = [];
function initWidgets() {
  // Ensure each extension has had a chance to initialize widgets
  widgetModules.forEach(function (module) {
    if (module.init_widgets) {
      module.init_widgets();
    }
  });
}

/**
 * Should return list of widgets required for rendering
 * @param {String} modelName - Page Object Model Name
 * @param {String} path - Application location path
 * @return {Object} - widget list object
 */
function getWidgetList(modelName, path) {
  let widgetList = {};
  let isAssessmentsView;

  if (!modelName) {
    return widgetList;
  }
  widgetList = WidgetList.get_widget_list_for(modelName);
  // Needs refactoring: Should be removed and replaced with Routing!!!
  isAssessmentsView = /^\/assessments_view/.test(path);

  // the assessments_view only needs the Assessments widget
  if (isAssessmentsView) {
    widgetList = {
      assessment: widgetList.Assessment,
    };
    widgetList.assessment.treeViewDepth = 0;
  }

  return widgetList;
}

function getWidgetModels(modelName, path) {
  const widgetList = getWidgetList(modelName, path);
  const defaults = getDefaultWidgets(widgetList, path);

  return defaults
    .filter((name) => widgetList[name].widgetType === 'treeview');
}

function getDefaultWidgets(widgetList, path) {
  let defaults = Object.keys(widgetList);
  // Needs refactoring: Should be removed and replaced with Routing!!!
  let isObjectBrowser = /^\/objectBrowser\/?$/.test(path);

  // Remove info tab from object-browser list of tabs
  if (isObjectBrowser) {
    defaults.splice(defaults.indexOf('info'), 1);
  }
  return defaults;
}

/**
 * Counts for related objects.
 *
 * @return {can.Map} Promise which return total count of objects.
 */
function getCounts() {
  return widgetsCounts;
}

function initWidgetCounts(widgets, type, id) {
  let resultsArray = [];

  let widgetConfigs = getWidgetConfigs(can.makeArray(widgets));

  // custom endpoint we use only in order to initialize counts for all tabs.
  // In order to update counter for individual tab need to use Query API
  if (widgets.length !== 1 && CUSTOM_COUNTERS[getPageType()]) {
    resultsArray.push(CUSTOM_COUNTERS[getPageType()](type, id));
  } else {
    resultsArray.push(_initWidgetCounts(widgetConfigs, type, id));
  }

  if (isSnapshotRelatedType(type)) {
    resultsArray.push(getSnapshotsCounts(widgetConfigs, getPageInstance()));
  }

  let baseCounts = widgets.reduce((result, val) => ({...result, [val]: 0}), {});

  return Promise.all(resultsArray).then((values) => {
    let combinedValue = _.chain(values)
      .compact()
      .reduce((sum, value) => {
        return Object.assign(sum, value);
      }, {})
      .value();

    combinedValue = Object.assign({}, baseCounts, combinedValue);

    if (!_.isEmpty(combinedValue)) {
      getCounts().attr(combinedValue);
    }
  });
}

/**
 * Update Page Counts
 * @param {Array|Object} widgets - list of widgets
 * @param {String} type - Type of parent object
 * @param {Number} id - ID of parent object
 * @return {$.Deferred} - resolved deferred object
 */
function _initWidgetCounts(widgets, type, id) {
  // Request params generation logic should be moved in
  // a separate place

  // exclude snapshot related widgets
  let widgetsObject = widgets.filter((widget) => {
    return !isSnapshotRelated(type, widget.name) &&
      !widget.isObjectVersion;
  });

  let params = [];
  _.each(widgetsObject, function (widgetObject) {
    let expression = TreeViewUtils.makeRelevantExpression(
      widgetObject.name,
      type,
      id,
      widgetObject.relation,
    );

    let param = buildParam(widgetObject.name,
      {}, expression, null,
      widgetObject.additionalFilter ?
        QueryParser.parse(widgetObject.additionalFilter) :
        null
    );

    param.type = 'count';
    params.push(batchRequests(param));
  });

  // Perform requests only if params are defined
  if (!params.length) {
    return $.Deferred().resolve();
  }

  return $.when(...params).then((...data) => {
    let countsMap = {};
    data.forEach(function (info, i) {
      let widget = widgetsObject[i];
      let name = widget.name;
      let countsName = widget.countsName || name;

      countsMap[countsName] = info[name].total;
    });
    return countsMap;
  });
}

function refreshCounts() {
  let pageInstance = getPageInstance();
  let widgets;
  let location = window.location.pathname;

  if (!pageInstance) {
    return $.Deferred().resolve();
  }

  widgets = getWidgetModels(pageInstance.constructor.model_singular, location);

  return initWidgetCounts(widgets, pageInstance.type, pageInstance.id);
}

function getWidgetConfigs(modelNames) {
  let configs = modelNames.map(function (modelName) {
    return getWidgetConfig(modelName);
  });
  return configs;
}

function getWidgetConfig(modelName) {
  let config = {};
  let originalModelName;
  let configObject;
  let objectVersion;

  // Workflow approach
  if (_.isObject(modelName)) {
    modelName.widgetName = modelName.name;
    modelName.widgetId = modelName.name;
    return modelName;
  }

  if (cachedObjects[modelName]) {
    return cachedObjects[modelName];
  }

  if (isObjectVersion(modelName)) {
    config = getObjectVersionConfig(modelName);
  } else if (isMegaObjectRelated(modelName)) {
    config = getMegaObjectConfig(modelName);
  }

  objectVersion = config.isObjectVersion;
  originalModelName = config.originalModelName || modelName;

  configObject = {
    name: originalModelName,
    widgetId: config.widgetId || modelName,
    widgetName: config.widgetName || modelName,
    countsName: modelName,
    isObjectVersion: objectVersion,
    relation: config.relation,
    isMegaObject: config.isMegaObject,
  };

  cachedObjects[modelName] = configObject;
  return configObject;
}

export {
  getWidgetList,
  getWidgetModels,
  getDefaultWidgets,
  getCounts,
  initWidgetCounts as initCounts,
  refreshCounts,
  widgetModules,
  initWidgets,
  getWidgetConfig,
  getWidgetConfigs,
};
