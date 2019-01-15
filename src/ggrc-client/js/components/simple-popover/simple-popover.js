/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './simple-popover.mustache';

export default can.Component.extend({
  tag: 'simple-popover',
  template: template,
  init: function (el) {
    this.viewModel.attr('element', el);
  },
  leakScope: true,
  viewModel: can.Map.extend({
    extraCssClass: '@',
    placement: '@',
    buttonText: '',
    open: false,
    show: function () {
      this.attr('open', true);
      document.addEventListener('mousedown', this);
    },
    hide: function () {
      this.attr('open', false);
      document.removeEventListener('mousedown', this);
    },
    toggle: function () {
      this.attr('open') ? this.hide() : this.show();
    },
    handleEvent: function (event) {
      if (this.attr('element')
        && !this.attr('element').contains(event.target)) {
        this.hide();
      }
    },
  }),
  events: {
    removed: function () {
      document.removeEventListener('mousedown', this.viewModel);
    },
  },
});
