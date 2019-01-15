/*
 Copyright (C) 2019 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../proposal/review-proposal';
import '../../proposal/apply-decline-proposal';
import '../../diff/instance-fields-diff';
import '../../diff/instance-acl-diff';
import '../../diff/instance-gca-diff';
import '../../diff/instance-mapping-fields-diff';
import '../../diff/instance-list-fields-diff';
import template from './templates/related-proposals-item.mustache';
import {getPersonInfo} from '../../../plugins/utils/user-utils';
import {getFormattedLocalDate} from '../../../plugins/utils/date-utils';
const tag = 'related-proposals-item';

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    define: {
      proposal: {
        value: {},
        set(newValue, setValue) {
          if (newValue) {
            this.setPeople(newValue);
          }

          setValue(newValue);
        },
      },
      fields: {
        get() {
          return this.attr('proposal.content.fields');
        },
      },
      status: {
        get() {
          return this.attr('proposal.status');
        },
      },
      stateTooltip: {
        get() {
          return this.getStateTooltip();
        },
      },
    },
    instance: {},
    setPeople(proposal) {
      getPersonInfo(proposal.proposed_by)
        .then((person) => {
          proposal.attr('proposed_by', person);
        });

      getPersonInfo(proposal.applied_by)
        .then((person) => {
          proposal.attr('applied_by', person);
        });

      getPersonInfo(proposal.declined_by)
        .then((person) => {
          proposal.attr('declined_by', person);
        });
    },
    getStateTooltip() {
      const proposal = this.attr('proposal');
      const status = this.attr('status');
      let text;
      let date;

      if (status === 'declined') {
        date = getFormattedLocalDate(proposal.attr('decline_datetime'));
        text = this.buildTooltipMessage(
          'Declined',
          this.getPersonEmail(proposal.attr('declined_by')),
          date,
          proposal.attr('decline_reason'));
      } else if (status === 'applied') {
        date = getFormattedLocalDate(proposal.attr('apply_datetime'));
        text = this.buildTooltipMessage(
          'Applied',
          this.getPersonEmail(proposal.attr('applied_by')),
          date,
          proposal.attr('apply_reason'));
      }

      return text;
    },
    getPersonEmail(person) {
      if (!person || !person.reify) {
        return '';
      }

      return person.reify().email;
    },
    buildTooltipMessage(startWord, email, date, comment) {
      if (!comment) {
        return `${startWord} by ${email}, ${date}`;
      }

      return `${startWord} by ${email}, ${date}

        Comment:
        ${comment}`;
    },
  },
});
