/*
 * Copyright (C) 2019 Google Inc.
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../action-toolbar/action-toolbar';
import {
  uploadFiles,
  getGDriveItemId,
  findGDriveItemById,
  GDRIVE_PICKER_ERR_CANCEL,
} from '../../plugins/utils/gdrive-picker-utils';
import template from './templates/gdrive_folder.mustache';

export default can.Component.extend({
  tag: 'ggrc-gdrive-folder-picker',
  template,
  leakScope: true,
  viewModel: {
    define: {
      readonly: {
        type: 'boolean',
        value: false,
      },
      hideLabel: {
        type: 'boolean',
        value: false,
      },
      showAssignFolder: {
        type: 'boolean',
        get() {
          return !this.attr('readonly') &&
            !this.attr('_folder_change_pending');
        },
      },
      folderId: {
        type: String,
        get() {
          return getGDriveItemId(this.attr('folder_error.message'));
        },
      },
    },
    _folder_change_pending: false,
    no_detach: '@',
    deferred: '@',
    tabindex: '@',
    placeholder: '@',
    instance: null,
    /**
     * Helper method for unlinking folder currently linked to the
     * given instance.
     *
     * @return {Object} - a deferred object that is resolved when the instance's
     *   folder has been successfully unlinked from it
     */
    unlinkFolder: function () {
      return this.instance.refresh().then(function () {
        this.instance.attr('folder', null);
        return this.instance.save();
      }.bind(this));
    },
    /**
     * Helper method for linking new folder to the given instance
     *
     * @param {String} folderId - GDrive folder id
     * @return {Object} - a deferred object that is resolved when the instance's
     *   folder has been successfully linked to it
     */
    linkFolder: function (folderId) {
      return this.instance.refresh().then(function () {
        this.instance.attr('folder', folderId);
        return this.instance.save();
      }.bind(this));
    },
    setCurrent: function (folderId) {
      this.attr('_folder_change_pending', true);

      return findGDriveItemById(folderId)
        .always(function () {
          this.attr('_folder_change_pending', false);
        }.bind(this))
        .done(function (gdriveFolder) {
          this.attr('current_folder', gdriveFolder);
          this.attr('folder_error', null);
        }.bind(this))
        .fail(function (error) {
          this.attr('folder_error', error);
        }.bind(this));
    },
    unsetCurrent: function () {
      this.attr('_folder_change_pending', false);
      this.attr('folder_error', null);
      this.attr('current_folder', null);
    },
    setRevisionFolder: function () {
      let folderId = this.instance.attr('folder');
      if (folderId) {
        this.setCurrent(folderId);
      }
    },
  },

  events: {
    inserted: function () {
      let viewModel = this.viewModel;

      if (!viewModel.attr('readonly')) {
        this.element.removeAttr('tabindex');
      }

      viewModel.setRevisionFolder();
    },

    '{viewModel.instance} change': function (inst, ev, attr) {
      // Error recovery from previous refresh_instances error when we couldn't set up the binding.
      if (!this.viewModel.folder_error) {
        return;
      }

      this.viewModel.setRevisionFolder();
    },

    /**
     * Handle a click on the button for detaching an upload folder from
     * a model instance (e.g. an Audit).
     *
     * @param {Object} el - The jQuery-wrapped DOM element on which the event
     *   has been triggered.
     * @param {Object} ev - The event object.
     */
    'a[data-toggle=gdrive-remover] click': function (el, ev) {
      let viewModel = this.viewModel;
      let dfd;

      if (viewModel.deferred) {
        viewModel.instance.attr('folder', null);
        dfd = $.when();
      } else {
        dfd = viewModel.unlinkFolder();
      }

      dfd.then(viewModel.unsetCurrent.bind(viewModel));
    },
    'a[data-toggle=gdrive-picker] click': function (el, ev) {
      uploadFiles({
        parentId: el.data('folder-id'),
        pickFolder: el.data('type') === 'folders',
      }).then((files, action) => {
        el.trigger('picked', {
          files,
        });
      })
        .fail((err) => {
          if ( err && err.type === GDRIVE_PICKER_ERR_CANCEL ) {
            el.trigger('rejected');
          }
        });
    },
    'a[data-toggle=gdrive-picker] keyup'(element, event) {
      const ESCAPE_KEY_CODE = 27;
      const escapeKeyWasPressed = event.keyCode === ESCAPE_KEY_CODE;

      if (escapeKeyWasPressed) {
        const $element = $(element);
        event.stopPropagation();
        // unset focus for attach button
        $element.blur();
      }
    },
    /*
      * Handle an event of the user picking a new GDrive upload folder.
      *
      * @param {Object} el - The jQuery-wrapped DOM element on which the event
      *   has been triggered.
      * @param {Object} ev - The event object.
      * @param {Object} data - Additional event data.
      *   @param {Array} data.files - The list of GDrive folders the user picked
      *     in the GDrive folder picker modal.
      */
    '.entry-attachment picked': function (el, ev, data) {
      let dfd;
      let files = data.files || [];
      let folderId;
      let viewModel = this.viewModel;

      if (el.data('type') === 'folders' &&
          files.length &&
          files[0].mimeType !== 'application/vnd.google-apps.folder'
      ) {
        $(document.body).trigger('ajax:flash', {
          error: 'ERROR: Something other than a Drive folder was chosen ' +
                 'for a folder slot. Please choose a folder.',
        });
        return;
      }

      viewModel.attr('_folder_change_pending', true);

      folderId = files[0].id;
      if (viewModel.deferred) {
        viewModel.instance.attr('folder', folderId);
        dfd = $.when();
      } else {
        dfd = viewModel.linkFolder(folderId);
      }

      dfd.then(viewModel.setCurrent(folderId))
        .then(function () {
          if (viewModel.deferred && viewModel.instance._transient) {
            viewModel.instance.attr('_transient.folder', files[0]);
          }
        });
      return dfd;
    },
  },
});
