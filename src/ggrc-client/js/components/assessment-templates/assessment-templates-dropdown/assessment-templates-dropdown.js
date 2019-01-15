/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../../dropdown/dropdown';
import {
  buildParam,
  batchRequests,
} from '../../../plugins/utils/query-api-utils';
import template from './assessment-templates-dropdown.mustache';
import tracker from '../../../tracker';

export default can.Component.extend({
  tag: 'assessment-templates-dropdown',
  template,
  leakScope: true,
  viewModel: {
    responses: [],
    instance: null,
    assessmentTemplate: null,
    templates() {
      const result = {};
      const responses = this.attr('responses');
      const noValue = {
        title: 'No template',
        value: '',
      };
      _.forEach(responses, function (instance) {
        let type;
        type = instance.template_object_type;
        if (!result[type]) {
          result[type] = {
            group: type,
            subitems: [],
          };
        }
        result[type].subitems.push({
          title: instance.title,
          value: instance.id + '-' + type,
        });
      });
      return [noValue].concat(_.toArray(result));
    },
    /**
     * Set the initial Assessment Template to be selected in the relevant
     * dropdown menu.
     *
     * By default, the first option from the first option group is selected,
     * unless such option does not exist.
     *
     * @param {Array} templates - a list of possible options for the dropdown
     */
    _selectInitialTemplate(templates) {
      const WARN_EMPTY_GROUP = [
        'can.Component.assessmentTemplates: ',
        'An empty template group encountered, possible API error',
      ].join('');
      let initialTemplate;
      let nonDummyItem;
      // The first element is a dummy option, thus if there are no other
      // elements, simply don't pick anything.
      if (templates.length < 2) {
        return;
      }
      nonDummyItem = templates[1]; // a single item or an object group
      if (!nonDummyItem.group) {
        // a single item
        initialTemplate = nonDummyItem.value;
      } else {
        if (!nonDummyItem.subitems || nonDummyItem.subitems.length === 0) {
          console.warn(WARN_EMPTY_GROUP);
          return; // an empty group, no option to pick from it
        }
        initialTemplate = nonDummyItem.subitems[0].value;
      }
      if (!this.attr('assessmentTemplate')) {
        this.attr('assessmentTemplate', initialTemplate);
        tracker.stop(tracker.FOCUS_AREAS.ASSESSMENT,
          tracker.USER_JOURNEY_KEYS.LOADING,
          tracker.USER_ACTIONS.ASSESSMENT.OPEN_ASMT_GEN_MODAL);
      }
    },
  },
  init() {
    const viewModel = this.viewModel;
    const instance = viewModel.attr('instance');
    const param = buildParam('AssessmentTemplate', {}, {
      type: instance.type,
      id: instance.id,
    }, ['id', 'type', 'title', 'template_object_type']);

    batchRequests(param).then((response) => {
      const values = response.AssessmentTemplate.values;
      viewModel.attr('responses', values);
      viewModel._selectInitialTemplate(viewModel.templates());
      viewModel.dispatch('assessmentTemplateLoaded');
    });
  },
});
