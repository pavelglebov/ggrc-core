/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {confirm} from '../plugins/utils/modals';

export default can.Component.extend({
  tag: 'reminder',
  leakScope: true,
  viewModel: {
    instance: null,
    type: '@',
    modal_title: '@',
    modal_description: '@',

    /**
     * Create reminder notifications for all assessors of an Assessment.
     *
     * @param {can.Map} viewModel - the component's viewModel
     * @param {jQuery.Object} $el - the DOM element that triggered the action
     * @param {jQuery.Event} ev - the event object
     */
    reminder: function (viewModel, $el, ev) {
      let instance = viewModel.instance;

      instance
        .refresh()
        .then(function () {
          instance.attr('reminderType', viewModel.type);
          return $.when(instance.save());
        })
        .then(function () {
          confirm({
            modal_title: viewModel.attr('modal_title'),
            modal_description: viewModel.attr('modal_description'),
            button_view:
              GGRC.mustache_path + '/modals/close_buttons.mustache',
          });
        });
    },
  },
});
