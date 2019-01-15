/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../components/advanced-search/advanced-search-filter-container';
import '../../components/advanced-search/advanced-search-filter-state';
import '../../components/advanced-search/advanced-search-mapping-container';
import '../../components/advanced-search/advanced-search-wrapper';
import '../../components/unified-mapper/mapper-results';
import '../../components/collapsible-panel/collapsible-panel';
import '../../components/mapping-controls/mapping-type-selector';

import template from './object-mapper.mustache';

import tracker from '../../tracker';
import ObjectOperationsBaseVM from '../view-models/object-operations-base-vm';
import {
  isInScopeModel,
  isSnapshotModel,
  isSnapshotParent,
} from '../../plugins/utils/snapshot-utils';
import {getPageInstance} from '../../plugins/utils/current-page-utils';
import {refreshCounts} from '../../plugins/utils/widgets-utils';
import {
  MAP_OBJECTS,
  REFRESH_MAPPING,
  REFRESH_SUB_TREE,
  BEFORE_MAPPING,
  DEFERRED_MAP_OBJECTS,
} from '../../events/eventTypes';
import Mappings from '../../models/mappers/mappings';
import {mapObjects as mapObjectsUtil} from '../../plugins/utils/mapper-utils';
import * as businessModels from '../../models/business-models';
import TreeViewConfig from '../../apps/base_widgets';

let DEFAULT_OBJECT_MAP = {
  Assessment: 'Control',
  Objective: 'Control',
  Requirement: 'Objective',
  Regulation: 'Requirement',
  Product: 'System',
  ProductGroup: 'Product',
  Standard: 'Requirement',
  Contract: 'Requirement',
  Control: 'Objective',
  System: 'Product',
  Metric: 'Product',
  Process: 'Risk',
  AccessGroup: 'System',
  DataAsset: 'Policy',
  Facility: 'Program',
  Issue: 'Control',
  Market: 'Program',
  OrgGroup: 'Program',
  Policy: 'DataAsset',
  Program: 'Standard',
  Project: 'Program',
  Risk: 'Control',
  CycleTaskGroupObjectTask: 'Control',
  Threat: 'Risk',
  Vendor: 'Program',
  Audit: 'Product',
  RiskAssessment: 'Program',
  TaskGroup: 'Control',
  TechnologyEnvironment: 'Product',
};

let getDefaultType = function (type, object) {
  let treeView = TreeViewConfig.attr('sub_tree_for')[object];
  let defaultType =
    (businessModels[type] && type) ||
    DEFAULT_OBJECT_MAP[object] ||
    (treeView ? treeView.display_list[0] : 'Control');
  return defaultType;
};

/**
 * A component implementing a modal for mapping objects to other objects,
 * taking the object type mapping constraints into account.
 */
export default can.Component.extend({
  tag: 'object-mapper',
  template,
  leakScope: true,
  viewModel: function (attrs, parentViewModel) {
    let config = {
      general: parentViewModel.attr('general'),
      special: parentViewModel.attr('special'),
    };

    let resolvedConfig = ObjectOperationsBaseVM.extractConfig(
      config.general.type,
      config
    );

    return ObjectOperationsBaseVM.extend({
      join_object_id: resolvedConfig.isNew ? null :
        resolvedConfig['join-object-id'] ||
        (getPageInstance() && getPageInstance().id),
      object: resolvedConfig.object,
      type: getDefaultType(resolvedConfig.type, resolvedConfig.object),
      config: config,
      useSnapshots: resolvedConfig.useSnapshots,
      isLoadingOrSaving: function () {
        return this.attr('is_saving') ||
        //  disable changing of object type while loading
        //  to prevent errors while speedily selecting different types
        this.attr('is_loading');
      },
      deferred_to: parentViewModel.attr('deferred_to'),
      deferred_list: [],
      /**
       * This property is needed to work together with deferredSave() method.
       * If it's true then mapped objects shouldn't be mapped immediately to
       * target object - they will be stored in the scope of deferred-mapper
       * component. This component will decide, when mapped objects should be
       * mapped to target object.
       * @property {boolean}
       */
      deferred: false,
      allowedToCreate: function () {
        // Don't allow to create new instances for "In Scope" Objects that
        // are snapshots
        let isInScopeSrc = isInScopeModel(this.attr('object'));

        return !isInScopeSrc ||
          (isInScopeSrc && !isSnapshotModel(this.attr('type')));
      },
      showAsSnapshots: function () {
        if (this.attr('freezedConfigTillSubmit.useSnapshots')) {
          return true;
        }
        return false;
      },
      showWarning: function () {
        let isInScopeSrc = isInScopeModel(this.attr('object'));
        let isSnapshotParentSrc = isSnapshotParent(this.attr('object'));
        let isSnapshotParentDst = isSnapshotParent(this.attr('type'));
        let isSnapshotModelSrc = isSnapshotModel(this.attr('object'));
        let isSnapshotModelDst = isSnapshotModel(this.attr('type'));

        let result =
          // Dont show message if source is inScope model, for example Assessment.
          !isInScopeSrc &&
          // Show message if source is snapshotParent and destination is snapshotable.
          ((isSnapshotParentSrc && isSnapshotModelDst) ||
          // Show message if destination is snapshotParent and source is snapshotable.
          (isSnapshotParentDst && isSnapshotModelSrc));

        return result;
      },
      updateFreezedConfigToLatest: function () {
        this.attr('freezedConfigTillSubmit', this.attr('currConfig'));
      },
      onSubmit: function () {
        this.updateFreezedConfigToLatest();
        // calls base version
        this._super(...arguments);
      },
    });
  },

  events: {
    [`{parentInstance} ${MAP_OBJECTS.type}`](instance, event) {
      this.mapObjects(event.objects);
    },
    '.create-control modal:success': function (el, ev, model) {
      this.map(model);
    },
    '.create-control modal:added': function (el, ev, model) {
      this.viewModel.attr('newEntries').push(model);
    },
    '.create-control click': function () {
      // reset new entries
      this.viewModel.attr('newEntries', []);
      this.element.trigger('hideModal');
    },
    '.create-control modal:dismiss'() {
      this.closeModal();
    },
    '{window} modal:dismiss': function (el, ev, options) {
      let joinObjectId = this.viewModel.attr('join_object_id');

      // mapper sets uniqueId for modal-ajax.
      // we can check using unique id which modal-ajax is closing
      if (options && options.uniqueId &&
        joinObjectId === options.uniqueId &&
        this.viewModel.attr('newEntries').length > 0) {
        this.mapObjects(this.viewModel.attr('newEntries'));
      } else {
        this.element.trigger('showModal');
      }
    },
    inserted: function () {
      let self = this;
      let deferredToList;
      this.viewModel.attr('selected').replace([]);
      this.viewModel.attr('entries').replace([]);

      if (this.viewModel.attr('deferred_to.list')) {
        deferredToList = this.viewModel.attr('deferred_to.list')
          .map(function (item) {
            return {
              id: item.id,
              type: item.type,
            };
          });
        this.viewModel.attr('deferred_list', deferredToList);
      }

      self.viewModel.attr('submitCbs').fire();
    },
    map(model) {
      const viewModel = this.viewModel;
      const newEntries = viewModel.attr('newEntries');

      viewModel.updateFreezedConfigToLatest();
      newEntries.push(model);

      if (this.viewModel.attr('deferred')) {
        // postpone map operation unless target object is saved
        this.deferredSave(newEntries);
      } else {
        // map objects immediately
        this.mapObjects(newEntries);
      }
    },
    closeModal: function () {
      this.viewModel.attr('is_saving', false);

      // TODO: Find proper way to dismiss the modal
      if (this.element) {
        this.element.find('.modal-dismiss').trigger('click');
      }
    },
    deferredSave: function (objects) {
      let source = this.viewModel.attr('deferred_to').instance;
      const deferredObjects = objects
        .filter((destination) => Mappings.allowedToMap(source, destination))
        .map((object) => {
          object.isNeedRefresh = true;
          return object;
        });

      source.dispatch({
        ...DEFERRED_MAP_OBJECTS,
        objects: deferredObjects,
      });
      this.closeModal();
    },
    '.modal-footer .btn-map click': function (el, ev) {
      ev.preventDefault();
      if (el.hasClass('disabled') ||
        this.viewModel.attr('is_saving')) {
        return;
      }

      const selectedObjects = this.viewModel.attr('selected');
      // TODO: Figure out nicer / proper way to handle deferred save
      if (this.viewModel.attr('deferred')) {
        return this.deferredSave(selectedObjects);
      }
      this.viewModel.attr('is_saving', true);
      this.mapObjects(selectedObjects);
    },
    mapObjects(objects) {
      const viewModel = this.viewModel;
      const object = viewModel.attr('object');
      const type = viewModel.attr('type');
      const instance = businessModels[object].findInCacheById(
        viewModel.attr('join_object_id')
      );
      let stopFn = tracker.start(
        tracker.FOCUS_AREAS.MAPPINGS(instance.type),
        tracker.USER_JOURNEY_KEYS.MAP_OBJECTS(type),
        tracker.USER_ACTIONS.MAPPING_OBJECTS(objects.length)
      );

      instance.dispatch({
        ...BEFORE_MAPPING,
        destinationType: type,
      });

      mapObjectsUtil(instance, objects, {
        useSnapshots: viewModel.attr('useSnapshots'),
      })
        .then(() => {
          stopFn();

          instance.dispatch('refreshInstance');
          instance.dispatch({
            ...REFRESH_MAPPING,
            destinationType: type,
          });
          instance.dispatch(REFRESH_SUB_TREE);

          // This Method should be modified to event
          refreshCounts();
        })
        .catch((response, message) => {
          $('body').trigger('ajax:flash', {error: message});
        })
        .finally(() => {
          viewModel.attr('is_saving', false);
          this.closeModal();
        });
    },
  },

  helpers: {
    get_title: function (options) {
      let instance = this.attr('parentInstance');
      return (
        (instance && instance.title) ?
          instance.title :
          this.attr('object')
      );
    },
    get_object: function (options) {
      let type = businessModels[this.attr('type')];
      if (type && type.title_plural) {
        return type.title_plural;
      }
      return 'Objects';
    },
  },
});
