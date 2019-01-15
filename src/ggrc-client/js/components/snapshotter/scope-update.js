/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  confirm,
  BUTTON_VIEW_CONFIRM_CANCEL,
} from '../../plugins/utils/modals';
import {
  isSnapshotModel,
} from '../../plugins/utils/snapshot-utils';
import {
  refreshCounts,
} from '../../plugins/utils/widgets-utils';
import {notifier} from '../../plugins/utils/notifiers-utils';

export default can.Component.extend({
  tag: 'snapshot-scope-update',
  leakScope: true,
  viewModel: {
    instance: null,
    upsertIt: function (scope, el, ev) {
      confirm({
        instance: scope.instance,
        modal_title: 'Update to latest version',
        modal_description:
          'Do you want to update all objects of this Audit' +
          ' to the latest version?',
        modal_confirm: 'Update',
        button_view: BUTTON_VIEW_CONFIRM_CANCEL,
        skip_refresh: true,
      },
      this._success.bind(this),
      this._dismiss.bind(this)
      );
    },
    _refreshContainers: function () {
      return refreshCounts()
        .then(function () {
        // tell each container with snapshots that it should refresh own data
          $('tree-widget-container')
            .each(function () {
              let vm = $(this).viewModel();
              let modelName = vm.model.model_singular;

              if (!isSnapshotModel(modelName)) {
                return true;
              }
              vm.setRefreshFlag(true);
            });
        });
    },
    _success: function () {
      let instance = this.instance;

      this._showProgressWindow();
      instance
        .refresh()
        .then(function () {
          let data = {
            operation: 'upsert',
          };
          instance.attr('snapshots', data);
          return instance.save();
        })
        .then(this._refreshContainers.bind(this))
        .then(function () {
          this._updateVisibleContainer.bind(this)();
          this._showSuccessMsg();
          instance.dispatch('snapshotScopeUpdated');
        }.bind(this));
    },
    _dismiss: _.identity,
    _showProgressWindow: function () {
      let message =
        'Audit refresh is in progress. This may take several minutes.';

      notifier('progress', [message]);
    },
    _updateVisibleContainer: function () {
      let visibleContainer = $('tree-widget-container:visible');
      let forceRefresh = true;
      if (visibleContainer.length === 0) {
        return;
      }
      // if a user switches to the snapshot tab during the audit refresh
      // then update the tab
      visibleContainer.viewModel().display(forceRefresh);
    },
    _showSuccessMsg: function () {
      let message = 'Audit was refreshed successfully.';
      $('alert-progress').remove();
      notifier('success', [message]);
    },
  },
});
