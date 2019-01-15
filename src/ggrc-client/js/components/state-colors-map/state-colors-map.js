/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

/* Default Sate for Assessment should be 'Not Started' */
const defaultState = 'Not Started';
const template =
  `<span class="state-value-dot state-{{suffix}} {{verified}}">
    {{state}}
  </span>`;

/**
 * can.Map(ViewModel) presenting behavior of State Colors Map Component
 * @type {can.Map}
 */
let viewModel = can.Map.extend({
  define: {
    state: {
      type: 'string',
      value: defaultState,
    },
    suffix: {
      get: function () {
        let state = this.attr('state') || defaultState;
        return state.toLowerCase().replace(/[\s\t]+/g, '');
      },
    },
    verified: {
      get: function (value) {
        return value ? 'verified' : '';
      },
    },
  },
});
/**
 * Simple Component to add color indication for Assessment State Name
 */
export default can.Component.extend({
  tag: 'state-colors-map',
  template,
  leakScope: true,
  viewModel,
});
