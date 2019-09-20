/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import {isChangeableExternally} from '../../plugins/utils/ggrcq-utils';
import template from './comments-section.stache';
import './comment-data-provider';
import './comment-add-form';
import './mapped-comments';
import './comments-paging';
import {isAllowedFor} from '../../permission';

export default canComponent.extend({
  tag: 'comments-section',
  view: canStache(template),
  leakScope: true,
  viewModel: canMap.extend({
    define: {
      notification: {
        value: 'Send Notifications',
      },
      isDeniedToAddComment: {
        get() {
          const instance = this.attr('instance');

          return instance.constructor.disableAddComments
            || !isAllowedFor('update', instance)
            || instance.attr('archived')
            || isChangeableExternally(instance);
        },
      },
      isAllowedToAddCommentExternally: {
        get() {
          const instance = this.attr('instance');

          return !instance.constructor.disableAddComments &&
            isChangeableExternally(instance);
        },
      },
    },
    instance: null,
  }),
});
