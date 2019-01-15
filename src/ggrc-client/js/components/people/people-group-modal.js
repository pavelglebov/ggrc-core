/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../person/person-data';
import template from './templates/people-group-modal.mustache';

export default can.Component.extend({
  tag: 'people-group-modal',
  template,
  leakScope: true,
  viewModel: {
    define: {
      selectedCount: {
        get: function () {
          return `${this
            .attr('people.length')} ${this.attr('title')} Selected`;
        },
      },
    },
    modalState: {
      open: true,
    },
    isLoading: false,
    emptyListMessage: '',
    title: '',
    people: [],
    cancel() {
      this.attr('modalState.open', false);
      this.dispatch('cancel');
    },
    save() {
      this.attr('modalState.open', false);
      this.dispatch('save');
    },
  },
});
