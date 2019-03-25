/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */


 /*
  Component to preset radio buttons` values
 */
export default can.Component.extend({
  tag: 'radio-button',
  template: '<content></content>',
  leakScope: false,
  viewModel: {
    targetValue: false,
  },
  events: {
    inserted(el) {
      const val = this.viewModel.attr('targetValue');
      const trueBox = el[0].querySelector('[value=true]');
      const falseBox = el[0].querySelector('[value=false]');

      trueBox.checked = val === null ? false : !!val;
      falseBox.checked = val === null ? false : !val;
    },
    'click': function (el, ev) {
      // to prevent expanding of a row in mapper
      ev.stopPropagation();
    },
  },
});
