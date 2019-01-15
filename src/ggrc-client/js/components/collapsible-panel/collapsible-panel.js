/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './collapsible-panel-header';
import './collapsible-panel-body';
import template from './collapsible-panel.mustache';

const tag = 'collapsible-panel';
let viewModel = can.Map.extend({
  titleText: '@',
  titleIcon: '@',
  extraCssClass: '@',
  softMode: false,
  define: {
    /**
     * Public attribute to indicate expanded/collapsed status of the component
     * @type {Boolean}
     * @public
     */
    expanded: {
      type: 'boolean',
      value: false,
    },
  },
});
/**
 * Collapsible Panel component to add expand/collapse behavior
 */
export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel,
});
