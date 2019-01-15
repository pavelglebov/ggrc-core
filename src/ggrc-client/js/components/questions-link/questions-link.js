/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  hasQuestions,
  getQuestionsUrl,
} from '../../plugins/utils/ggrcq-utils';
import template from './questions-link.mustache';

export default can.Component.extend({
  tag: 'questions-link',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      hasQuestions: {
        type: Boolean,
        get: function () {
          let instance = this.attr('instance');

          if (instance.attr('status') === 'Deprecated') {
            return false;
          }

          return hasQuestions(instance);
        },
      },
      questionsUrl: {
        type: String,
        get: function () {
          let instance = this.attr('instance');
          return getQuestionsUrl(instance);
        },
      },
    },
    instance: null,
  },
  events: {
    '.question-link click': function (el, ev) {
      ev.stopPropagation();
    },
  },
});
