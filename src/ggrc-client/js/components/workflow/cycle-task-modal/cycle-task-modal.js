/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Mappings from '../../../models/mappers/mappings';
import * as businessModels from '../../../models/business-models';

/**
 * @typedef {Object} Stub
 * @property {number} id - id of a pre-mapped object
 * @property {string} type - type of a pre-mapped object
 */

const viewModel = can.Map.extend({
  instance: null,
  /**
  * @type {can.Model.Cacheable[]}
  */
  mappedObjects: [],
  /**
  * @type {Stub[]}
  */
  preMappedStubs: [],
  /**
  * @type {can.Model.Cacheable[]}
  */
  preMappedObjects: [],
  loadPreMappedObjects() {
    return this.attr('preMappedStubs').map((stub) =>
      businessModels[stub.type].findInCacheById(stub.id)
    );
  },
  async loadMappedObjects() {
    const mappedObjectsBindings = await Mappings
      .getBinding('info_related_objects', this.attr('instance'))
      .refresh_instances();
    return mappedObjectsBindings.map((binding) =>
      binding.instance ||
      binding
    );
  },
  async init() {
    this.attr('preMappedObjects', this.loadPreMappedObjects());
    this.attr('mappedObjects', await this.loadMappedObjects());
  },
});

export default can.Component.extend({
  tag: 'cycle-task-modal',
  leakScope: true,
  viewModel,
});
