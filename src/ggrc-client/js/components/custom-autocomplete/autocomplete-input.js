/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

// The component for 'custom-autocomplete'. Handles user input and propagates it
// to 'autocomplete-wrapper'.

import template from './templates/autocomplete-input.mustache';

export const keyMap = {
  ENTER: 13,
  ESCAPE: 27,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
};

export default can.Component.extend({
  tag: 'autocomplete-input',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      // flag for showing 'autocomplete-result'
      showResults: {
        set: function (newValue) {
          if (!newValue) {
            this.attr('value', '');
          }
          return newValue;
        },
      },
    },
    value: '',
    // flag for input latency
    isPending: false,
    excludedKeys: Object.values(keyMap),
    makeServiceAction: function (keyCode) {
      switch (keyCode) {
        case keyMap.ESCAPE:
          this.escape();
          break;
        default:
          break;
      }
    },
    escape: function () {
      this.attr('showResults', false);
    },
    // wait input for 500 ms before send request
    inputLatency: function () {
      this.attr('isPending', true);

      setTimeout(() => {
        let val = this.attr('value');

        if (val) {
          this.dispatch({
            type: 'inputChanged',
            value: val,
          });
        }
        this.attr('isPending', false);
      }, 500);
    },
  },
  events: {
    'input.autocomplete-input keyup': function (element, event) {
      let viewModel = this.viewModel;
      viewModel.attr('value', element.val().trim());

      if (!viewModel.attr('isPending')) {
        let keys = viewModel.attr('excludedKeys');

        if (keys.indexOf(event.keyCode) !== -1) {
          viewModel.makeServiceAction(event.keyCode);
          return;
        }

        viewModel.inputLatency();
      }
    },
  },
});
