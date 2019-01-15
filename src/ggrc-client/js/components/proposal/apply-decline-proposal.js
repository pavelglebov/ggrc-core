/*
 Copyright (C) 2019 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/apply-decline-proposal.mustache';
import {REFRESH_TAB_CONTENT} from '../../events/eventTypes';
import {formatDate} from '../../plugins/utils/date-utils';
import Proposal from '../../models/service-models/proposal';
const tag = 'apply-decline-proposal';

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    define: {
      canDisplayApplyButton: {
        get() {
          const proposalStatus = this.attr('proposal.status');
          return proposalStatus === 'proposed' ||
            proposalStatus === 'declined';
        },
      },
      canDisplayDeclineButton: {
        get() {
          const proposalStatus = this.attr('proposal.status');
          return proposalStatus === 'proposed';
        },
      },
    },
    $el: null,
    proposal: {},
    instance: {},
    isLoading: false,
    actionComment: '',
    getModalDescriptionText(isDecline) {
      const date = formatDate(this.attr('proposal.created_at'));
      const email = this.attr('proposal.proposed_by.email');
      const action = isDecline ? 'declining' : 'applying';

      return `You're ${action} the version - ${email}, ${date}`;
    },
    closeModal() {
      this.attr('actionComment', '');
      this.attr('$el')
        .closest('.modal').find('.modal-dismiss').trigger('click');
    },
    confirm(isApply) {
      this.attr('isLoading', true);

      // refresh for getting E-tag
      this.attr('proposal').refresh().then(() => {
        this.prepareDataAndSave(isApply);
      });
    },
    prepareDataAndSave(isApply) {
      const comment = this.attr('actionComment');
      // create new model. No need to 'PUT' full object data
      const proposalModel = new Proposal();

      if (isApply) {
        proposalModel.attr('apply_reason', comment);
        proposalModel.attr('status', 'applied');
      } else {
        proposalModel.attr('decline_reason', comment);
        proposalModel.attr('status', 'declined');
      }

      proposalModel.attr('id', this.attr('proposal.id'));

      proposalModel.save().then(
        () => {
          this.attr('isLoading', false);
          this.closeModal();

          if (isApply) {
            this.refreshPage();
          }
        },
        (error) => {
          console.warn(error);
        }
      );
    },
    refreshPage() {
      const instance = this.attr('instance');
      instance.refresh().then(() => {
        instance.dispatch({
          ...REFRESH_TAB_CONTENT,
          tabId: 'tab-related-proposals',
        });
      });
    },
  },
  events: {
    inserted() {
      this.viewModel.attr('$el', this.element);
    },
  },
});
