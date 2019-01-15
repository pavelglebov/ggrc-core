/*
 * Copyright (C) 2019 Google Inc.
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  uploadFiles,
  findGDriveItemById,
  GDRIVE_PICKER_ERR_CANCEL,
} from '../../plugins/utils/gdrive-picker-utils.js';
import {backendGdriveClient} from '../../plugins/ggrc-gapi-client';
import {bindXHRToButton} from '../../plugins/utils/modals';
import tracker from '../../tracker';
import template from './templates/gdrive_file.mustache';
import {
  notifier,
  messages,
} from '../../plugins/utils/notifiers-utils';
import Context from '../../models/service-models/context';
import * as businessModels from '../../models/business-models';

export default can.Component.extend({
  tag: 'ggrc-gdrive-picker-launcher',
  template,
  leakScope: true,
  viewModel: {
    define: {
      isInactive: {
        get: function () {
          return this.attr('disabled');
        },
      },
    },
    modelType: 'Document',
    tooltip: null,
    instance: {},
    link_class: '@',
    click_event: '@',
    confirmationCallback: '@',
    disabled: false,
    isUploading: false,

    onKeyup(element, event) {
      const ESCAPE_KEY_CODE = 27;
      const escapeKeyWasPressed = event.keyCode === ESCAPE_KEY_CODE;

      if (escapeKeyWasPressed) {
        const $element = $(element);
        event.stopPropagation();
        // unset focus for attach button
        $element.blur();
      }
    },
    onClickHandler: function (scope, el, event) {
      let eventType = this.attr('click_event');
      let handler = this[eventType] || function () {};
      let confirmation = _.isFunction(this.confirmationCallback) ?
        this.confirmationCallback() :
        null;
      let args = arguments;
      let that = this;

      event.preventDefault();
      $.when(confirmation).then(function () {
        handler.apply(that, args);
      });
    },
    trigger_upload: function (scope, el) {
      let stopFn = () => {};

      this.attr('isUploading', true);
      uploadFiles({
        parentId: el.data('folder-id'),
        pickFolder: el.data('type') === 'folders',
      })
        .then((files) => {
          let filesCount = files && files.length ? files.length : 0;

          stopFn = tracker.start(scope.instance.type,
            tracker.USER_JOURNEY_KEYS.ATTACHMENTS,
            tracker.USER_ACTIONS.ADD_ATTACHMENT(filesCount));
          return files;
        })
        .then((files) => {
          return this.createDocumentModel(files);
        })
        .then(stopFn)
        .always(() => {
          this.attr('isUploading', false);
          this.dispatch('finish');
        })
        .fail((err) => {
          stopFn(true);
          if ( err && err.type === GDRIVE_PICKER_ERR_CANCEL ) {
            el.trigger('rejected');
          }
        });
    },

    trigger_upload_parent: function (scope, el) {
      // upload files with a parent folder (audits and workflows)
      let that = this;
      let parentFolderDfd;
      let folderId;
      let stopFn = () => {};

      if (that.instance.attr('_transient.folder')) {
        parentFolderDfd = $.when(
          [{instance: this.instance.attr('_transient.folder')}]
        );
      } else {
        folderId = this.instance.attr('folder');

        parentFolderDfd = findGDriveItemById(folderId);
      }
      bindXHRToButton(parentFolderDfd, el);

      parentFolderDfd
        .done(function (parentFolder) {
          that.attr('isUploading', true);
          uploadFiles({
            parentId: parentFolder.id,
          })
            .then((files) => {
              let filesCount = files && files.length ? files.length : 0;
              stopFn = tracker.start(scope.instance.type,
                tracker.USER_JOURNEY_KEYS.ATTACHMENTS,
                tracker.USER_ACTIONS.ADD_ATTACHMENT_TO_FOLDER(filesCount));
              return files;
            })
            .then(function (files) {
              return that.createDocumentModel(files);
            })
            .then(stopFn)
            .always(() => {
              that.attr('isUploading', false);
              that.dispatch('finish');
            })
            .fail(function () {
              // This case happens when user have no access to write in audit folder
              let error = _.last(arguments);

              stopFn(true);
              if (error && error.code === 403) {
                notifier('error', messages[403]);
              } else if ( error && error.type !== GDRIVE_PICKER_ERR_CANCEL ) {
                notifier('error', error && error.message);
              }
              that.dispatch('finish');
              that.attr('isUploading', false);
            });
        })
        .fail(function () {
          el.trigger('ajax:flash', {
            warning: 'Can\'t upload: No GDrive folder found',
          });
        });
    },

    createDocumentModel: function (files) {
      let instanceId = this.attr('instance.id');
      let instanceType = this.attr('instance.type');
      let contextId = this.attr('instance.context.id') || null;
      let modelType = this.attr('modelType');
      let ModelClass = businessModels[modelType];

      let models = files.map((file) => {
        let model = new ModelClass({
          context: new Context({id: contextId}),
          title: file.title,
          source_gdrive_id: file.id,
          is_uploaded: file.newUpload,
          parent_obj: {
            id: instanceId,
            type: instanceType,
          },
        });
        return model;
      });

      this.dispatch({
        type: 'beforeAttach',
        items: models,
      });

      let dfdDocs = models.map((model) => {
        return backendGdriveClient.withAuth(() => {
          return model.save();
        });
      });
      // waiting for all docs promises
      return $.when(...dfdDocs).then(() => {
        this.attr('instance').refresh();
        return can.makeArray(arguments);
      }, (xhr) => {
        let message = (xhr.responseJSON && xhr.responseJSON.message) ?
          xhr.responseJSON.message :
          xhr.responseText;

        if (message) {
          notifier('error', message);
        }
      });
    },
  },
});
