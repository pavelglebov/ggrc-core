/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  isSnapshotType,
} from '../plugins/utils/snapshot-utils';
import * as MapperUtils from '../plugins/utils/mapper-utils';
import {
  REFRESH_MAPPING,
  REFRESH_SUB_TREE,
  DEFERRED_MAP_OBJECTS,
} from '../events/eventTypes';
import {getPageInstance} from '../plugins/utils/current-page-utils';

export default can.Component.extend({
  tag: 'deferred-mapper',
  leakScope: true,
  viewModel: {
    define: {
      instance: {
        set(instance) {
          // _pendingJoins is set to instance only to check
          // whether instance is dirty on modals
          if (instance) {
            instance.attr('_pendingJoins', []);
          }
          return instance;
        },
      },
      // objects which should be mapped to new instance
      // in this case 'mappedObjects' should be empty
      preMappedObjects: {
        value: [],
        set(objects) {
          if (objects.length) {
            this.addMappings(objects);
            this.updateListWith(objects);
          }

          return objects;
        },
      },
      // objects which already mapped to 'instance'
      // in this case 'preMappedObjects' should be empty
      mappedObjects: {
        value: [],
        set(objects) {
          if (objects.length) {
            this.updateListWith(objects);
          }

          return objects;
        },
      },
    },
    useSnapshots: false,
    instance: null,
    list: [],
    performMapActions(instance, objects) {
      let pendingMap = Promise.resolve();

      if (objects.length > 0) {
        pendingMap = MapperUtils.mapObjects(instance, objects, {
          useSnapshots: this.attr('useSnapshots'),
        });
      }

      return pendingMap;
    },
    performUnmapActions(instance, objects) {
      let pendingUnmap = Promise.resolve();

      if (objects.length > 0) {
        pendingUnmap = MapperUtils.unmapObjects(instance, objects);
      }

      return pendingUnmap;
    },
    afterDeferredUpdate(objects) {
      const instance = this.attr('instance');
      const objectTypes = _.uniq(objects
        .map((object) => object.type)
      );

      objectTypes.forEach((objectType) => {
        instance.dispatch({
          ...REFRESH_MAPPING,
          destinationType: objectType,
        });
      });
      instance.dispatch(REFRESH_SUB_TREE);

      const pageInstance = getPageInstance();
      const pageInstanceIndex = _.findIndex(objects, ({id, type}) =>
        id === pageInstance.id &&
        type === pageInstance.type
      );

      if (pageInstanceIndex !== -1) {
        pageInstance.dispatch({
          ...REFRESH_MAPPING,
          destinationType: instance.type,
        });
      }
    },
    async deferredUpdate() {
      const instance = this.attr('instance');
      const pendingJoins = instance.attr('_pendingJoins');
      const objectsToMap =
        _.filter(pendingJoins, ({how}) => how === 'map')
          .map(({what}) => what);
      const objectsToUnmap =
        _.filter(pendingJoins, ({how}) => how === 'unmap')
          .map(({what}) => what);


      await Promise.all([
        this.performMapActions(instance, objectsToMap),
        this.performUnmapActions(instance, objectsToUnmap),
      ]);

      instance.attr('_pendingJoins', []);

      const objects = objectsToMap.concat(objectsToUnmap);
      this.afterDeferredUpdate(objects);
    },
    _indexOfPendingJoin(object, action) {
      return _.findIndex(this.attr('instance._pendingJoins'),
        ({what, how}) =>
          what.id === object.id &&
          what.type === object.type &&
          how === action
      );
    },
    addMappings(objects) {
      const pendingJoins = this.attr('instance._pendingJoins');

      objects.forEach((obj) => {
        const indexOfUnmap = this._indexOfPendingJoin(obj, 'unmap');

        if (indexOfUnmap !== -1) {
          pendingJoins.splice(indexOfUnmap, 1);
        } else {
          pendingJoins.push({
            what: obj,
            how: 'map',
          });
        }

        this.addListItem(obj);
      });
    },
    removeMappings(obj) {
      const pendingJoins = this.attr('instance._pendingJoins');
      const indexOfMap = this._indexOfPendingJoin(obj, 'map');

      if (indexOfMap !== -1) {
        pendingJoins.splice(indexOfMap, 1);
      } else {
        pendingJoins.push({
          what: obj,
          how: 'unmap',
        });
      }

      const indexInList = _.findIndex(this.attr('list'),
        ({id, type}) => id === obj.id && type === obj.type);
      this.attr('list').splice(indexInList, 1);
    },
    addListItem(item) {
      let snapshotObject;

      if (isSnapshotType(item) &&
        item.snapshotObject) {
        snapshotObject = item.snapshotObject;
        item.attr('title', snapshotObject.title);
        item.attr('description', snapshotObject.description);
        item.attr('class', snapshotObject.class);
        item.attr('viewLink', snapshotObject.originalLink);
      } else if (!isSnapshotType(item) && item.reify) {
        // add full item object from cache
        // if it isn't snapshot
        item = item.reify();
      }

      this.attr('list').push(item);
    },
    updateListWith(objects = []) {
      this.attr('list', []);
      objects.forEach((obj) => this.addListItem(obj));
    },
  },
  events: {
    '{instance} updated'() {
      this.viewModel.deferredUpdate();
    },
    '{instance} created'() {
      this.viewModel.deferredUpdate();
    },
    [`{instance} ${DEFERRED_MAP_OBJECTS.type}`](el, {objects}) {
      this.viewModel.addMappings(objects);
    },
    removed() {
      const instance = this.viewModel.attr('instance');

      if (instance) {
        instance.removeAttr('_pendingJoins');
      }
    },
  },
});
