/*
 Copyright (C) 2019 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Proposal from '../../models/service-models/proposal';
import template from './templates/create-proposal.mustache';
import {hasPending as hasPendingUtil} from '../../plugins/ggrc_utils';
import {
  REFRESH_TAB_CONTENT,
  REFRESH_COMMENTS,
} from '../../events/eventTypes';
const tag = 'create-proposal';

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    define: {
      isDisabled: {
        type: Boolean,
        get() {
          let hasErrors = this.instance.computed_unsuppressed_errors();
          return hasErrors || !this.hasChanges() || this.attr('loading');
        },
      },
    },
    instance: {},
    proposalAgenda: '',
    loading: false,
    create(element, event) {
      const instance = this.attr('instance');
      const instanceFields = instance.attr();
      let proposal;

      event.preventDefault();
      this.attr('loading', true);

      proposal = {
        agenda: this.attr('proposalAgenda'),
        instance: {
          id: instanceFields.id,
          type: instanceFields.type,
        },
        full_instance_content: instanceFields,
        context: instanceFields.context,
      };

      this.saveProposal(proposal, element);
    },
    saveProposal(proposal, element) {
      const instance = this.attr('instance');

      new Proposal(proposal).save().then(
        () => {
          this.attr('loading', false);
          instance.restore(true);
          instance.dispatch({
            ...REFRESH_TAB_CONTENT,
            tabId: 'tab-related-proposals',
          });
          instance.dispatch(REFRESH_COMMENTS);
          this.closeModal(element);
        }, (error) => {
          this.attr('loading', false);
          console.error(error.statusText);
        }
      );
    },
    closeModal(element) {
      // TODO: fix
      $(element).closest('.modal')
        .find('.modal-dismiss')
        .trigger('click');
    },
    hasChanges() {
      const instance = this.attr('instance');
      const hasPending = hasPendingUtil(instance);
      const isDirty = instance.isDirty(true);

      return isDirty || hasPending;
    },
  },
});
