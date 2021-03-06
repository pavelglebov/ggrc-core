/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import '../related-objects/related-assessments';
import template from './show-related-assessments-button.stache';
import {hasRelatedAssessments} from '../../plugins/utils/models-utils';

export default canComponent.extend({
  tag: 'show-related-assessments-button',
  view: canStache(template),
  leakScope: true,
  viewModel: canMap.extend({
    define: {
      cssClasses: {
        type: String,
        get: function () {
          return !this.attr('resetStyles') ?
            'btn btn-lightBlue ' + this.attr('extraBtnCss') : '';
        },
      },
      resetStyles: {
        type: Boolean,
        value: false,
      },
      showTitle: {
        type: Boolean,
        value: true,
      },
      showIcon: {
        type: Boolean,
        value: false,
      },
      title: {
        type: String,
        get: function () {
          return this.attr('text') || 'Assessments';
        },
      },
    },
    instance: null,
    state: {
      open: false,
    },
    extraBtnCss: '',
    text: '',
    modalTitle: 'Related Assessments',
    showRelatedAssessments: function () {
      this.attr('state.open', true);
    },
    // Temporary put this logic on the level of Component itself
    isAllowedToShow: function () {
      return hasRelatedAssessments(this.attr('instance.type'));
    },
  }),
});
