/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {sortByName} from '../../plugins/utils/label-utils';
import template from './templates/multi-select-label.mustache';
import './../custom-autocomplete/autocomplete-input';
import './label-autocomplete-results';

import './label-autocomplete-wrapper';

export default can.Component.extend({
  tag: 'multi-select-label',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      onlyEditMode: {
        type: 'boolean',
        value: false,
        set: function (value) {
          if (value) {
            this.attr('editMode', true);
            this.attr('labelsBackup',
              new can.List(this.attr('instance.labels')));
          }
          return value;
        },
      },
      labels: {
        value: [],
        set: function (value) {
          return new can.List(value);
        },
      },
      _labels: {
        get: function () {
          let labels = this.attr('labels').map((item, index) => {
            return {
              _index: index,
              name: item.name,
            };
          });

          return labels;
        },
      },
    },
    labelsBackup: null,
    instance: {},
    editMode: false,
    type: null,
    id: null,
    cssClass: function () {
      if (this.attr('editMode')) {
        return 'edit-mode';
      }
      return '';
    },
    valueChanged: function (newValue) {
      newValue = sortByName(newValue);
      if (this.attr('onlyEditMode')) {
        this.attr('instance.labels', newValue);
      } else {
        this.dispatch({
          type: 'valueChanged',
          value: newValue,
        });
      }
    },
    createLabel: function (event) {
      this.attr('labels').push({
        name: event.newValue,
        id: null,
        type: 'Label',
      });
      this.valueChanged(this.attr('labels'));
    },
    labelSelected: function (event) {
      let label = event.item;

      this.attr('labels').push({
        id: label.id,
        name: label.name,
        type: 'Label',
      });
      this.valueChanged(this.attr('labels'));
    },
    removeLabel: function (index) {
      this.attr('labels').splice(index, 1);
      this.valueChanged(this.attr('labels'));
    },
  },
  events: {
    '{viewModel.instance} modal:discard': function () {
      let viewModel = this.viewModel;

      if (viewModel.attr('onlyEditMode')) {
        viewModel.valueChanged(viewModel.attr('labelsBackup'));
      }
    },
  },
});
