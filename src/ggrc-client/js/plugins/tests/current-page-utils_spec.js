/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {makeFakeInstance} from '../../../js_specs/spec_helpers';
import * as TreeViewUtils from '../utils/tree-view-utils';
import * as SnapshotUtils from '../utils/snapshot-utils';
import * as CurrentPageUtils from '../utils/current-page-utils';
import * as QueryAPI from '../utils/query-api-utils';
import Mappings from '../../models/mappers/mappings';
import Audit from '../../models/business-models/audit';

describe('GGRC Utils CurrentPage', function () {
  let pageType;
  let pageInstance;

  beforeAll(() => {
    pageInstance = GGRC._page_instance;
    pageType = GGRC.pageType;
  });

  afterAll(function () {
    GGRC.pageType = pageType;
    GGRC._page_instance = pageInstance;
  });

  beforeEach(function () {
    GGRC.pageType = undefined;
    GGRC._page_instance = makeFakeInstance({model: Audit})({
      id: 1,
      type: 'Audit',
    });
  });
  describe('getPageType() method', function () {
    let method;

    beforeEach(function () {
      method = CurrentPageUtils.getPageType;
    });

    it('returns pageType value if it defined', function () {
      GGRC.pageType = 'MOCK_PAGE';
      expect(method()).toEqual('MOCK_PAGE');
    });

    it('returns page instance type if pageType not defined', function () {
      expect(method()).toEqual('Audit');
    });
  });

  describe('isMyAssessments() method', function () {
    let method;

    beforeEach(function () {
      method = CurrentPageUtils.isMyAssessments;
    });

    it('returns True for GGRC.pageType = MY_ASSESSMENTS', function () {
      GGRC.pageType = 'MY_ASSESSMENTS';
      expect(method()).toBeTruthy();
    });

    it('returns False if pageType not defined', function () {
      expect(method()).toBeFalsy();
    });

    it('returns False if GGRC.pageType not equal MY_ASSESSMENTS', function () {
      GGRC.pageType = 'FOO_BAR';
      expect(method()).toBeFalsy();
    });
  });

  describe('isMyWork() method', function () {
    let method;

    beforeEach(function () {
      method = CurrentPageUtils.isMyWork;
    });

    it('returns True for GGRC.pageType = MY_WORK', function () {
      GGRC.pageType = 'MY_WORK';
      expect(method()).toBeTruthy();
    });

    it('returns False if pageType not defined', function () {
      expect(method()).toBeFalsy();
    });

    it('returns False if GGRC.pageType not equal MY_WORK', function () {
      GGRC.pageType = 'FOO_BAR_BAR';
      expect(method()).toBeFalsy();
    });
  });

  describe('isAdmin() method', function () {
    let method;

    beforeEach(function () {
      method = CurrentPageUtils.isAdmin;
    });

    it('returns True for GGRC.pageType = ADMIN', function () {
      GGRC.pageType = 'ADMIN';
      expect(method()).toBeTruthy();
    });

    it('returns False if pageType not defined', function () {
      expect(method()).toBeFalsy();
    });

    it('returns False if GGRC.pageType not equal ADMIN', function () {
      GGRC.pageType = 'FOO_BAR_BAZ';
      expect(method()).toBeFalsy();
    });
  });

  describe('isObjectContextPage() method', function () {
    let method;

    beforeEach(function () {
      method = CurrentPageUtils.isObjectContextPage;
    });

    it('returns True if pageType not defined', function () {
      expect(method()).toBeTruthy();
    });

    it('returns False if pageType defined', function () {
      GGRC.pageType = 'ADMIN';
      expect(method()).toBeFalsy();
    });
  });

  describe('getWidgetList() method', function () {
    let method;

    beforeEach(function () {
      spyOn(GGRC.WidgetList, 'get_widget_list_for')
        .and.returnValue({
          control: {},
          Assessment: {},
          objective: {},
        });
      method = CurrentPageUtils.getWidgetList;
    });

    it('returns an empty object when model is not provided', function () {
      let result = method('', 'assessments_view');

      expect(result.assessment).toBeUndefined();
    });

    it('returns assessments widget for assessment view', function () {
      let result = method('assessment', '/assessments_view');
      let keys = Object.keys(result);

      expect(keys.length).toEqual(1);
      expect(keys).toContain('assessment');
    });

    it('returns widgets for non-assessment view', function () {
      let result = method('assessment', '/controls_view');
      let keys = Object.keys(result);

      expect(keys.length).toEqual(3);
    });
  });

  describe('getDefaultWidgets() method', function () {
    let method;

    beforeEach(function () {
      method = CurrentPageUtils.getDefaultWidgets;
    });

    it('should return "Info" widget for non-object browser path', function () {
      let result = method({
        control: {},
        assessment: {},
        objective: {},
        info: {},
      }, '/assessments_view');

      expect(result).toContain('info');
    });

    it('should return "Info" widget for non-object browser path', function () {
      let result = method({
        control: {},
        assessment: {},
        objective: {},
        info: {},
      }, '/objectBrowser/');

      expect(result).not.toContain('info');
    });
  });

  describe('getWidgetModels() method', function () {
    let method;

    beforeEach(function () {
      spyOn(GGRC.WidgetList, 'get_widget_list_for')
        .and.returnValue({
          control: {
            widgetType: 'treeview',
            content_controller_options: {
              model: {
                shortName: 'Control',
              },
            },
          },
          Assessment: {
            widgetType: 'treeview',
            content_controller_options: {
              model: {
                shortName: 'Assessment',
              },
            },
          },
          objective: {
            widgetType: 'treeview',
            content_controller_options: {
              model: {
                shortName: 'Objective',
              },
            },
          },
          info: {
            content_controller_options: {
              model: {
                shortName: 'Info',
              },
            },
          },
        });
      method = CurrentPageUtils.getWidgetModels;
    });

    it('returns an empty array when model is not provided', function () {
      let result = method('', 'assessments_view');

      expect(result.length).toEqual(0);
    });

    it('returns assessment model name only for assessment view', function () {
      let result = method('assessment', '/assessments_view');

      expect(result).toContain('Assessment');
    });

    it('returns appropriate models for non-assessment view',
      function () {
        let result = method('assessment', '/controls_view');

        expect(result).toContain('Assessment');
        expect(result).toContain('Control');
        expect(result).toContain('Objective');
        expect(result.length).toEqual(3);
      });

    it('returns non-info models for object browser view',
      function () {
        let result = method('assessment', '/objectBrowser/');

        expect(result).toContain('Assessment');
        expect(result).toContain('Control');
        expect(result).toContain('Objective');
        expect(result).not.toContain('Info');
      });
  });

  describe('initCounts() method', function () {
    let method;
    let queryDfd;
    let getCounts;
    let snapshotCountsDfd;
    let id = 1;

    beforeEach(function () {
      queryDfd = can.Deferred();
      snapshotCountsDfd = can.Deferred();
      method = CurrentPageUtils.initCounts;
      getCounts = CurrentPageUtils.getCounts;

      spyOn(TreeViewUtils, 'makeRelevantExpression')
        .and.returnValue({
          type: 'Assessment',
          id: id,
          operation: 'owned',
        });
      spyOn(SnapshotUtils, 'isSnapshotRelated')
        .and.callFake(function (type, widgetType) {
          return widgetType === 'Control';
        });
      spyOn(QueryAPI, 'buildParam')
        .and.callFake(function (objName) {
          return {
            objectName: objName,
          };
        });

      spyOn(GGRC.query_parser, 'parse')
        .and.returnValue({});

      spyOn(QueryAPI, 'batchRequests');

      spyOn($.when, 'apply')
        .and.returnValue(queryDfd);

      spyOn(SnapshotUtils, 'getSnapshotsCounts')
        .and.returnValue(snapshotCountsDfd);
    });

    it('should not make request when no widget was provided', function () {
      method([], 'Control', 1);

      expect(QueryAPI.batchRequests).not.toHaveBeenCalled();
    });

    it('should init counts for snapshotable objects', async function (done) {
      let result;

      queryDfd.resolve();
      snapshotCountsDfd.resolve({
        Control: 11,
      });

      await method(['Control'], 'Assessment', 1);

      result = getCounts();
      expect(result.Control).toEqual(11);
      done();
    });

    it('should init counts for non-snapshotable objects',
      async function (done) {
        let result;

        queryDfd.resolve({
          Assessment: {
            total: 10,
          },
        });
        snapshotCountsDfd.resolve({});

        await method(['Assessment'], 'Control', 1);

        expect(QueryAPI.batchRequests)
          .toHaveBeenCalledWith({
            type: 'count',
            objectName: 'Assessment',
          }
          );

        result = getCounts();

        expect(result.Assessment).toEqual(10);

        done();
      });

    it('should init counts for virtual objects', async function () {
      let result;

      queryDfd.resolve({
        Cycle: {
          total: 10,
        },
      });
      snapshotCountsDfd.resolve({});

      await method([{
        name: 'Cycle',
        countsName: 'ActiveCycle',
      }], 'Control', 1);

      expect(QueryAPI.batchRequests)
        .toHaveBeenCalledWith({
          type: 'count',
          objectName: 'Cycle',
        });

      result = getCounts();

      expect(result.ActiveCycle).toEqual(10);
    });
  });

  describe('initMappedInstances() method', function () {
    let requestDfds = [];
    let method;

    beforeEach(function () {
      let requestDfd;

      spyOn(QueryAPI, 'buildRelevantIdsQuery')
        .and.callFake(function (objName, page, relevant, additionalFilter) {
          return {
            model: objName,
            operation: 'relevant',
          };
        });

      spyOn(SnapshotUtils, 'isSnapshotRelated')
        .and.callFake(function (parent, child) {
          return child === 'Control';
        });

      spyOn(SnapshotUtils, 'transformQuery')
        .and.callFake(function (query) {
          return query;
        });

      spyOn(QueryAPI, 'batchRequests')
        .and.callFake(function () {
          requestDfd = can.Deferred();
          requestDfds.push(requestDfd);
          return requestDfd;
        });
      method = CurrentPageUtils.initMappedInstances;
    });

    it('should init mappings for snapshotable objects',
      function (done) {
        let snapshotIds = [1, 2, 3];

        function validateResult(result) {
          snapshotIds.forEach(function (id) {
            expect(result.Control[id]).toBeTruthy();
          });
          done();
        }

        spyOn(Mappings, 'getMappingList')
          .and.returnValue(['Control']);

        method().then(validateResult);
        requestDfds.forEach(function (dfd) {
          dfd.resolve({
            Snapshot: {
              ids: snapshotIds,
            },
          });
        });
      });

    it('should init mappings for non-snapshotable objects',
      function (done) {
        let nonSnapshotIds = [4, 5, 6];

        function validateResult(result) {
          nonSnapshotIds.forEach(function (id) {
            expect(result.Assessment[id]).toBeTruthy();
          });

          done();
        }

        spyOn(Mappings, 'getMappingList')
          .and.returnValue(['Assessment']);

        method().then(validateResult);
        requestDfds.forEach(function (dfd) {
          dfd.resolve({
            Assessment: {
              ids: nonSnapshotIds,
            },
          });
        });
      });
  });

  describe('refreshCounts() method', function () {
    let widgets;
    let refreshCounts;
    let countsMap;

    beforeEach(function () {
      refreshCounts = CurrentPageUtils.refreshCounts;
      countsMap = CurrentPageUtils.getCounts();

      widgets =
        {
          Program: {
            widgetType: 'treeview',
            content_controller_options: {
              model: {
                shortName: 'Program',
              },
            },
          },
          Assessment: {
            widgetType: 'treeview',
            content_controller_options: {
              model: {
                shortName: 'Assessment',
              },
            },
          },
          Audit: {
            widgetType: 'treeview',
            content_controller_options: {
              model: {
                shortName: 'Audit',
              },
            },
          },
        };

      spyOn(GGRC.WidgetList, 'get_widget_list_for')
        .and.returnValue(widgets);

      spyOn(can, 'ajax')
        .and.returnValues(
          can.Deferred().resolve(
            [
              {Program: {count: 0, total: 0}, selfLink: null},
              {Assessment: {count: 0, total: 0}, selfLink: null},
              {Audit: {count: 3, total: 4}, selfLink: null},
            ]));
    });

    it('should reinit counts', function (done) {
      refreshCounts()
        .then(function (counts) {
          let reqParams;
          let reqParamNames;

          expect(can.ajax.calls.count()).toEqual(1);
          reqParams = JSON.parse(can.ajax.calls.argsFor(0)[0].data);
          reqParamNames = _.map(reqParams,
            function (param) {
              return param.object_name;
            });
          expect(reqParams.length).toEqual(3);
          expect(reqParamNames).toContain('Program');
          expect(reqParamNames).toContain('Assessment');
          expect(reqParamNames).toContain('Audit');
          expect(countsMap.attr('Audit')).toEqual(4);
          expect(countsMap.attr('Program')).toEqual(0);
          done();
        });
    });
  });
});
