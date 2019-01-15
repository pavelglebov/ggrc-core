/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './templates/repeat-on-summary.mustache';
import {unitOptions as workflowUnitOptions} from '../../apps/workflow-config';

export default can.Component.extend({
  tag: 'repeat-on-summary',
  template,
  leakScope: true,
  viewModel: {
    define: {
      unitText: {
        get: function () {
          let result = '';
          let repeatEvery = this.attr('repeatEvery');
          let unit = _.find(workflowUnitOptions, (option) => {
            return option.value === this.attr('unit');
          });

          if (unit) {
            if (repeatEvery > 1) {
              result += repeatEvery + ' ' + unit.plural;
            } else {
              result += unit.singular;
            }
          }
          return result;
        },
      },
      hideRepeatOff: {
        type: 'boolean',
        value: true,
      },
    },
    unit: null,
    repeatEvery: null,
  },
});
