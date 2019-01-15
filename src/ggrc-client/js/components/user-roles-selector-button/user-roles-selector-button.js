/*
  Copyright (C) 2019 Google Inc., authors, and contributors <see AUTHORS file>
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

export default can.Component.extend({
  tag: 'user-roles-selector-button',
  leakScope: true,
  viewModel: {
    personId: null,
    async openModal(ev) {
      let $trigger = $(ev.target);
      const {
        'default': userRolesModalSelector,
      } = await import(
        /* webpackChunkName: "userRoleModalSelector" */
        '../../controllers/user-roles-selector-controller'
      );

      let options = {personId: this.attr('personId')};

      ev.preventDefault();
      ev.stopPropagation();

      // Trigger the controller
      userRolesModalSelector.launch($trigger, options);
    },
  },
});
