/*
 Copyright (C) 2019 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './request-review-modal';
import template from './templates/object-review.mustache';
import notificationTemplate from './templates/complete-review-notification.mustache';
import Review from '../../models/service-models/review';
import Permission from '../../permission';
import {isSnapshot} from '../../plugins/utils/snapshot-utils';
import {createReviewInstance, saveReview} from '../../plugins/utils/object-review-utils';
import {
  REFRESH_MAPPING,
  DESTINATION_UNMAPPED,
  NAVIGATE_TO_TAB,
} from '../../events/eventTypes';
import {getRole} from '../../plugins/utils/acl-utils';
import {notifier} from '../../plugins/utils/notifiers-utils';

const tag = 'object-review';

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    define: {
      reviewStatus: {
        get() {
          let status = this.attr('review.status') ||
            this.attr('instance.review_status');

          return status.toLowerCase();
        },
      },
      isReviewed: {
        get() {
          return this.attr('reviewStatus') === 'reviewed';
        },
      },
      showLastReviewInfo: {
        get() {
          return !!this.attr('review.last_reviewed_by');
        },
      },
      isSnapshot: {
        get() {
          return isSnapshot(this.attr('instance'));
        },
      },
      showButtons: {
        get() {
          const instance = this.attr('review') || this.attr('instance');

          return Permission.is_allowed_for('update', instance);
        },
      },
      hasReviewers: {
        get() {
          return this.attr('review.access_control_list.length');
        },
      },
    },
    instance: {},
    review: null,
    loading: false,
    reviewersModalState: {
      open: false,
    },
    loadReview() {
      const review = this.attr('instance.review');

      if (!this.attr('isSnapshot') && review) {
        this.attr('loading', true);

        new Review(review)
          .refresh()
          .then((reviewInstance) => {
            this.attr('review', reviewInstance);
          })
          .always(() => {
            this.attr('loading', false);
          });
      }
    },
    getReviewInstance() {
      const review = this.attr('review');

      return review || createReviewInstance(this.attr('instance'));
    },
    markReviewed() {
      const review = this.getReviewInstance();

      this.updateAccessControlList(review);
      this.changeReviewState(review, 'Reviewed')
        .then(() => {
          this.showNotification();
        });
    },
    markUnreviewed() {
      const review = this.attr('review');

      this.changeReviewState(review, 'Unreviewed');
    },
    changeReviewState(review, status) {
      review.attr('status', status);
      this.attr('loading', true);

      return this.updateReview(review).then(() => {
        this.attr('loading', false);
      });
    },
    showNotification() {
      notifier('info', notificationTemplate, {
        revertState: this.markUnreviewed.bind(this),
      });
    },
    updateReview(review) {
      return saveReview(review, this.attr('instance'))
        .then((reviewInstance) => {
          this.attr('review', reviewInstance);
        });
    },
    updateAccessControlList(review) {
      const acl = review.attr('access_control_list');
      const isCurrentUserReviewer = !!_.find(acl, (item) =>
        item.person.id === GGRC.current_user.id);

      if (!isCurrentUserReviewer) {
        const reviewerRole = getRole('Review', 'Reviewer');

        acl.push({
          ac_role_id: reviewerRole.id,
          person: {type: 'Person', id: GGRC.current_user.id},
        });
      }
    },
    changeReviewers() {
      this.attr('reviewersModalState.open', true);
    },
    reviewersUpdated(event) {
      this.attr('review', event.review);
    },
    showLastChanges() {
      this.attr('review').setShowLastReviewUpdates(true);
      this.attr('instance').dispatch({
        ...NAVIGATE_TO_TAB,
        tabId: 'change-log',
      });
    },
  },
  events: {
    inserted() {
      this.viewModel.loadReview();
    },
    '{viewModel.instance} modelAfterSave'() {
      this.viewModel.loadReview();
    },
    [`{viewModel.instance} ${REFRESH_MAPPING.type}`](instance, event) {
      // check destinationType because REFRESH_MAPPING is also dispatched on modal 'hide'
      if (event.destinationType) {
        this.viewModel.loadReview();
      }
    },
    [`{viewModel.instance} ${DESTINATION_UNMAPPED.type}`]() {
      this.viewModel.loadReview();
    },
  },
});
