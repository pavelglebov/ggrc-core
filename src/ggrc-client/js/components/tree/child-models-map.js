/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  getChildTreeDisplayList,
  setChildTreeDisplayList,
} from '../../plugins/utils/display-prefs-utils';
import * as businessModels from '../../models/business-models/index';
import {isMegaObjectRelated} from '../../plugins/utils/mega-object-utils';

const childModelsMap = can.Map.extend({
  container: {},
  getModels: function (parentType) {
    if (!this.attr('container.' + parentType)) {
      let savedModels = getChildTreeDisplayList(parentType);

      if (savedModels) {
        // filter types that do not exist
        // (mega object relations are not business types but need to be passed)
        savedModels = savedModels.filter((type) =>
          businessModels[type] || isMegaObjectRelated(type));
      }

      this.attr('container').attr(parentType, savedModels);
    }
    return this.attr('container.' + parentType);
  },
  setModels: function (parentType, newModels) {
    this.attr('container').attr(parentType, newModels);

    setChildTreeDisplayList(parentType, newModels);
  },
});

export default new childModelsMap();
