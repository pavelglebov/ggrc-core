/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../dropdown/dropdown';
import template from './templates/repeat-on-button.mustache';
import * as config from '../../apps/workflow-config';

export default can.Component.extend({
  tag: 'repeat-on-button',
  template,
  leakScope: true,
  viewModel: {
    define: {
      buttonText: {
        get: function () {
          return this.getTitle(this.attr('unit'));
        },
      },
      modalTitle: {
        get: function () {
          return this.getTitle(this.attr('repeatEnabled'));
        },
      },
      repeatEnabled: {
        type: 'boolean',
        value: false,
      },
      repeatDisabled: {
        get: function () {
          return !this.attr('repeatEnabled');
        },
      },
      repeatOptions: {
        Value: can.List,
      },
      unitOptions: {
        Value: can.List,
      },
      canSave: {
        type: 'boolean',
        value: true,
      },
      isSaving: {
        type: 'boolean',
        value: false,
      },
      onSaveRepeat: {
        value: function () {
          return function () {
            return $.Deferred().resolve();
          };
        },
      },
    },
    unit: null,
    repeatEvery: null,
    state: {
      open: false,
      result: {
      },
    },
    getTitle: function (isEnabled) {
      return 'Repeat ' + (isEnabled ?
        'On' :
        'Off');
    },
    showDialog: function () {
      this.attr('state.open', true);
    },
    updateRepeatEveryOptions: function () {
      let selectedRepeatEvery;
      let repeatOptions = this.attr('repeatOptions');
      let unitOptions = this.attr('unitOptions');

      if (this.attr('state.result.unit')) {
        selectedRepeatEvery = _.find(unitOptions, function (option) {
          return option.value === this.attr('state.result.unit');
        }.bind(this));
        repeatOptions.forEach(function (option) {
          let unitName = option.value > 1 ?
            selectedRepeatEvery.plural :
            selectedRepeatEvery.singular;
          option.attr('title',
            option.value + ' ' + unitName);
        });
      }
    },
    initOptionLists: function () {
      this.attr('repeatOptions').replace(config.repeatOptions);
      this.attr('unitOptions').replace(config.unitOptions);
    },
    setResultOptions: function (unit, repeatEvery) {
      this.attr('state.result.unit', unit);
      this.attr('state.result.repeatEvery', repeatEvery);
    },
    setDefaultOptions: function () {
      this.setResultOptions(config.defaultRepeatValues.unit,
        config.defaultRepeatValues.repeatEvery);
    },
    initSelectedOptions: function () {
      let repeatEnabled = !!this.attr('unit');
      this.attr('repeatEnabled', repeatEnabled);

      this.setResultOptions(this.attr('unit'),
        this.attr('repeatEvery'));
    },
    init: function () {
      this.initSelectedOptions();
      this.initOptionLists();
      this.updateRepeatEveryOptions();
    },
    save: function () {
      let unit = null;
      let repeatEvery = null;
      let onSave = this.attr('onSaveRepeat');

      if (this.attr('repeatEnabled')) {
        unit = this.attr('state.result.unit');
        repeatEvery = this.attr('state.result.repeatEvery');
      }

      this.attr('isSaving', true);
      onSave(unit, repeatEvery)
        .then(function () {
          this.attr('isSaving', false);
          this.attr('state.open', false);
        }.bind(this));
    },
  },
  events: {
    '{state.result} unit': function () {
      this.viewModel.updateRepeatEveryOptions();
    },
    '{state} open': function () {
      if (this.viewModel.attr('state.open')) {
        this.viewModel.initSelectedOptions();
        if (!this.viewModel.attr('unit')) {
          this.viewModel.setDefaultOptions();
        }
      }
    },
  },
});
