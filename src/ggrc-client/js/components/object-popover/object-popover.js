/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../show-more/show-more';
import template from './object-popover.mustache';

const tag = 'object-popover';
const defaultMaxInnerHeight = 400;
const defaultRightPosition = 60;
/**
 * Assessment specific mapped objects popover view component
 */
export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    expanded: false,
    direction: 'left',
    maxInnerHeight: defaultMaxInnerHeight,
    openStyle: '',
    item: null,
    popoverTitleInfo: '',
    popoverTitle: 'No Title is provided',
    popoverLink: '/dashboard',
    isActive: function () {
      return this.attr('active');
    },
    setPopoverStyle: function (el, direction) {
      let pos = el[0].getBoundingClientRect();
      let top = Math.floor(el.position().top);
      let left = Math.floor(pos.width / 2);
      let width = (direction !== 'right') ?
        Math.floor(window.innerWidth - (pos.right - pos.width / 2)) :
        Math.floor(pos.width * 0.7);
      let topStyle = 'top: ' + top + 'px;';
      let leftStyle = 'left: ' + left + 'px;';
      let widthStyle = 'width: ' + width + 'px;';
      let rightStyle = 'right: ' + defaultRightPosition + 'px;';

      if (direction === 'right') {
        return topStyle + rightStyle + widthStyle;
      }
      return topStyle + leftStyle + widthStyle;
    },
    setStyle: function (el) {
      let direction = this.attr('direction');
      let style = el ? this.setPopoverStyle(el, direction) : '';
      this.attr('active', style.length);
      this.attr('openStyle', style);
      this.attr('expanded', false);
    },
  },
  events: {
    '{viewModel.item} el': function (scope, ev, el) {
      this.viewModel.setStyle(el);
    },
    '.object-popover-wrapper click': function (el, event) {
      event.stopPropagation();
    },
    '{viewModel} expanded': function (scope, ev, isExpanded) {
      // Double max height property in case additional content is expanded and visible
      let maxInnerHeight = isExpanded ?
        defaultMaxInnerHeight * 2 :
        defaultMaxInnerHeight;
      this.viewModel.attr('maxInnerHeight', maxInnerHeight);
    },
  },
});
