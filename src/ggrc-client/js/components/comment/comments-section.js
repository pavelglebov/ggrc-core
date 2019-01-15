/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './comments-section.mustache';
import './comment-data-provider';
import './comment-add-form';
import './mapped-comments';
import Permission from '../../permission';

export default can.Component.extend({
  tag: 'comments-section',
  template,
  leakScope: true,
  viewModel: {
    define: {
      notification: {
        value: 'Send Notifications',
      },
      isDeniedToAddComment: {
        get() {
          return !Permission.is_allowed_for('update', this.attr('instance'))
            || this.attr('instance.archived');
        },
      },
    },
    instance: null,
  },
});
