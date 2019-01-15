/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../lazy-render/lazy-render';
import '../show-related-assessments-button/show-related-assessments-button';
import template from './templates/tree-item-actions.mustache';
import {
  isSnapshot,
} from '../../plugins/utils/snapshot-utils';
import {
  getPageType,
} from '../../plugins/utils/current-page-utils';
import Permission from '../../permission';
import Mapper from '../../models/mappers/mappings';

const tag = 'tree-item-actions';
const forbiddenEditList = ['Cycle', 'CycleTaskGroup'];

const viewModel = can.Map.extend({
  define: {
    deepLimit: {
      type: 'number',
      value: 0,
    },
    canExpand: {
      type: 'boolean',
      value: false,
    },
    expandIcon: {
      type: 'string',
      get() {
        return this.attr('expanded') ? 'compress' : 'expand';
      },
    },
    expanderTitle: {
      type: 'string',
      get() {
        return this.attr('expanded') ? 'Collapse tree' : 'Expand tree';
      },
    },
    isSnapshot: {
      type: 'boolean',
      get() {
        return isSnapshot(this.attr('instance'));
      },
    },
    isAllowedToEdit: {
      type: 'boolean',
      get() {
        let instance = this.attr('instance');
        let type = instance.attr('type');
        let isSnapshot = this.attr('isSnapshot');
        let isArchived = instance.attr('archived');
        let isInForbiddenList = forbiddenEditList.indexOf(type) > -1;
        return Permission.is_allowed_for('update', instance) &&
          !(isSnapshot || isInForbiddenList || isArchived);
      },
    },
    isAllowedToMap: {
      type: 'boolean',
      get() {
        let type = this.attr('instance.type');
        let audit = this.attr('instance.audit');
        if ((type === 'Assessment') &&
          (!audit ||
          !Permission.is_allowed_for('read', audit))) {
          return false;
        }
        let isAllowedToEdit = this.attr('isAllowedToEdit');
        let mappingTypes = Mapper.getMappingList(type);

        return isAllowedToEdit && !!mappingTypes.length;
      },
    },
  },
  maximizeObject(scope, el, ev) {
    ev.preventDefault();
    ev.stopPropagation();

    this.dispatch({
      type: 'preview',
      element: el,
    });
  },
  $el: null,
  openObject(scope, el, ev) {
    ev.stopPropagation();
  },
  expand(scope, el, ev) {
    this.dispatch('expand');
    ev.stopPropagation();
  },
  subTreeTypes() {
    can.trigger(this.attr('$el'), 'childTreeTypes');
  },
  instance: null,
  childOptions: null,
  addItem: null,
  isAllowToExpand: null,
  childModelsList: null,
  expanded: false,
  activated: false,
  showReducedIcon() {
    let pages = ['Workflow'];
    let instanceTypes = [
      'Cycle',
      'CycleTaskGroup',
      'CycleTaskGroupObjectTask',
    ];
    return _.includes(pages, getPageType()) &&
      _.includes(instanceTypes, this.attr('instance').type);
  },
  showReducedOptions() {
    let pages = ['Workflow'];
    let instanceTypes = [
      'Cycle',
      'CycleTaskGroup',
    ];
    return _.includes(pages, getPageType()) &&
      _.includes(instanceTypes, this.attr('instance').type);
  },
});

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel,
  events: {
    inserted() {
      let parents = this.element.parents('sub-tree-wrapper').length;
      let canExpand = parents < this.viewModel.attr('deepLimit');
      this.viewModel.attr('canExpand', canExpand);
      this.viewModel.attr('$el', this.element);
    },
    '.tree-item-actions__content mouseenter'(el, ev) {
      let vm = this.viewModel;

      if (!vm.attr('activated')) {
        vm.attr('activated', true);
      }
      // event not needed after render of content
      el.off(ev);
    },
  },
});
