/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './recently-viewed.mustache';
import {getRecentlyViewedObjects} from '../../plugins/utils/recently-viewed-utils';
import * as businessModels from '../../models/business-models';

export default can.Component.extend({
  tag: 'recently-viewed',
  template,
  leakScope: true,
  viewModel: {
    items: [],
  },
  init() {
    let objects = getRecentlyViewedObjects();
    let items = _.map(objects, (obj) => {
      return {
        viewLink: obj.viewLink,
        title: obj.title,
        icon: businessModels[obj.type].table_singular,
      };
    });
    this.viewModel.attr('items', items);
  },
});
