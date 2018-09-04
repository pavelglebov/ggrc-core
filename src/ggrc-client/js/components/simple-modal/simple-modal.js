/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './simple-modal.mustache';
import escStack from '../../plugins/utils/esc-stack-utils';

/**
 * Simple Modal Component is a general abstraction to visualize
 * modal and pop-ups with overlay.
 * Simple Modal can be initialized in any part of the HTML.
 * Simple Modal provides only logic less basic markup. All business logic should be placed on the level of inner components.
 * To simplify styling additional helper CSS classes were created: 'simple-modal__footer', 'simple-modal__body' and 'simple-modal__header'
 */
export default can.Component.extend({
  tag: 'simple-modal',
  template,
  viewModel: {
    extraCssClass: '@',
    instance: {},
    modalTitle: '',
    replaceContent: false,
    isDisabled: false,
    modalWrapper: null,
    state: {
      open: false,
    },
    // 'performHide' doesn't know it was called from Esc
    // or other way, thus we need to point it
    processingEsc: false,
    hide: function () {
      this.attr('state.open', false);
    },
    toggle(show) {
      show ? this.performShow() : this.performHide();
    },
    performShow: function () {
      this.attr('modalWrapper').modal('showWithEsc');
      escStack.add(this.escHandler.bind(this));
    },
    // as we extended work with .modal(...),
    // 'performHide' needs to call different methods
    performHide() {
      let modalMethod = 'hide';

      if (this.attr('processingEsc')) {
        modalMethod = 'hideByEsc';
        this.attr('processingEsc', false);
      }

      this.attr('modalWrapper').modal(modalMethod);
      can.trigger(this.attr('modalWrapper'), 'simple-modal:dismiss');
    },
    escHandler: function () {
      this.attr('processingEsc', true);
      this.attr('state.open', false);
      return true;
    },
  },
  events: {
    inserted() {
      const viewModel = this.viewModel;
      const modalWrapper = this.element
        .find('[data-modal-wrapper-target="true"]');
      viewModel.attr('modalWrapper', modalWrapper);

      if (viewModel.attr('state.open')) {
        viewModel.show();
      }
    },
    '{viewModel.state} open'(state, ev, newValue) {
      this.viewModel.toggle(newValue);
    },
  },
});
