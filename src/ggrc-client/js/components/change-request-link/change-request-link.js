/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import template from './templates/change-request-link.stache';

const viewModel = canMap.extend({
  define: {
    link: {
      get() {
        return GGRC.config.CHANGE_REQUEST_URL;
      },
    },
  },
});

export default canComponent.extend({
  tag: 'change-request-link',
  view: canStache(template),
  leakScope: true,
  viewModel,
});
