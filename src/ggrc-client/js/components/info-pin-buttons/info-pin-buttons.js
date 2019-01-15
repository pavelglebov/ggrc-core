/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './info-pin-buttons.mustache';


export default can.Component.extend({
  tag: 'info-pin-buttons',
  template,
  leakScope: true,
  viewModel: {
    onChangeMaximizedState: null,
    onClose: null,
    define: {
      maximized: {
        type: 'boolean',
        'default': false,
      },
    },
    toggleSize: function (el, ev) {
      let maximized = !this.attr('maximized');
      let onChangeMaximizedState =
          Mustache.resolve(this.onChangeMaximizedState);
      ev.preventDefault();

      onChangeMaximizedState(maximized);

      // Add in a callback queue
      // for executing other
      // handlers in the first place.
      // Without it CanJS will ignore them
      setTimeout(function () {
        this.attr('maximized', maximized);
      }.bind(this), 0);
    },
    close: function (el, ev) {
      let onClose = Mustache.resolve(this.onClose);
      $(el).find('[rel="tooltip"]').tooltip('hide');
      ev.preventDefault();
      onClose();
    },
  },
});
