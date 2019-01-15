/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './tree-header-selector';
import './sub-tree-expander';
import './sub-tree-wrapper';
import './sub-tree-item';
import './sub-tree-models';
import './tree-item-extra-info';
import './tree-item-actions';
import './tree-item-map';
import './tree-view';
import './tree-item';
import './tree-actions';
import './tree-header';
import './tree-filter-input';
import './tree-status-filter';
import './tree-item-status-for-workflow';
import './tree-no-results';
import './tree-field';
import './tree-people-with-role-list-field';
import '../advanced-search/advanced-search-filter-container';
import '../advanced-search/advanced-search-mapping-container';
import '../bulk-update-button/bulk-update-button';
import '../assessment-template-clone-button/assessment-template-clone-button';
import '../create-document-button/create-document-button';
import '../dropdown/multiselect-dropdown';
import '../dropdown/dropdown-multiselect-wrapper';
import '../dropdown/dropdown-wrapper';
import '../assessment/assessment-generator-button';
import '../last-comment/last-comment';
import template from './templates/tree-widget-container.mustache';
import * as StateUtils from '../../plugins/utils/state-utils';
import {
  REFRESH_RELATED,
  REFRESH_MAPPING,
} from '../../events/eventTypes';
import * as TreeViewUtils from '../../plugins/utils/tree-view-utils';
import {
  initMappedInstances,
} from '../../plugins/utils/current-page-utils';
import {
  getCounts,
  initCounts,
} from '../../plugins/utils/widgets-utils';
import * as AdvancedSearch from '../../plugins/utils/advanced-search-utils';
import Pagination from '../base-objects/pagination';
import tracker from '../../tracker';
import router from '../../router';
import {notifier} from '../../plugins/utils/notifiers-utils';
import Cacheable from '../../models/cacheable';
import Relationship from '../../models/service-models/relationship';
import * as businessModels from '../../models/business-models';
import exportMessage from './templates/export-message.mustache';
import QueryParser from '../../generated/ggrc_filter_query_parser';

let viewModel;

viewModel = can.Map.extend({
  define: {
    /**
     * Condition that adds into all request to server-side Query API
     */
    additionalFilter: {
      type: String,
      value: '',
      get: function () {
        return this.attr('options').additional_filter;
      },
    },
    /**
     *
     */
    currentFilter: {
      type: String,
      get: function () {
        let filters = can.makeArray(this.attr('filters'));
        let additionalFilter = this.attr('additionalFilter');

        if (this.attr('advancedSearch.filter')) {
          return this.attr('advancedSearch.filter');
        }

        if (additionalFilter) {
          additionalFilter = QueryParser.parse(additionalFilter);
        }

        return filters.filter(function (options) {
          return options.query;
        }).reduce(this._concatFilters, additionalFilter);
      },
    },
    modelName: {
      type: String,
      get: function () {
        return this.attr('model').shortName;
      },
    },
    statusFilterVisible: {
      type: Boolean,
      get: function () {
        return StateUtils.hasFilter(this.attr('modelName'));
      },
    },
    statusTooltipVisible: {
      type: Boolean,
      get: function () {
        return StateUtils.hasFilterTooltip(this.attr('modelName'));
      },
    },
    cssClasses: {
      type: String,
      get: function () {
        let classes = [];

        if (this.attr('loading')) {
          classes.push('loading');
        }

        return classes.join(' ');
      },
    },
    parent_instance: {
      type: '*',
      get: function () {
        return this.attr('options').parent_instance;
      },
    },
    noResults: {
      type: Boolean,
      get: function () {
        return !this.attr('loading') && !this.attr('showedItems').length;
      },
    },
    pageInfo: {
      value: function () {
        return new Pagination({
          pageSizeSelect: [10, 25, 50],
          pageSize: 10});
      },
    },
    selectedItem: {
      set(newValue) {
        this.selectedItemHandler(newValue);
        return newValue;
      },
    },
  },
  /**
   * This deferred describes operations which should be executed before
   * the moment when info pane is loaded. Initial need of this deferred was
   * for the case when Task Group's info pane is opened - without it
   * mapped objects might be reloaded before instance.refresh() which is
   * preformed in selectedItemHandler() method.
   */
  infoPaneLoadDfd: $.Deferred(),
  /**
   *
   */
  sortingInfo: {
    sortDirection: null,
    sortBy: null,
  },
  /**
   *
   */
  model: null,
  /**
   *
   */
  showedItems: [],
  /**
   *
   */
  limitDepthTree: 0,
  /**
   * Legacy options which were built for a previous implementation of TreeView based on TreeView controller
   */
  options: {},
  $el: null,
  loading: false,
  columns: {
    selected: [],
    available: [],
  },
  filters: [],
  loaded: null,
  refreshLoaded: true,
  canOpenInfoPin: true,
  loadItems: function () {
    let modelName = this.attr('modelName');
    let pageInfo = this.attr('pageInfo');
    let sortingInfo = this.attr('sortingInfo');
    let parent = this.attr('parent_instance');
    let filter = this.attr('currentFilter');
    let page = {
      current: pageInfo.current,
      pageSize: pageInfo.pageSize,
      sort: [{
        key: sortingInfo.sortBy,
        direction: sortingInfo.sortDirection,
      }],
    };
    let request = this.attr('advancedSearch.request');
    const stopFn = tracker.start(modelName,
      tracker.USER_JOURNEY_KEYS.TREEVIEW,
      tracker.USER_ACTIONS.TREEVIEW.TREE_VIEW_PAGE_LOADING(page.pageSize));
    const countsName = this.attr('options.countsName');

    pageInfo.attr('disabled', true);
    this.attr('loading', true);

    if (this._getFilterByName('status')) {
      initCounts([countsName], parent.type, parent.id);
    }

    let loadSnapshots = this.attr('options.objectVersion');
    return TreeViewUtils
      .loadFirstTierItems(
        modelName,
        parent,
        page,
        filter,
        request,
        loadSnapshots)
      .then((data) => {
        const total = data.total;

        this.attr('showedItems', data.values);
        this.attr('pageInfo.total', total);
        this.attr('pageInfo.disabled', false);
        this.attr('loading', false);

        if (!this._getFilterByName('custom') &&
          !this._getFilterByName('status') &&
          total !== getCounts().attr(countsName)) {
          getCounts().attr(countsName, total);
        }
      })
      .then(stopFn, stopFn.bind(null, true));
  },
  display: function (needToRefresh) {
    let loadedItems;

    if (!this.attr('loaded') || needToRefresh || router.attr('refetch')) {
      loadedItems = this.loadItems()
        .then(() => this.setRefreshFlag(false)); // refreshed

      this.attr('loaded', loadedItems);
    }

    return this.attr('loaded');
  },
  setColumnsConfiguration: function () {
    let columns = TreeViewUtils.getColumnsForModel(
      this.attr('model').model_singular,
      this.attr('options.widgetId')
    );

    this.attr('columns.available', columns.available);
    this.attr('columns.selected', columns.selected);
    this.attr('columns.mandatory', columns.mandatory);
    this.attr('columns.disableConfiguration', columns.disableConfiguration);
  },
  setSortingConfiguration: function () {
    let sortingInfo = TreeViewUtils
      .getSortingForModel(this.attr('modelName'));

    this.attr('sortingInfo.sortBy', sortingInfo.key);
    this.attr('sortingInfo.sortDirection', sortingInfo.direction);
  },
  onUpdateColumns: function (event) {
    let selectedColumns = event.columns;
    let columns = TreeViewUtils.setColumnsForModel(
      this.attr('model').model_singular,
      selectedColumns,
      this.attr('options.widgetId')
    );

    this.attr('columns.selected', columns.selected);
  },
  onSort: function (event) {
    this.attr('sortingInfo.sortBy', event.field);
    this.attr('sortingInfo.sortDirection', event.sortDirection);

    this.attr('pageInfo.current', 1);
    this.loadItems();
    this.closeInfoPane();
  },
  onFilter: function () {
    const stopFn = tracker.start(this.attr('modelName'),
      tracker.USER_JOURNEY_KEYS.TREEVIEW,
      tracker.USER_ACTIONS.TREEVIEW.FILTER);
    this.attr('pageInfo.current', 1);
    this.loadItems().then(stopFn);
    this.closeInfoPane();
  },
  getDepthFilter: function (deepLevel) {
    let filters = can.makeArray(this.attr('filters'));

    return filters.filter(function (options) {
      return options.query &&
        options.depth &&
        options.filterDeepLimit > deepLevel;
    }).reduce(this._concatFilters, null);
  },
  setRefreshFlag: function (refresh) {
    this.attr('refreshLoaded', refresh);
  },
  needToRefresh: function (refresh) {
    return this.attr('refreshLoaded');
  },
  registerFilter: function (option) {
    this.attr('filters').push(option);
  },
  /**
   * Concatenation active filters.
   *
   * @param {String} filter - Parsed filter string
   * @param {Object} options - Filter parameters
   * @return {string} - Result of concatenation filters.
   * @private
   */
  _concatFilters: function (filter, options) {
    if (filter) {
      filter = QueryParser.joinQueries(
        filter,
        options.query.attr(),
        'AND');
    } else if (options.query) {
      filter = options.query;
    }

    return filter;
  },
  _getFilterByName: function (name) {
    let filter = _.find(this.attr('filters'), {name: name});

    return filter && filter.query ? filter.query : null;
  },
  _widgetHidden: function () {
    this._triggerListeners(true);
  },
  _widgetShown: function () {
    let countsName = this.attr('options.countsName');
    let loaded = this.attr('loaded');
    let total = this.attr('pageInfo.total');
    let counts = _.get(getCounts(), countsName);

    if (!_.isNull(loaded) && (total !== counts)) {
      this.loadItems();
    }

    this._triggerListeners();
  },
  _needToRefreshAfterRelRemove(relationship) {
    const parentInstance = this.attr('parent_instance');
    const {
      source,
      destination,
    } = relationship;

    const isRelForCurrentInstance = (
      (
        source.type === parentInstance.attr('type') &&
        source.id === parentInstance.attr('id')
      ) || (
        destination.type === parentInstance.attr('type') &&
        destination.id === parentInstance.attr('id')
      )
    );

    return isRelForCurrentInstance;
  },
  _isRefreshNeeded(instance) {
    let needToRefresh = true;

    if (instance instanceof Relationship) {
      needToRefresh = this._needToRefreshAfterRelRemove(instance);
    }

    return needToRefresh;
  },
  _triggerListeners: (function () {
    let activeTabModel;
    let self;

    function onCreated(ev, instance) {
      if (activeTabModel === instance.type) {
        _refresh(true);
      }
    }

    function onDestroyed(ev, instance) {
      let current;

      if (_verifyRelationship(instance, activeTabModel) ||
        instance instanceof businessModels[activeTabModel]) {
        if (self.attr('showedItems').length === 1) {
          current = self.attr('pageInfo.current');
          self.attr('pageInfo.current',
            current > 1 ? current - 1 : 1);
        }

        if (!self._isRefreshNeeded(instance)) {
          return;
        }

        _refresh();

        // TODO: This is a workaround.We need to update communication between
        //       info-pin and tree views through Observer
        if (!self.attr('$el').closest('.cms_controllers_info_pin').length) {
          $('.cms_controllers_info_pin').control().unsetInstance();
        }
      } else {
        // reinit mapped instances (subTree uses mapped instances)
        initMappedInstances();
      }
    }

    function _refresh(sortByUpdatedAt) {
      if (self.attr('loading')) {
        return;
      }
      if (sortByUpdatedAt) {
        self.attr('sortingInfo.sortDirection', 'desc');
        self.attr('sortingInfo.sortBy', 'updated_at');
        self.attr('pageInfo.current', 1);
      }
      self.loadItems();
      self.closeInfoPane();
    }

    function _verifyRelationship(instance, shortName, parentInstance) {
      if (!(instance instanceof Relationship)) {
        return false;
      }

      if (parentInstance && instance.destination && instance.source) {
        if (instance.source.type === parentInstance.type &&
          (instance.destination.type === shortName ||
          instance.destination.type === 'Snapshot')) {
          return true;
        }
        return false;
      }
      if (instance.destination &&
        (instance.destination.type === shortName ||
        instance.destination.type === 'Snapshot')) {
        return true;
      }
      if (instance.source &&
        (instance.source.type === shortName ||
        instance.source.type === 'Snapshot')) {
        return true;
      }
      return false;
    }

    return function (needDestroy) {
      activeTabModel = this.options.model.shortName;
      self = this;
      if (needDestroy) {
        // Remove listeners for inactive tabs
        Cacheable.unbind('created', onCreated);
        Cacheable.unbind('destroyed', onDestroyed);
      } else {
        // Add listeners on creations instance or mappings objects for current tab
        // and refresh page after that.
        Cacheable.bind('created', onCreated);
        Cacheable.bind('destroyed', onDestroyed);
      }
    };
  })(),

  advancedSearch: {
    open: false,
    filter: null,
    request: can.List(),
    filterItems: can.List(),
    appliedFilterItems: can.List(),
    mappingItems: can.List(),
    appliedMappingItems: can.List(),
  },
  openAdvancedFilter: function () {
    this.attr('advancedSearch.filterItems',
      this.attr('advancedSearch.appliedFilterItems').slice());

    this.attr('advancedSearch.mappingItems',
      this.attr('advancedSearch.appliedMappingItems').slice());

    this.attr('advancedSearch.open', true);
  },
  applyAdvancedFilters: function () {
    let filters = this.attr('advancedSearch.filterItems').attr();
    let mappings = this.attr('advancedSearch.mappingItems').attr();
    let request = can.List();
    let advancedFilters;

    this.attr('advancedSearch.appliedFilterItems', filters);
    this.attr('advancedSearch.appliedMappingItems', mappings);

    advancedFilters = QueryParser.joinQueries(
      AdvancedSearch.buildFilter(filters, request),
      AdvancedSearch.buildFilter(mappings, request)
    );
    this.attr('advancedSearch.request', request);

    this.attr('advancedSearch.filter', advancedFilters);

    this.attr('advancedSearch.open', false);
    this.onFilter();
  },
  removeAdvancedFilters: function () {
    this.attr('advancedSearch.appliedFilterItems', can.List());
    this.attr('advancedSearch.appliedMappingItems', can.List());
    this.attr('advancedSearch.request', can.List());
    this.attr('advancedSearch.filter', null);
    this.attr('advancedSearch.open', false);
    this.onFilter();
  },
  resetAdvancedFilters: function () {
    this.attr('advancedSearch.filterItems', can.List());
    this.attr('advancedSearch.mappingItems', can.List());
  },
  closeInfoPane: function () {
    $('.pin-content')
      .control()
      .close();
  },
  getAbsoluteItemNumber: function (instance) {
    let showedItems = this.attr('showedItems');
    let pageInfo = this.attr('pageInfo');
    let startIndex = pageInfo.pageSize * (pageInfo.current - 1);
    let relativeItemIndex = _.findIndex(showedItems,
      {id: instance.id, type: instance.type});
    return relativeItemIndex > -1 ?
      startIndex + relativeItemIndex :
      relativeItemIndex;
  },
  getRelativeItemNumber: function (absoluteNumber, pageSize) {
    let pageNumber = Math.floor(absoluteNumber / pageSize);
    let startIndex = pageSize * pageNumber;
    return absoluteNumber - startIndex;
  },
  getNextItemPage: function (absoluteNumber, pageInfo) {
    let pageNumber = Math.floor(absoluteNumber / pageInfo.pageSize) + 1;
    let dfd = $.Deferred().resolve();

    if (pageInfo.current !== pageNumber) {
      this.attr('loading', true);
      this.attr('pageInfo.current', pageNumber);
      dfd = this.loadItems();
    }

    return dfd;
  },
  updateActiveItemIndicator: function (index) {
    let element = this.attr('$el');
    element
      .find('.item-active')
      .removeClass('item-active');
    element
      .find('tree-item:nth-of-type(' + (index + 1) +
        ') .tree-item-content')
      .addClass('item-active');
  },
  showLastPage: function () {
    const lastPageIndex = this.attr('pageInfo.count');

    this.attr('pageInfo.current', lastPageIndex);
  },
  export() {
    let modelName = this.attr('modelName');
    let parent = this.attr('parent_instance');
    let filter = this.attr('currentFilter');
    let request = this.attr('advancedSearch.request');
    let loadSnapshots = this.attr('options.objectVersion');

    TreeViewUtils
      .startExport(modelName, parent, filter, request, loadSnapshots);

    notifier('info', exportMessage, true);
  },
  selectedItemHandler(itemIndex) {
    let componentSelector = 'assessment-info-pane';
    let pageInfo = this.attr('pageInfo');

    let relativeIndex = this
      .getRelativeItemNumber(itemIndex, pageInfo.pageSize);
    let pageLoadDfd = this
      .getNextItemPage(itemIndex, pageInfo);
    let pinControl = $('.pin-content').control();

    if (!this.attr('canOpenInfoPin')) {
      return;
    }

    pinControl.setLoadingIndicator(componentSelector, true);

    const infoPaneLoadDfd = pageLoadDfd
      .then(function () {
        const items = this.attr('showedItems');
        const newInstance = items[relativeIndex];

        if (!newInstance) {
          this.closeInfoPane();
          this.showLastPage();

          return $.Deferred().resolve();
        }

        return newInstance
          .refresh();
      }.bind(this))
      .then(function (newInstance) {
        if (!newInstance) {
          return;
        }

        pinControl
          .updateInstance(componentSelector, newInstance);
        newInstance.dispatch('refreshRelatedDocuments');
        newInstance.dispatch({
          ...REFRESH_RELATED,
          model: 'Assessment',
        });

        this.updateActiveItemIndicator(relativeIndex);
      }.bind(this))
      .fail(function () {
        notifier('error', 'Failed to fetch an object.');
      })
      .always(function () {
        pinControl.setLoadingIndicator(componentSelector, false);
      });

    this.attr('infoPaneLoadDfd', infoPaneLoadDfd);
  },
});

/**
 *
 */
export default can.Component.extend({
  tag: 'tree-widget-container',
  template,
  leakScope: true,
  viewModel,
  init: function () {
    this.viewModel.setColumnsConfiguration();
    this.viewModel.setSortingConfiguration();
  },
  events: {
    '{viewModel.pageInfo} current': function () {
      if (!this.viewModel.attr('loading')) {
        this.viewModel.loadItems();
        this.viewModel.closeInfoPane();
      }
    },
    '{viewModel.pageInfo} pageSize': function () {
      this.viewModel.loadItems();
    },
    ' selectTreeItem': function (el, ev, selectedEl, instance) {
      let parent = this.viewModel.attr('parent_instance');
      let setInstanceDfd;
      let infoPaneOptions = new can.Map({
        instance: instance,
        parent_instance: parent,
        options: this.viewModel,
      });
      let itemNumber = this.viewModel.getAbsoluteItemNumber(instance);
      let isSubTreeItem = itemNumber === -1;

      ev.stopPropagation();

      if (!this.viewModel.attr('canOpenInfoPin')) {
        return;
      }

      if (!isSubTreeItem) {
        this.viewModel.attr('selectedItem', itemNumber);
      }

      this.viewModel.attr('canOpenInfoPin', false);
      this.viewModel.attr('isSubTreeItem', isSubTreeItem);
      el.find('.item-active').removeClass('item-active');
      selectedEl.addClass('item-active');

      setInstanceDfd = $('.pin-content').control()
        .setInstance(infoPaneOptions, selectedEl, true);

      setInstanceDfd.then(function () {
        this.viewModel.attr('canOpenInfoPin', true);
      }.bind(this));
    },
    ' refreshTree'(el, ev) {
      ev.stopPropagation();
      this.reloadTree();
    },
    [`{viewModel.parent_instance} ${REFRESH_MAPPING.type}`](scope, ev) {
      const vm = this.viewModel;
      let currentModelName;

      if (!vm.attr('model')) {
        return;
      }

      currentModelName = vm.attr('model').shortName;

      if (currentModelName === ev.destinationType) {
        this.reloadTree();
      }
    },
    inserted() {
      let viewModel = this.viewModel;
      viewModel.attr('$el', this.element);

      this.element.closest('.widget')
        .on('widget_hidden', viewModel._widgetHidden.bind(viewModel));
      this.element.closest('.widget')
        .on('widget_shown', viewModel._widgetShown.bind(viewModel));
      viewModel._widgetShown();
    },
    reloadTree() {
      this.viewModel.closeInfoPane();
      this.viewModel.loadItems();
    },
  },
});
