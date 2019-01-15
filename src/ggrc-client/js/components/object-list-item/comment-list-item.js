/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {NAVIGATE_TO_TAB} from '../../events/eventTypes';
import '../person/person-data';
import '../spinner/spinner';
import template from './comment-list-item.mustache';

const tag = 'comment-list-item';
/**
 * Simple component to show Comment Objects
 */
export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    instance: {},
    baseInstance: {},
    define: {
      showIcon: {
        type: Boolean,
        value: false,
      },
      iconCls: {
        get() {
          return this.attr('showIcon') ?
            'fa-' + this.attr('itemData.title').toLowerCase() :
            '';
        },
      },
      itemData: {
        get() {
          return this.attr('instance');
        },
      },
      commentText: {
        get() {
          return this.attr('itemData.description');
        },
      },
      commentCreationDate: {
        get() {
          return this.attr('itemData.created_at');
        },
      },
      commentAuthor: {
        get() {
          return this.attr('itemData.modified_by') || false;
        },
      },
      commentAuthorType: {
        get() {
          function capitalizeFirst(type) {
            return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
          }

          const assignee = _.chain(this.attr('itemData.assignee_type'))
            .split(',')
            .head()
            .trim()
            .value();
          return assignee ? `(${capitalizeFirst(assignee)})` : '';
        },
      },
      hasRevision: {
        get() {
          return this.attr('commentRevision') || false;
        },
      },
      commentRevision: {
        get() {
          return this.attr('itemData.custom_attribute_revision');
        },
      },
      customAttributeData: {
        get() {
          return this.attr('commentRevision.custom_attribute.title') +
         ':' + this.attr('commentRevision.custom_attribute_stored_value');
        },
      },
      isProposalHeaderLink: {
        get() {
          return this.attr('itemData.header_url_link') === 'proposal_link';
        },
      },
    },
    openProposalTab() {
      this.attr('baseInstance').dispatch({
        ...NAVIGATE_TO_TAB,
        tabId: 'tab-related-proposals',
      });
    },
  },
});
