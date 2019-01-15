/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './templates/task-group-objects.mustache';
import TaskGroupObject from '../../../models/service-models/task-group-object';
import {DEFERRED_MAP_OBJECTS} from '../../../events/eventTypes';
import {mapObjects} from '../../../plugins/utils/mapper-utils';
import {notifier} from '../../../plugins/utils/notifiers-utils';
import {
  buildParam,
  batchRequests,
} from '../../../plugins/utils/query-api-utils';
import Stub from '../../../models/stub';

const viewModel = can.Map.extend({
  canEdit: false,
  taskGroup: null,
  items: [],
  findTGObjectByStub(stub) {
    return _.find(TaskGroupObject.cache, (tgObject) =>
      tgObject.attr('object.id') === stub.id &&
      tgObject.attr('object.type') === stub.type
    );
  },
  addToList(objects) {
    const newItems = objects.map(this.convertToListItem.bind(this));
    this.attr('items').push(...newItems);
  },
  convertToListItem(object) {
    return {
      stub: new Stub(object),
      title: object.title,
      iconClass: `fa-${_.snakeCase(object.type)}`,
      disabled: false,
    };
  },
  async getTaskGroupObject(stub) {
    let tgObject = this.findTGObjectByStub(stub);

    if (!tgObject) {
      // Load all task_group_objects for taskGroup
      await this.attr('taskGroup').refresh_all('task_group_objects');
      tgObject = this.findTGObjectByStub(stub);
    }

    return tgObject;
  },
  async unmapObject(stub) {
    const tgObject = await this.getTaskGroupObject(stub);
    // Refresh is needed because witout it BE will return 409 error
    const refreshedTg = await tgObject.refresh();
    await refreshedTg.destroy();
  },
  buildObjectsFilter(stubs) {
    return {
      expression: {
        left: 'id',
        op: {name: 'IN'},
        right: stubs.map((stub) => stub.attr('id')),
      },
    };
  },
  processObjectsResponse(response) {
    return response.reduce((result, responseObj) => {
      const [{values}] = Object.values(responseObj);
      result.push(...values);
      return result;
    }, []);
  },
  buildMappedObjectsRequest(stubs) {
    const sortObject = {};
    const objectsFields = ['id', 'type', 'title'];
    const groupedStubsByType = _.groupBy(stubs, 'type');

    return _.map(groupedStubsByType, (stubs, objectsType) =>
      batchRequests(buildParam(
        objectsType,
        sortObject,
        null,
        objectsFields,
        this.buildObjectsFilter(stubs),
      ))
    );
  },
  async loadMappedObjects(stubs) {
    const batchedRequest = this.buildMappedObjectsRequest(stubs);
    const response = await Promise.all(batchedRequest);
    return this.processObjectsResponse(response);
  },
  async initTaskGroupItems() {
    const mappedObjects = await this.loadMappedObjects(
      this.attr('taskGroup.objects')
    );
    const items = mappedObjects.map(this.convertToListItem.bind(this));
    this.attr('items').replace(items);
  },
  async map(stubs) {
    const taskGroup = this.attr('taskGroup');
    await mapObjects(taskGroup, stubs);
    // Need to update "objects" field in order to  have updated list of mapped
    // objects
    taskGroup.refresh();
    const loadedObjects = await this.loadMappedObjects(stubs);
    this.addToList(loadedObjects);
  },
  async unmapByItemIndex(itemIndex) {
    const items = this.attr('items');
    const item = items[itemIndex];

    item.attr('disabled', true);
    await this.unmapObject(item.attr('stub'));
    item.attr('disabled', false);

    // remove unmapped object from the list
    // Need to get updated index because
    // "items" collection can be changed
    // in case when the user unmaps several objects -
    // "itemIndex" will store old index of item.
    items.splice(items.indexOf(item), 1);
    notifier('success', 'Unmap successful.');
  },
});

const events = {
  inserted: function () {
    // Pass taskGroup into object-mapper via "deferred_to"
    // data attribute
    this.element.find('[data-toggle="unified-mapper"]')
      .data('deferred_to', {
        instance: this.viewModel.attr('taskGroup'),
      });
  },
  [`{viewModel.taskGroup} ${DEFERRED_MAP_OBJECTS.type}`](el, {objects}) {
    this.viewModel.map(objects);
  },
  '.task-group-objects__unmap click'(el) {
    this.viewModel.unmapByItemIndex(el.attr('data-item-index'));
  },
};

const init = function () {
  this.viewModel.initTaskGroupItems();
};

export default can.Component({
  tag: 'task-group-objects',
  template,
  leakScope: true,
  viewModel,
  events,
  init,
});
