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
import '../questionnaire-mapping-link/questionnaire-mapping-link';
import './create-and-map';

import template from './object-mapper.stache';

import tracker from '../../tracker';
import ObjectOperationsBaseVM from '../view-models/object-operations-base-vm';
import {
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
import {confirm} from '../../plugins/utils/modals';
import {isMegaMapping} from '../../plugins/utils/mega-object-utils';

let DEFAULT_OBJECT_MAP = {
  AccountBalance: 'Control',
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
  KeyReport: 'Control',
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
  template: can.stache(template),
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
      isMappableExternally: false,
      searchModel: null,
      megaRelationObj: null,
      showAsSnapshots: function () {
        if (this.attr('freezedConfigTillSubmit.useSnapshots')) {
          return true;
        }
        return false;
      },
      isSnapshotMapping: function () {
        let isSnapshotParentSrc = isSnapshotParent(this.attr('object'));
        let isSnapshotParentDst = isSnapshotParent(this.attr('type'));
        let isSnapshotModelSrc = isSnapshotModel(this.attr('object'));
        let isSnapshotModelDst = isSnapshotModel(this.attr('type'));

        let result =
          // Show message if source is snapshotParent and destination is snapshotable.
          (isSnapshotParentSrc && isSnapshotModelDst) ||
          // Show message if destination is snapshotParent and source is snapshotable.
          (isSnapshotParentDst && isSnapshotModelSrc);

        return result;
      },
      updateFreezedConfigToLatest: function () {
        this.attr('freezedConfigTillSubmit', this.attr('currConfig'));
      },
      onSubmit: function () {
        this.updateFreezedConfigToLatest();
        this.attr('searchModel', this.attr('model'));

        let source = this.attr('object');
        let destination = this.attr('type');
        if (Mappings.shouldBeMappedExternally(source, destination)) {
          this.attr('isMappableExternally', true);
          return;
        } else {
          this.attr('isMappableExternally', false);
          // calls base version
          this._super(...arguments);
        }
      },
    });
  },

  events: {
    [`{parentInstance} ${MAP_OBJECTS.type}`](instance, event) {
      // this event is called when objects just created and should be mapped
      // so object-mapper modal should be closed and removed from DOM
      this.closeModal();

      if (event.objects.length) {
        this.map(event.objects, event.options);
      }
    },
    // hide object-mapper modal when create new object button clicked
    'create-and-map click'() {
      this.element.trigger('hideModal');
    },
    // close mapper as mapping will be handled externally
    'create-and-map mapExternally'() {
      this.closeModal();
    },
    // reopen object-mapper if creating was canceled
    'create-and-map canceled'() {
      this.element.trigger('showModal');
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

      self.viewModel.onSubmit();
    },
    map(objects, options) {
      const viewModel = this.viewModel;

      viewModel.updateFreezedConfigToLatest();

      if (this.viewModel.attr('deferred')) {
        // postpone map operation unless target object is saved
        this.deferredSave(objects);
      } else {
        let megaMapping;
        let relationsObj;

        if (options && options.megaMapping) {
          megaMapping = options.megaMapping;
          relationsObj = {};
          objects.forEach((obj) => relationsObj[obj.id] = options.megaRelation);
        }
        // map objects immediately
        this.mapObjects(objects, megaMapping, relationsObj);
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
      // If we need to map object later on (set by 'data-deferred' attribute)
      // TODO: Figure out nicer / proper way to handle deferred save
      if (this.viewModel.attr('deferred')) {
        return this.deferredSave(selectedObjects);
      }

      const megaMapping = isMegaMapping(this.viewModel.attr('object'),
        this.viewModel.attr('type'));

      if (megaMapping) {
        this.proceedWithMegaMapping(selectedObjects);
      } else {
        this.proceedWithRegularMapping(selectedObjects);
      }
    },
    proceedWithMegaMapping(selectedObjects) {
      confirm({
        modal_title: 'Confirmation',
        modal_description: 'Objects from the child program will' +
        ' automatically be mapped to parent program. Do you want' +
        ' to proceed?',
        modal_confirm: 'Proceed',
        button_view:
          `${GGRC.templates_path}/modals/confirm_cancel_buttons.stache`,
      }, () => {
        this.viewModel.attr('is_saving', true);
        this.mapObjects(selectedObjects, true,
          this.viewModel.attr('megaRelationObj'));
      });
    },
    proceedWithRegularMapping(selectedObjects) {
      this.viewModel.attr('is_saving', true);
      this.mapObjects(selectedObjects);
    },
    mapObjects(objects, megaMapping, relationsObj) {
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
        megaMapping,
        relationsObj,
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
