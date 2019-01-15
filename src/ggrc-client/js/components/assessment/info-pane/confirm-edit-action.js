/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../../inline/base-inline-control-title';
import {confirm} from '../../../plugins/utils/modals';

export default can.Component.extend({
  tag: 'confirm-edit-action',
  leakScope: true,
  viewModel: {
    instance: {},
    setInProgress: null,
    editMode: false,
    isEditIconDenied: false,
    isConfirmationNeeded: true,
    onStateChangeDfd: $.Deferred().resolve(),
    openEditMode: function (el) {
      this.attr('onStateChangeDfd').then(function () {
        if (this.isInEditableState()) {
          this.dispatch('setEditMode');
        }
      }.bind(this));
    },
    isInEditableState: function () {
      let editableStates = ['In Progress', 'Not Started', 'Rework Needed'];
      return _.includes(editableStates, this.attr('instance.status'));
    },
    showConfirm: function () {
      let self = this;
      let confirmation = $.Deferred();
      confirm({
        modal_title: 'Confirm moving Assessment to "In Progress"',
        modal_description: 'You are about to move Assessment from "' +
          this.instance.status +
          '" to "In Progress" - are you sure about that?',
        button_view: GGRC.mustache_path + '/modals/prompt_buttons.mustache',
      }, confirmation.resolve, confirmation.reject);

      return confirmation.then(function (data) {
        self.dispatch('setInProgress');
        self.openEditMode();
      });
    },
    confirmEdit: function () {
      if (this.attr('isConfirmationNeeded') && !this.isInEditableState()) {
        return this.showConfirm();
      }

      // send 'isLastOpenInline' when inline is opening without confirm
      this.dispatch({
        type: 'setEditMode',
        isLastOpenInline: true,
      });
    },
  },
});
