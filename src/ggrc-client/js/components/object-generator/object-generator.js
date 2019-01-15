/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../assessment-templates/assessment-templates-dropdown/assessment-templates-dropdown';
import '../../components/advanced-search/advanced-search-filter-container';
import '../../components/advanced-search/advanced-search-filter-state';
import '../../components/advanced-search/advanced-search-mapping-container';
import '../../components/advanced-search/advanced-search-wrapper';
import '../../components/collapsible-panel/collapsible-panel';
import '../../components/unified-mapper/mapper-results';
import '../../components/mapping-controls/mapping-type-selector';
import ObjectOperationsBaseVM from '../view-models/object-operations-base-vm';
import * as businessModels from '../../models/business-models';
import template from './object-generator.mustache';

/**
 * A component implementing a modal for mapping objects to other objects,
 * taking the object type mapping constraints into account.
 */
export default can.Component.extend({
  tag: 'object-generator',
  template,
  leakScope: true,
  viewModel: function (attrs, parentViewModel) {
    return ObjectOperationsBaseVM.extend({
      object: attrs.object,
      join_object_id: attrs.joinObjectId,
      type: attrs.type,
      relevantTo: parentViewModel.attr('relevantTo'),
      callback: parentViewModel.attr('callback'),
      useTemplates: true,
      useSnapshots: true,
      isLoadingOrSaving: function () {
        return this.attr('is_saving') ||
        this.attr('block_type_change') ||
        //  disable changing of object type while loading
        //  to prevent errors while speedily selecting different types
        this.attr('is_loading');
      },
    });
  },

  events: {
    inserted: function () {
      this.viewModel.attr('selected').replace([]);
      this.viewModel.attr('entries').replace([]);

      // show loading indicator before actual
      // Assessment Template is loading
      this.viewModel.attr('is_loading', true);
    },
    closeModal: function () {
      this.viewModel.attr('is_saving', false);
      if (this.element) {
        this.element.find('.modal-dismiss').trigger('click');
      }
    },
    '.modal-footer .btn-map click': function (el, ev) {
      let type = this.viewModel.attr('type');
      let object = this.viewModel.attr('object');
      let assessmentTemplate =
        this.viewModel.attr('assessmentTemplate');
      let instance = businessModels[object].findInCacheById(
        this.viewModel.attr('join_object_id'));

      ev.preventDefault();
      if (el.hasClass('disabled') ||
      this.viewModel.attr('is_saving')) {
        return;
      }

      this.viewModel.attr('is_saving', true);
      return this.viewModel.callback(this.viewModel.attr('selected'), {
        type: type,
        target: object,
        instance: instance,
        assessmentTemplate: assessmentTemplate,
        context: this,
      });
    },
    '{viewModel} assessmentTemplate': function (viewModel, ev, val, oldVal) {
      let type;
      if (_.isEmpty(val)) {
        return this.viewModel.attr('block_type_change', false);
      }

      val = val.split('-');
      type = val[1];
      this.viewModel.attr('block_type_change', true);
      this.viewModel.attr('type', type);
    },
  },
});
