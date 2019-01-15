/*
 Copyright (C) 2019 Google Inc., authors, and contributors
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/request-review-modal.mustache';
import {createReviewInstance, saveReview} from '../../plugins/utils/object-review-utils';

const tag = 'request-review-modal';

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    define: {
      isValidForm: {
        get() {
          return !!this.attr('review.access_control_list.length');
        },
      },
      disabled: {
        get() {
          return this.attr('loading') || !this.attr('isValidForm');
        },
      },
    },
    parentInstance: null,
    loading: false,
    review: null,
    modalState: {
      open: false,
    },
    prepareModalContent() {
      let review = this.attr('review');

      if (!review) {
        const parentInstance = this.attr('parentInstance');

        review = createReviewInstance(parentInstance);
        this.attr('review', review);
      }
      // Backup Review because in other case restore on cancel will not work properly
      review.backup();
    },
    cancel() {
      this.attr('modalState.open', false);
      this.attr('review').restore(true);
    },
    save() {
      if (!this.attr('isValidForm')) {
        return;
      }

      const review = this.attr('review');

      this.attr('loading', true);
      review.attr('status', 'Unreviewed');

      saveReview(review, this.attr('parentInstance'))
        .then((review) => {
          this.attr('modalState.open', false);
          this.dispatch({
            type: 'reviewersUpdated',
            review,
          });
        })
        .always(() => {
          this.attr('loading', false);
        });
    },
  },
  events: {
    '{viewModel.modalState} open'() {
      if (this.viewModel.attr('modalState.open')) {
        this.viewModel.prepareModalContent();
      }
    },
  },
});
