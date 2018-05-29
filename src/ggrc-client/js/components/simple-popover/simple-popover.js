/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './simple-popover.mustache';

export default can.Component.extend({
  tag: 'simple-popover',
  template: template,
  init: function (el) {
    this.viewModel.element = el;
  },
  viewModel: can.Map.extend({
    extraCssClass: '@',
    placement: '@',
    buttonText: '',
    open: false,
    show: function () {
      this.attr('open', true);
    },
    hide: function () {
      this.attr('open', false);
    },
    toggle: function () {
      this.attr('open', !this.attr('open'));
    },
    handleOutsideClick: function (event) {
      if (this.element && !this.element.contains(event.target)) {
        this.hide();
      }
    },
  }),
  events: {
    'inserted': function () {
      if (!this.viewModel.outsideClickHandler) {
        this.viewModel.outsideClickHandler = this.viewModel.handleOutsideClick.bind(this.viewModel);
        document.addEventListener('mousedown', this.viewModel.outsideClickHandler);
      }
    },
    'removed': function () {
      document.removeEventListener('mousedown', this.viewModel.outsideClickHandler);
    },
  }
});
