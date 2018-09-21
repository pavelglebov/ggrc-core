/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as TreeViewUtils from './tree-view-utils';
import {
  buildRelevantIdsQuery,
  batchRequests,
  buildParam,
} from './query-api-utils';
import {
  isSnapshotRelated,
  transformQuery,
} from './snapshot-utils';
import {
  isObjectVersion,
  getWidgetConfigs,
} from './object-versions-utils';
import Mappings from '../../models/mappers/mappings';
import {makeModelInstance} from './models-utils';
import PersistentNotifier from '../persistent_notifier';
import Person from '../../models/business-models/person';

/**
 * Util methods for work with Current Page.
 */

let relatedToCurrentInstance = new can.Map({
  define: {
    initialized: {
      type: 'boolean',
      value: false,
    },
  },
});

let widgetsCounts = new can.Map({});

let CUSTOM_COUNTERS = {
  MY_WORK: () => _getCurrentUser().getWidgetCountForMyWorkPage(),
  ALL_OBJECTS: () => _getCurrentUser().getWidgetCountForAllObjectPage(),
  // Audit: () => _getCurrentUser().getSnapshotsCount(),
  Audit: (widgets, type, id) => getAuditCounts(widgets, type, id),
};

function getPageInstance() {
  if (!GGRC._page_instance && GGRC.page_object) {
    GGRC._page_instance = makeModelInstance(GGRC.page_object);
  }
  return GGRC._page_instance;
}

function initMappedInstances() {
  let currentPageInstance = getPageInstance();
  let models = Mappings.getMappingList(currentPageInstance.type);
  let reqParams = [];

  relatedToCurrentInstance.attr('initialized', true);
  models = can.makeArray(models);

  models.forEach(function (model) {
    let query = buildRelevantIdsQuery(
      model,
      {},
      {
        type: currentPageInstance.type,
        id: currentPageInstance.id,
        operation: 'relevant',
      });
    if (isSnapshotRelated(currentPageInstance.type, model)) {
      query = transformQuery(query);
    }
    reqParams.push(batchRequests(query));
  });

  return can.when(...reqParams)
    .then(function () {
      let response = can.makeArray(arguments);

      models.forEach(function (model, idx) {
        let ids = response[idx][model] ?
          response[idx][model].ids :
          response[idx].Snapshot.ids;
        let map = ids.reduce(function (mapped, id) {
          mapped[id] = true;
          return mapped;
        }, {});
        relatedToCurrentInstance.attr(model, map);
      });
      return relatedToCurrentInstance;
    });
}

// To identify pages like My Work, My Assessments and Admin Dashboard on the Server-side
// was defined variable GGRC.pageType, because for all of them getPageInstance().type = 'Person'.
// For other pages using getPageInstance() object.
function getPageType() {
  return GGRC.pageType ? GGRC.pageType : getPageInstance().type;
}

function isMyAssessments() {
  return getPageType() === 'MY_ASSESSMENTS';
}

function isMyWork() {
  return getPageType() === 'MY_WORK';
}

function isAllObjects() {
  return getPageType() === 'ALL_OBJECTS';
}

function isAdmin() {
  return getPageType() === 'ADMIN';
}

/**
 *
 * @return {boolean} False for My Work, All Objects and My Assessments pages and True for the rest.
 */
function isObjectContextPage() {
  return !GGRC.pageType;
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
  widgetList = GGRC.WidgetList.get_widget_list_for(modelName);
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
    .filter((name) => widgetList[name].widgetType === 'treeview')
    .map((widgetName) => {
      return isObjectVersion(widgetName) ? widgetName :
        widgetList[widgetName].content_controller_options.model.shortName;
    });
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
  let result;

  // custom endpoint we use only in order to initialize counts for all tabs.
  // In order to update counter for individual tab need to use Query API
  if (widgets.length !== 1 && CUSTOM_COUNTERS[getPageType()]) {
    result = CUSTOM_COUNTERS[getPageType()](widgets, type, id);
  } else {
    result = _initWidgetCounts(widgets, type, id);
  }

  return result.then((counts) => {
    getCounts().attr(counts);
  });
}

let separateSnapshots = false;

let snapshotNames = [];

/**
 * Update Page Counts
 * @param {Array|Object} widgets - list of widgets
 * @param {String} type - Type of parent object
 * @param {Number} id - ID of parent object
 * @return {can.Deferred} - resolved deferred object
 */
function _initWidgetCounts(widgets, type, id) {
  snapshotNames = [];

  // Request params generation logic should be moved in
  // a separate place
  let widgetsObject = getWidgetConfigs(can.makeArray(widgets));

  let params = widgetsObject.map(function (widgetObject) {
    let param;
    let expression = TreeViewUtils
      .makeRelevantExpression(widgetObject.name, type, id);

    let snapshot = isSnapshotRelated(type, widgetObject.name) ||
      widgetObject.isObjectVersion;

    if (!separateSnapshots && snapshot) {
      param = buildParam('Snapshot', {}, expression, null,
        GGRC.query_parser.parse('child_type = ' + widgetObject.name));
    } else {
      param = buildParam(widgetObject.name,
        {}, expression, null,
        widgetObject.additionalFilter ?
          GGRC.query_parser.parse(widgetObject.additionalFilter) :
          null
      );
    }

    if (snapshot) {
      snapshotNames.push(widgetObject.name);
    }

    param.type = 'count';
    if (!separateSnapshots || !snapshot) {
      return batchRequests(param);
    }
    // return batchRequests(param);
  });

  params = _.compact(params);

  // Perform requests only if params are defined
  if (!params.length) {
    return can.Deferred().resolve();
  }

  return $.when(...params).then((...data) => {
    let countsMap = {};
    
    data.forEach(function (info, i) {
      let name;
      let widget;

      if (separateSnapshots) {
        name = Object.keys(info)[0];
        widget = _.find(widgetsObject, (obj) => {
          return obj.name === name;
        });
      }
      else {
        widget = widgetsObject[i];
        name = widget.name;
      }
      let countsName = widget.countsName || widget.name;

      if (!separateSnapshots) {
        if (isSnapshotRelated(type, name) || widget.isObjectVersion) {
          name = 'Snapshot';
        }
      }

      countsMap[countsName] = info[name].total;
    });
    return countsMap;
  });
}

function getAuditCounts(widgets, type, id) {
  let widgetCounts = _initWidgetCounts(widgets, type, id);
  let snapshotCounts = _getCurrentUser().getSnapshotsCount(id, {snapshot_types: snapshotNames});

  return Promise.all([widgetCounts, snapshotCounts]).then(function(values) {
    return Object.assign(values[0], values[1]);
  });
}

function refreshCounts() {
  let pageInstance = getPageInstance();
  let widgets;
  let location = window.location.pathname;

  if (!pageInstance) {
    return can.Deferred().resolve();
  }

  widgets = getWidgetModels(pageInstance.constructor.shortName, location);

  return initWidgetCounts(widgets, pageInstance.type, pageInstance.id);
}

function _getCurrentUser() {
  let userId = GGRC.current_user.id;

  return Person.findInCacheById(userId);
}

function initWidgets() {
  // Ensure each extension has had a chance to initialize widgets
  can.each(GGRC.extensions, function (extension) {
    if (extension.init_widgets) {
      extension.init_widgets();
    }
  });
}

function _onbeforeunload(evnt) {
  evnt = evnt || window.event;
  let message = 'There are operations in progress. ' +
  'Are you sure you want to leave the page?';

  if (evnt) {
    evnt.returnValue = message;
  }
  return message;
}

const notifier = new PersistentNotifier({
  while_queue_has_elements() {
    window.onbeforeunload = _onbeforeunload;
  },
  when_queue_empties() {
    window.onbeforeunload = $.noop;
  },
  name: 'GGRC/window',
});

const delayLeavingPageUntil = $.proxy(notifier, 'queue');

function navigate(url) {
  notifier.on_empty(_goToUrl.bind(null, url));
}

function _goToUrl(url) {
  if (!url) {
    window.location.reload();
  } else {
    window.location.assign(url);
  }
}

export {
  relatedToCurrentInstance as related,
  getPageInstance,
  initMappedInstances,
  getPageType,
  isMyAssessments,
  isMyWork,
  isAllObjects,
  isAdmin,
  isObjectContextPage,
  getWidgetList,
  getWidgetModels,
  getDefaultWidgets,
  getCounts,
  initWidgetCounts as initCounts,
  refreshCounts,
  initWidgets,
  navigate,
  delayLeavingPageUntil,
};
