/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import './export-panel';
import template from './templates/export-group.mustache';
import panelModel from './panel';

export default can.Component.extend('exportGroup', {
  tag: 'export-group',
  template,
  leakScope: true,
  viewModel: {
    define: {
      isRemovable: {
        get() {
          return this.attr('panels.length') > 1;
        },
      },
    },
    panels: [],
    index: 0,
    getIndex: function (el) {
      return Number($(el.closest('export-panel'))
        .viewModel().attr('panel_index'));
    },
    removeFilterGroup(el) {
      let index = this.getIndex(el);

      this.attr('panels').splice(index, 1);
    },
    addObjectType(data = {}) {
      let index = this.attr('index') + 1;

      data = data || {};
      if (!data.type) {
        data.type = 'Program';
      } else if (data.isSnapshots === 'true') {
        data.snapshot_type = data.type;
        data.type = 'Snapshot';
      }

      this.attr('index', index);
      return this.attr('panels').push(new panelModel(data));
    },
  },
  events: {
    inserted: function () {
      this.viewModel.addObjectType({
        type: 'Program',
        isSnapshots: false,
      });
    },
  },
});
