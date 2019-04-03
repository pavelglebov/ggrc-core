/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/
import './mapper-results-item';
import './mapper-results-items-header';
import './mapper-results-columns-configuration';
import '../related-objects/related-assessments';
import '../object-list/object-list';
import '../object-selection/object-selection';
import '../mega-relation-selection-item/mega-relation-selection-item';
import '../tree_pagination/tree_pagination';
import template from './templates/mapper-results.stache';
import * as StateUtils from '../../plugins/utils/state-utils';
import * as TreeViewUtils from '../../plugins/utils/tree-view-utils';
import {
  transformQuery,
  toObject,
} from '../../plugins/utils/snapshot-utils';
import {
  buildRelevantIdsQuery,
  buildParam,
  batchRequests,
} from '../../plugins/utils/query-api-utils';
import * as AdvancedSearch from '../../plugins/utils/advanced-search-utils';
import Pagination from '../base-objects/pagination';
import tracker from '../../tracker';
import Snapshot from '../../models/service-models/snapshot';
import * as businessModels from '../../models/business-models';
import QueryParser from '../../generated/ggrc_filter_query_parser';
import {isMegaMapping} from '../../plugins/utils/mega-object-utils';

const DEFAULT_PAGE_SIZE = 10;

export default can.Component.extend({
  tag: 'mapper-results',
  template: can.stache(template),
  leakScope: true,
  viewModel: {
    define: {
      paging: {
        value: function () {
          return new Pagination({pageSizeSelect: [10, 25, 50]});
        },
      },
      megaRelation: {
        set(val) {
          this.attr('megaRelationObj').defaultValue = val;
          return val;
        },
      },
    },
    columns: {
      selected: [],
      available: [],
    },
    sort: {
      key: null,
      direction: null,
    },
    isLoading: false,
    items: [],
    allItems: [],
    allSelected: false,
    baseInstance: null,
    filterItems: [],
    mappingItems: [],
    statusItem: {},
    selected: [],
    refreshItems: false,
    submitCbs: null,
    disableColumnsConfiguration: false,
    applyOwnedFilter: false,
    objectsPlural: false,
    relatedAssessments: {
      state: {
        open: false,
      },
      instance: null,
      show: false,
    },
    searchOnly: false,
    useSnapshots: false,
    entries: [],
    relevantTo: [],
    objectGenerator: false,
    deferredList: [],
    disabledIds: [],
    megaRelationObj: {
      defaultValue: 'parent',
    },
    init: function () {
      this.attr('submitCbs').add(this.onSearch.bind(this, true));
    },
    destroy: function () {
      this.attr('submitCbs').remove(this.onSearch.bind(this));
    },
    setItems: function () {
      const stopFn = tracker.start(this.attr('type'),
        tracker.USER_JOURNEY_KEYS.NAVIGATION,
        tracker.USER_ACTIONS.ADVANCED_SEARCH_FILTER);

      this.attr('items').replace([]);
      return this.load()
        .then((items) => {
          this.attr('items', items);
          this.attr('entries', items.map(function (item) {
            return item.data;
          }));
          this.setColumnsConfiguration();
          this.setRelatedAssessments();
          this.attr('isBeforeLoad', false);
          stopFn();
        });
    },
    setColumnsConfiguration: function () {
      let columns =
        TreeViewUtils.getColumnsForModel(
          this.getDisplayModel().model_singular
        );

      const megaMapping =
        isMegaMapping(this.attr('object'), this.attr('type'));
      if (megaMapping) {
        this.addMegaColumns(columns);
      }

      this.attr('columns.available', columns.available);
      this.attr('columns.selected', columns.selected);
      this.attr('disableColumnsConfiguration', columns.disableConfiguration);
    },
    addMegaColumns: function (columns) {
      columns.available = columns.available.concat(columns.mega);
      columns.selected = columns.selected.concat(columns.mega);
    },
    setSortingConfiguration: function () {
      let sortingInfo = TreeViewUtils.getSortingForModel(
        this.getDisplayModel().model_singular
      );

      this.attr('sort.key', sortingInfo.key);
      this.attr('sort.direction', sortingInfo.direction);
    },
    setRelatedAssessments: function () {
      let Model = this.getDisplayModel();
      if (this.attr('useSnapshots')) {
        this.attr('relatedAssessments.show', false);
        return;
      }
      this.attr('relatedAssessments.show',
        !!Model.tree_view_options.show_related_assessments);
    },
    resetSearchParams: function () {
      this.attr('paging.current', 1);
      this.attr('paging.pageSize', DEFAULT_PAGE_SIZE);
      this.setSortingConfiguration();
    },
    onSearch: function (resetParams) {
      if (resetParams) {
        this.resetSearchParams();
      }
      this.attr('refreshItems', true);
    },
    prepareRelevantQuery: function () {
      let relevantList = this.attr('relevantTo') || [];
      let filters = relevantList.map(function (relevant) {
        return {
          type: relevant.type,
          operation: 'relevant',
          id: relevant.id,
        };
      });
      return filters;
    },
    prepareRelatedQuery: function (filter, operation) {
      if (!this.attr('baseInstance')) {
        return null;
      }

      return buildRelevantIdsQuery(this.attr('type'), {}, {
        type: this.attr('baseInstance.type'),
        id: this.attr('baseInstance.id'),
        operation: operation || 'relevant',
      }, filter);
    },
    prepareUnlockedFilter: function () {
      let filterString = StateUtils.unlockedFilter();
      return QueryParser.parse(filterString);
    },
    prepareOwnedFilter: function () {
      let userId = GGRC.current_user.id;
      return {
        expression: {
          object_name: 'Person',
          op: {
            name: 'owned',
          },
          ids: [userId],
        },
      };
    },
    shouldApplyUnlockedFilter: function (modelName) {
      return modelName === 'Audit' && !this.attr('searchOnly');
    },
    loadAllItems: function () {
      this.attr('allItems', this.loadAllItemsIds());
    },
    getQuery: function (queryType, addPaging, megaMapping) {
      let result = {};
      let paging = {};
      let modelName = this.attr('type');
      let query;
      let relatedQuery;

      // prepare QueryAPI data from advanced search
      let request = [];
      let status;
      let filters =
        AdvancedSearch.buildFilter(this.attr('filterItems').attr(), request);
      let mappings =
        AdvancedSearch.buildFilter(this.attr('mappingItems').attr(), request);
      let advancedFilters = QueryParser.joinQueries(filters, mappings);

      // the edge case caused by stateless objects
      if (this.attr('statusItem.value.items')) {
        status =
          AdvancedSearch.buildFilter([this.attr('statusItem').attr()], request);
        advancedFilters = QueryParser.joinQueries(advancedFilters, status);
      }
      result.request = request;

      // prepare pagination
      if (addPaging) {
        paging.current = this.attr('paging.current');
        paging.pageSize = this.attr('paging.pageSize');

        let sort = this.attr('sort');
        let defaultSort = this.attr('defaultSort');

        if (sort && sort.key) {
          paging.sort = [sort];
        } else if (defaultSort && defaultSort.length) {
          paging.sort = defaultSort;
        }
      }
      if (this.shouldApplyUnlockedFilter(modelName)) {
        advancedFilters = QueryParser.joinQueries(
          advancedFilters,
          this.prepareUnlockedFilter());
      }

      if (this.attr('applyOwnedFilter')) {
        advancedFilters = QueryParser.joinQueries(
          advancedFilters,
          this.prepareOwnedFilter());
      }

      // prepare and add main query to request
      query = buildParam(
        modelName,
        paging,
        this.prepareRelevantQuery(),
        null,
        advancedFilters);
      if (this.attr('useSnapshots')) {
        // Transform Base Query to Snapshot
        query = transformQuery(query);
      }
      // Add Permission check
      query.permissions = (modelName === 'Person') ||
        this.attr('searchOnly') ? 'read' : 'update';
      query.type = queryType || 'values';
      // we need it to find result in response from backend
      result.queryIndex = request.push(query) - 1;

      // mega object needs special query: parent and child op,
      // instead of 'relevant'
      if (megaMapping) {
        const relations = ['parent', 'child'];

        relations.forEach((relation) => {
          relatedQuery = this.prepareRelatedQuery(filters, relation);

          result[`${relation}QueryIndex`] = request.push(relatedQuery) - 1;
        });
      } else {
        // prepare and add related query to request
        // the query is used to select already mapped items
        relatedQuery = this.prepareRelatedQuery(filters);
        if (relatedQuery) {
          if (this.attr('useSnapshots')) {
            // Transform Related Query to Snapshot
            relatedQuery = transformQuery(relatedQuery);
          }
          // we need it to find result in response from backend
          result.relatedQueryIndex = request.push(relatedQuery) - 1;
        }
      }

      return result;
    },
    getModelKey: function () {
      return this.attr('useSnapshots') ?
        Snapshot.model_singular :
        this.attr('type');
    },
    getModel: function () {
      return businessModels[this.getModelKey()];
    },
    getDisplayModel: function () {
      return businessModels[this.attr('type')];
    },
    setDisabledItems: function (megaMapping, allItems, relatedData, type) {
      if (!this.attr('objectGenerator') && relatedData) {
        let disabledIds;

        if (megaMapping) {
          disabledIds = _.reduce(relatedData, (result, val) => {
            return result.concat(val[type].ids);
          }, []);
        } else {
          disabledIds = relatedData[type].ids;
        }

        this.attr('disabledIds', disabledIds);

        if (this.attr('searchOnly')) {
          return;
        }
        allItems.forEach(function (item) {
          item.isDisabled = disabledIds.indexOf(item.data.id) !== -1;
        });
      }
    },
    setSelectedItems: function (allItems) {
      let selectedItems;

      // get items which were selected before adding of new entries
      if (this.attr('prevSelected') && this.attr('prevSelected').length > 0) {
        this.attr('selected', this.attr('prevSelected').slice());
        this.attr('prevSelected', []);
      }

      selectedItems = can.makeArray(this.attr('selected'));
      allItems.forEach(function (item) {
        item.isSelected =
          selectedItems.some(function (selectedItem) {
            return selectedItem.id === item.id;
          });
        if (item.isSelected) {
          item.markedSelected = true;
        }
      });
    },
    setMegaRelations: function (allItems, relatedData, type) {
      const defaultRelation = this.attr('megaRelation') ?
        this.attr('megaRelation') : 'parent';
      const childIds = relatedData.child[type].ids;
      const parentIds = relatedData.parent[type].ids;
      const relationsObj = this.attr('megaRelationObj');

      allItems.forEach((item) => {
        if (childIds.indexOf(item.id) > -1) {
          item.mapAsChild = true;
        } else if (parentIds.indexOf(item.id) > -1) {
          item.mapAsChild = false;
        } else if (relationsObj[item.id]) {
          item.mapAsChild = relationsObj[item.id] === 'child' ? true : false;
        } else {
          item.mapAsChild = defaultRelation === 'child' ? true : false;
        }
      });
    },
    disableItself: function (megaMapping, allItems = []) {
      const baseInstance = this.attr('baseInstance');
      if (allItems[0] && baseInstance) {
        if (baseInstance.type === allItems[0].type) {
          let self = allItems.find((item) => item.id === baseInstance.id);
          if (self) {
            self.isDisabled = true;

            if (megaMapping) {
              self.mapAsChild = null;
            }
          }
        }
      }
    },
    transformValue: function (value) {
      let Model = this.getDisplayModel();
      if (this.attr('useSnapshots')) {
        value.snapshotObject =
          toObject(value);
        value.revision.content =
          Model.model(value.revision.content);
        return value;
      }
      return Model.model(value);
    },
    load: function () {
      const self = this;
      const modelKey = this.getModelKey();
      const megaMapping = isMegaMapping(this.attr('object'), modelKey);
      const dfd = $.Deferred();
      const query = this.getQuery('values', true, megaMapping);
      this.attr('isLoading', true);

      $.when(...query.request.map((request) => batchRequests(request)))
        .done((...responseArr) => {
          const data = responseArr[query.queryIndex];

          const relatedData = this.getRelatedData(
            megaMapping,
            responseArr,
            query,
            modelKey,
          );

          let result =
            data[modelKey].values.map((value) => {
              return {
                id: value.id,
                type: value.type,
                data: self.transformValue(value),
              };
            });
          this.setSelectedItems(result);
          this.setDisabledItems(megaMapping, result, relatedData, modelKey);

          if (megaMapping) {
            this.setMegaRelations(result, relatedData, modelKey);
          }
          this.disableItself(megaMapping, result);

          // Update paging object
          this.paging.attr('total', data[modelKey].total);
          dfd.resolve(result);
        })
        .fail(() => dfd.resolve([]))
        .always(() => {
          this.attr('isLoading', false);
          this.dispatch('loaded');
        });
      return dfd;
    },
    getRelatedData: function (megaMapping, responseArr, query, modelKey) {
      return megaMapping ?
        this.buildMegaRelatedData(responseArr, query, modelKey) :
        this.buildRelatedData(responseArr, query, modelKey);
    },
    buildRelatedData: function (responseArr, query, type) {
      const deferredList = this.attr('deferredList');
      let ids;
      let empty = {};
      let relatedData = responseArr[query.relatedQueryIndex];

      if (!deferredList || !deferredList.length) {
        return relatedData;
      } else if (!relatedData) {
        relatedData = {};
        relatedData[type] = {};
        ids = deferredList
          .map(function (item) {
            return item.id;
          });
      } else {
        ids = deferredList
          .filter(function (item) {
            return relatedData[item.type];
          })
          .map(function (item) {
            return item.id;
          });

        if (!ids.length) {
          // return empty data
          empty[type] = {
            ids: [],
          };
          return empty;
        }
      }

      relatedData[type].ids = ids;
      return relatedData;
    },
    buildMegaRelatedData: function (responseArr, query, type) {
      // Skipping 'deferredList' check:
      // 'deferredList' is used when you able to pre-Map objects
      // while creating a new Object. In case of Mega Object there is no
      // case when you can pre-Map objects while creating a new object of
      // the same type.
      const relatedData = {
        parent: responseArr[query.parentQueryIndex] || {},
        child: responseArr[query.childQueryIndex] || {},
      };

      return relatedData;
    },
    loadAllItemsIds: function () {
      let modelKey = this.getModelKey();
      let dfd = $.Deferred();
      let queryType = 'ids';
      let query = this.getQuery(queryType, false);

      $.when(...query.request.map((request) => batchRequests(request)))
        .done((...responseArr) => {
          let data = responseArr[query.queryIndex];
          let relatedData = responseArr[query.relatedQueryIndex];
          let values = data[modelKey][queryType];
          let result = values.map((item) => {
            let object = {
              id: item,
              type: modelKey,
            };

            if (this.attr('useSnapshots')) {
              object.child_type = this.attr('type');
            }

            return object;
          });
          // Do not perform extra mapping validation in case object generation
          if (!this.attr('objectGenerator') && relatedData) {
            result = result.filter((item) => {
              return relatedData[modelKey].ids.indexOf(item.id) < 0;
            });
          }
          dfd.resolve(result);
        })
        .fail(() => dfd.resolve([]));
      return dfd;
    },
    setItemsDebounced: function () {
      clearTimeout(this.attr('_setItemsTimeout'));
      this.attr('_setItemsTimeout', setTimeout(this.setItems.bind(this)));
    },
    showRelatedAssessments: function (ev) {
      this.attr('relatedAssessments.instance', ev.instance);
      this.attr('relatedAssessments.state.open', true);
    },
  },
  events: {
    '{viewModel} allSelected': function (scope, ev, allSelected) {
      if (allSelected) {
        this.viewModel.loadAllItems();
      }
    },
    '{viewModel} refreshItems': function (scope, ev, refreshItems) {
      if (refreshItems) {
        this.viewModel.setItemsDebounced();
        this.viewModel.attr('refreshItems', false);
      }
    },
    '{viewModel.paging} current': function () {
      this.viewModel.setItemsDebounced();
    },
    '{viewModel.paging} pageSize': function () {
      this.viewModel.setItemsDebounced();
    },
    '{viewModel.sort} key': function () {
      this.viewModel.setItemsDebounced();
    },
    '{viewModel.sort} direction': function () {
      this.viewModel.setItemsDebounced();
    },
  },
});
