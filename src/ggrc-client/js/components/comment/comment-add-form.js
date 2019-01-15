/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './comment-input';
import './comment-add-button';
import template from './comment-add-form.mustache';
import {COMMENT_CREATED} from '../../events/eventTypes';
import tracker from '../../tracker';
import {getAssigneeType} from '../../plugins/ggrc_utils';
import {notifier} from '../../plugins/utils/notifiers-utils';

const tag = 'comment-add-form';

/**
 * A component that takes care of adding comments
 *
 */
export default can.Component.extend({
  tag: tag,
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      notificationsInfo: {
        value: 'Send Notifications',
        set(newValue) {
          return this.attr('instance').class.category === 'scope' ?
            'Notify Contacts' :
            newValue;
        },
      },
      tooltipTitle: {
        get() {
          let title;
          if (this.attr('instance').class.category === 'scope') {
            title = 'Comments will be sent as a part of daily digest email ' +
            'notifications to Admins, Assignee, Verifier, ' +
            'Compliance Contacts, Primary Contacts, Secondary Contacts, ' +
            'Product Managers, Technical Leads, Technical / Program Managers,' +
            ' Legal Counsels, System Owners, Line of Defense One Contacts, ' +
            'Vice Presidents';
          } else {
            title = 'Comments will be sent as part of daily digest email ' +
            'notification.';
          }
          return title;
        },
      },
    },
    instance: {},
    sendNotifications: true,
    isSaving: false,
    isLoading: false,
    getCommentData: function () {
      let source = this.attr('instance');

      return {
        send_notification: this.attr('sendNotifications'),
        context: source.context,
        assignee_type: getAssigneeType(source),
      };
    },
    updateComment: function (comment) {
      comment.attr(this.getCommentData());
      return comment;
    },
    afterCreation: function (comment, wasSuccessful) {
      this.attr('isSaving', false);
      this.dispatch({
        type: 'afterCreate',
        item: comment,
        success: wasSuccessful,
      });
      if (wasSuccessful) {
        this.attr('instance').dispatch({
          ...COMMENT_CREATED,
          comment: comment,
        });
      }
    },
    onCommentCreated: function (e) {
      let comment = e.comment;
      let self = this;

      tracker.start(self.attr('instance.type'),
        tracker.USER_JOURNEY_KEYS.INFO_PANE,
        tracker.USER_ACTIONS.INFO_PANE.ADD_COMMENT);

      self.attr('isSaving', true);
      comment = self.updateComment(comment);
      self.dispatch({type: 'beforeCreate', items: [comment]});

      comment.save()
        .done(function () {
          return self.afterCreation(comment, true);
        })
        .fail(function () {
          notifier('error', 'Saving has failed');
          self.afterCreation(comment, false);
        });
    },
  },
});
