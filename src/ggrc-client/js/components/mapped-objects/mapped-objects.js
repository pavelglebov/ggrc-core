/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  buildParam,
  batchRequests,
} from '../../plugins/utils/query-api-utils';
import '../object-list/object-list';
import {applyTypeFilter} from '../../plugins/ggrc_utils';
import template from './mapped-objects.mustache';
import Mappings from '../../models/mappers/mappings';
import QueryParser from '../../generated/ggrc_filter_query_parser';

const tag = 'mapped-objects';
/**
 * Mapped objects view component
 */
export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    define: {
      emptyMessage: {
        type: 'string',
        value: 'None',
      },
      relatedTypes: {
        type: 'string',
        value: function () {
          return '';
        },
      },
      mappedItems: {
        Value: can.List,
      },
      mappedSnapshots: {
        type: 'boolean',
        value: false,
      },
      requireLimit: {
        get: function () {
          return this.attr('mappedItems.length') > this.attr('visibleItems');
        },
      },
      showItems: {
        type: can.List,
        get: function () {
          return this.attr('showAll') ?
            this.attr('mappedItems') :
            this.attr('mappedItems').slice(0, this.attr('visibleItems'));
        },
      },
      showAll: {
        value: false,
        type: Boolean,
      },
      showAllButtonText: {
        get: function () {
          return !this.attr('showAll') ?
            'Show All (' + this.attr('mappedItems.length') + ')' :
            'Show Less';
        },
      },
      visibleItems: {
        type: Number,
        value: 5,
      },
    },
    isLoading: false,
    mapping: '@',
    parentInstance: null,
    selectedItem: {},
    filter: {
      only: [],
      exclude: [],
    },
    toggleShowAll: function () {
      let isShown = this.attr('showAll');
      this.attr('showAll', !isShown);
    },
    filterMappedObjects: function (items) {
      function getTypeFromInstance(item) {
        return item.instance.type;
      }

      return applyTypeFilter(items,
        this.attr('filter').attr(), getTypeFromInstance);
    },
    getBinding: function () {
      return Mappings.getBinding(
        this.attr('mapping'),
        this.attr('parentInstance'));
    },
    getSnapshotQueryFilters: function () {
      let includeTypes = this.attr('filter.only').attr();
      let excludeTypes = this.attr('filter.exclude').attr();
      let includeFilters = {
        keys: [],
        expression: {},
      };
      let excludeFilters = excludeTypes.map(function (type) {
        return {
          expression: {
            op: {name: '!='},
            left: 'child_type',
            right: type,
          },
          keys: [],
        };
      });
      includeTypes.forEach(function (type) {
        includeFilters = QueryParser.joinQueries({
          expression: {
            op: {name: '='},
            left: 'child_type',
            right: type,
          },
          keys: [],
        }, includeFilters, 'OR');
      });
      excludeFilters.push(includeFilters);
      return excludeFilters;
    },
    getSnapshotQuery: function () {
      let relevantFilters = [{
        type: this.attr('parentInstance.type'),
        id: this.attr('parentInstance.id'),
        operation: 'relevant',
      }];
      let filters = this.getSnapshotQueryFilters();

      return buildParam('Snapshot', {}, relevantFilters, [], filters);
    },
    getObjectQuery: function () {
      let relevantFilters = [{
        type: this.attr('parentInstance.type'),
        id: this.attr('parentInstance.id'),
        operation: 'relevant',
      }];
      let type = this.attr('relatedTypes');

      return buildParam(type, {}, relevantFilters, [], []);
    },
    requestQuery: function (query) {
      let dfd = $.Deferred();
      this.attr('isLoading', true);

      batchRequests(query)
        .done(function (response) {
          let type = Object.keys(response)[0];
          let values = response[type].values;
          let result = values.map(function (item) {
            return {instance: item, isSelected: false};
          });
          dfd.resolve(result);
        })
        .fail(function () {
          dfd.resolve([]);
        })
        .always(function () {
          this.attr('isLoading', false);
        }.bind(this));
      return dfd;
    },
    loadSnapshots: function () {
      let query = this.getSnapshotQuery();
      return this.requestQuery(query);
    },
    loadObjects: function () {
      let query = this.getObjectQuery();
      return this.requestQuery(query);
    },
    load: function () {
      let dfd = $.Deferred();
      let binding = this.getBinding();

      if (!binding) {
        dfd.resolve([]);
        return dfd;
      }
      // Set Loading Status
      this.attr('isLoading', true);
      binding
        .refresh_instances()
        .done(function (items) {
          dfd.resolve(this.filterMappedObjects(items));
        }.bind(this))
        .fail(function () {
          dfd.resolve([]);
        })
        .always(function () {
          this.attr('isLoading', false);
        }.bind(this));
      return dfd;
    },
    setMappedObjects: function () {
      let useSnapshots = this.attr('mappedSnapshots');
      let hasMapping = this.attr('mapping');
      let loadFn;
      let objects;
      if (useSnapshots) {
        loadFn = this.loadSnapshots;
      } else {
        loadFn = hasMapping ? this.load : this.loadObjects;
      }
      objects = loadFn.call(this);
      this.attr('mappedItems').replace(objects);
    },
  },
  init: function () {
    this.viewModel.setMappedObjects();
  },
  events: {
    '{viewModel.parentInstance} refreshInstance': function () {
      this.viewModel.setMappedObjects();
    },
  },
});
