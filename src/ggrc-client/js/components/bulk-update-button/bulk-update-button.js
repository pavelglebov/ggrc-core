/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './bulk-update-button.mustache';
import updateService from '../../plugins/utils/bulk-update-service';
import {notifier} from '../../plugins/utils/notifiers-utils';

export default can.Component.extend({
  tag: 'bulk-update-button',
  template: template,
  leakScope: true,
  viewModel: {
    model: null,
    openBulkUpdateModal: function (el, type) {
      import(/* webpackChunkName: "mapper" */ '../../controllers/mapper/mapper')
        .then((mapper) => {
          mapper.ObjectBulkUpdate.launch(el, {
            object: type,
            type: type,
            callback: this.updateObjects.bind(this, el),
          });
        });
    },
    updateObjects: function (el, context, args) {
      let model = this.attr('model');
      let nameSingular = model.name_singular;
      let progressMessage =
        `${nameSingular} update is in progress. This may take several minutes.`;

      context.closeModal();
      notifier('progress', progressMessage);
      return updateService.update(model, args.selected, args.options)
        .then(function (res) {
          let updated = _.filter(res, {status: 'updated'});
          let updatedCount = updated.length;
          let message = this.getResultNotification(model, updatedCount);

          notifier('info', message);

          if (updatedCount > 0) {
            can.trigger(el.closest('tree-widget-container'), 'refreshTree');
          }
        }.bind(this));
    },
    getResultNotification: function (model, updatedCount) {
      let nameSingularLowerCase = model.name_singular.toLowerCase();
      let namePlural = model.name_plural;
      let namePluralLowerCase = namePlural.toLowerCase();

      if (updatedCount === 0) {
        return `No ${namePluralLowerCase} were updated.`;
      }

      return `${updatedCount} ` + (updatedCount === 1 ?
        `${nameSingularLowerCase} was ` :
        `${namePluralLowerCase} were `) +
        'updated successfully.';
    },
  },
  events: {
    'a click': function (el) {
      let model = this.viewModel.attr('model');
      let type = model.model_singular;

      this.viewModel.openBulkUpdateModal(el, type);
    },
  },
});
