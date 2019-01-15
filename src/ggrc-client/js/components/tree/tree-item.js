/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../lazy-render/lazy-render';
import '../cycle-task-actions/cycle-task-actions';
import './tree-item-attr';
import './tree-item-custom-attribute';
import BaseTreeItemVM from './tree-item-base-vm';
import template from './templates/tree-item.mustache';

let viewModel = BaseTreeItemVM.extend({
  define: {
    extraClasses: {
      type: String,
      get() {
        let classes = [];
        let instance = this.attr('instance');

        if (instance.snapshot) {
          classes.push('snapshot');
        }

        if (instance.workflow_state) {
          classes.push('t-' + instance.workflow_state);
        }

        if (this.attr('expanded')) {
          classes.push('open-item');
        }

        return classes.join(' ');
      },
    },
    selectableSize: {
      type: Number,
      get() {
        let attrCount = this.attr('selectedColumns').length;
        let result = 3;

        if (attrCount < 4) {
          result = 1;
        } else if (attrCount < 7) {
          result = 2;
        }

        return result;
      },
    },
  },
  instance: null,
  selectedColumns: [],
  mandatory: [],
  disableConfiguration: null,
  itemSelector: '.tree-item-content',
});

export default can.Component.extend({
  tag: 'tree-item',
  template,
  leakScope: true,
  viewModel,
  events: {
    inserted() {
      this.viewModel.attr('$el', this.element.find('.tree-item-wrapper'));
    },
  },
});
