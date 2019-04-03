/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  buildRelevantIdsQuery,
  batchRequests,
} from './query-api-utils';
import {
  isSnapshotRelated,
  transformQuery,
} from './snapshot-utils';
import Mappings from '../../models/mappers/mappings';
import {inferObjectType} from './models-utils';
import PersistentNotifier from '../persistent-notifier';
import {changeUrl, reloadPage} from '../../router';
import {
  getRelatedModelNames,
  isMegaObjectRelated,
  transformQueryForMega,
  getMegaObjectRelation,
} from '../../plugins/utils/mega-object-utils';

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

function getPageModel() {
  if (GGRC.page_object) {
    return inferObjectType(GGRC.page_object);
  }
  return null;
}

let pageInstance = null;
function getPageInstance() {
  if (!pageInstance && GGRC.page_object) {
    pageInstance = inferObjectType(GGRC.page_object)
      .model($.extend({}, GGRC.page_object));
  }
  return pageInstance;
}

function initMappedInstances() {
  let currentPageInstance = getPageInstance();
  let models = Mappings.getMappingList(currentPageInstance.type);
  let reqParams = [];

  if (currentPageInstance.class.isMegaObject) {
    models = models.concat(getRelatedModelNames(currentPageInstance.type));
    const selfInd = models.indexOf(currentPageInstance.type);
    if (selfInd > -1) {
      models.splice(selfInd, 1);
    }
  }

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
    } else if (isMegaObjectRelated(model)) {
      query = transformQueryForMega(query);
    }
    reqParams.push(batchRequests(query));
  });

  return $.when(...reqParams)
    .then(function () {
      let response = can.makeArray(arguments);

      models.forEach(function (model, idx) {
        if (isMegaObjectRelated(model)) {
          const relation = getMegaObjectRelation(model);
          model = relation.source;
        }

        let ids = response[idx][model] ?
          response[idx][model].ids :
          response[idx].Snapshot.ids;
        let map = ids.reduce(function (mapped, id) {
          mapped[id] = true;
          return mapped;
        }, {});

        if (relatedToCurrentInstance.attr(model)) {
          const extended = $.extend(relatedToCurrentInstance.attr(model), map);
          relatedToCurrentInstance.attr(model, extended);
        } else {
          relatedToCurrentInstance.attr(model, map);
        }
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

function _beforeUnloadHandler(event) {
  event.preventDefault();
  event.returnValue = '';
}

const notifier = new PersistentNotifier({
  whileQueueHasElements() {
    window.addEventListener('beforeunload', _beforeUnloadHandler);
  },
  whenQueueEmpties() {
    window.removeEventListener('beforeunload', _beforeUnloadHandler);
  },
});

const delayLeavingPageUntil = $.proxy(notifier, 'queue');

function navigate(url) {
  notifier.onEmpty(_goToUrl.bind(null, url));
}

function _goToUrl(url) {
  if (!url) {
    reloadPage();
  } else {
    changeUrl(url);
  }
}

export {
  relatedToCurrentInstance as related,
  getPageModel,
  getPageInstance,
  initMappedInstances,
  getPageType,
  isMyAssessments,
  isMyWork,
  isAllObjects,
  isAdmin,
  isObjectContextPage,
  navigate,
  delayLeavingPageUntil,
};
