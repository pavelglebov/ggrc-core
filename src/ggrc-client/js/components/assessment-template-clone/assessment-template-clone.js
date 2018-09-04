/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../../components/advanced-search/advanced-search-filter-container';
import '../../components/advanced-search/advanced-search-filter-state';
import '../../components/advanced-search/advanced-search-wrapper';
import '../../components/unified-mapper/mapper-results';
import '../../components/collapsible-panel/collapsible-panel';
import ObjectOperationsBaseVM from '../view-models/object-operations-base-vm';
import template from './assessment-template-clone.mustache';
import {getPageInstance} from '../../plugins/utils/current-page-utils';

export default can.Component.extend({
  tag: 'assessment-template-clone',
  template,
  viewModel: function () {
    return ObjectOperationsBaseVM.extend({
      isAuditPage() {
        return getPageInstance().type === 'Audit';
      },
    });
  },
  events: {
    inserted() {
      this.viewModel.attr('submitCbs').fire();
    },
    closeModal() {
      if (this.element) {
        this.element.find('.modal-dismiss').trigger('click');
      }
    },
    '.btn-cancel click': function () {
      this.closeModal();
    },
    '.btn-clone click': function () {
      this.viewModel.attr('is_saving', true);

      this.cloneObjects()
        .always(() => {
          this.viewModel.attr('is_saving', false);
        })
        .done(() => {
          this.closeModal();
          this.viewModel.dispatch('refreshTreeView');
        });
    },
    // don't hide modal when we open Create New,
    // but close it if a New one was created
    '.create-new-object modal:success': function (e, ev) {
      this.closeModal();
    },
    cloneObjects() {
      let sourceIds = _.map(this.viewModel.attr('selected'), (item) => item.id);
      let destinationId = this.viewModel.attr('join_object_id');

      return $.post('/api/assessment_template/clone', [{
        sourceObjectIds: sourceIds,
        destination: {
          type: 'Audit',
          id: destinationId,
        },
      }]);
    },
  },
});
