/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './templates/feedback-link.mustache';

const viewModel = can.Map.extend({
  define: {
    link: {
      get() {
        return GGRC.config.CREATE_ISSUE_URL;
      },
    },
    title: {
      get() {
        return can.capitalize(GGRC.config.CREATE_ISSUE_BUTTON_NAME) ||
          'Feedback';
      },
    },
  },
});

export default can.Component.extend({
  tag: 'feedback-link',
  template,
  leakScope: true,
  viewModel,
});
