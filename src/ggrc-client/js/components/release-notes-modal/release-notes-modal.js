/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../release-notes-list/release-notes-list';

import template from './release-notes-modal.mustache';

const viewModel = can.Map.extend({
  define: {
    shortVersion: {
      type: 'string',
      get() {
        if (!GGRC.config.VERSION) {
          return '';
        }

        return GGRC.config.VERSION.replace(/ \(.*\)/, '');
      },
    },
    releaseNotesDate: {
      type: 'string',
      get() {
        return moment(BUILD_DATE).format('MMM D, YYYY');
      },
    },
  },
  modalTitle: 'What\'s new',
});

export default can.Component.extend({
  tag: 'release-notes-modal',
  template,
  leakScope: true,
  viewModel,
});
