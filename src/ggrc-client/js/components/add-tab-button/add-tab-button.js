/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './add-tab-button.mustache';
import {
  getPageType,
  isMyWork,
  isAllObjects,
} from '../../plugins/utils/current-page-utils';
import Permission from '../../permission';
import Mappings from '../../models/mappers/mappings';

const viewModel = can.Map.extend({
  define: {
    isAuditInaccessibleAssessment: {
      get() {
        let audit = this.attr('instance.audit');
        let type = this.attr('instance.type');
        let result = (type === 'Assessment') &&
          !!audit &&
          !Permission.is_allowed_for('read', audit);
        return result;
      },
    },
    shouldShow: {
      get() {
        let instance = this.attr('instance');

        return !this.attr('isAuditInaccessibleAssessment')
          && Permission.is_allowed_for('update', instance)
          && !instance.attr('archived')
          && !isMyWork()
          && !isAllObjects()
          && !['Person', 'Evidence'].includes(getPageType())
          && this.attr('hasHiddenWidgets');
      },
    },
    filteredWidgets: {
      get() {
        let widgetList = this.attr('widgetList');

        return _.filter(widgetList, (widget) => {
          return this.isNotObjectVersion(widget.internav_display) &&
            !this.isNotProhibitedMap(widget.model.shortName) &&
            widget.attr('placeInAddTab');
        });
      },
    },
  },
  instance: null,
  widgetList: null,
  urlPath: '',
  addTabTitle: '',
  hasHiddenWidgets: true,
  isNotObjectVersion(internavDisplay) {
    return internavDisplay.indexOf('Versions') === -1;
  },
  isNotProhibitedMap(shortName) {
    const prohibitedMapList = {
      Issue: ['Assessment', 'Audit'],
      Assessment: ['Evidence'],
    };

    const instanceType = this.attr('instance.type');

    return prohibitedMapList[instanceType] &&
      prohibitedMapList[instanceType].includes(shortName);
  },
  isAllowedToMap(target) {
    let source = this.attr('instance');
    let isMappable = Mappings.isMappableType(source.attr('type'), target);
    let canMap = Mappings.allowedToMap(source, target);

    return isMappable && canMap;
  },
  sortWidgets() {
    this.attr('widgetList',
      _.sortBy(this.attr('widgetList'), 'internav_display'));
  },
});

export default can.Component.extend({
  tag: 'add-tab-button',
  template,
  leakScope: true,
  viewModel,
  events: {
    // top nav dropdown position
    '.dropdown-toggle click'(el) {
      let $dropdown = this.element.find('.dropdown-menu');
      let leftPos = el.offset().left;
      let winWidth = $(window).width();

      if (winWidth - leftPos < 400) {
        $dropdown.addClass('right-pos');
      } else {
        $dropdown.removeClass('right-pos');
      }
    },
  },
  helpers: {
    shouldCreateObject(instance, modelShortName, options) {
      if (modelShortName() === 'Audit' &&
        instance().type === 'Program') {
        return options.fn(options.contexts);
      }

      return options.inverse(options.contexts);
    },
    canMapObject(modelShortName, options) {
      if (this.isAllowedToMap(modelShortName())) {
        return options.fn(options.contexts);
      }
      return options.inverse(options.contexts);
    },
  },
  init() {
    this.viewModel.sortWidgets();
  },
});
