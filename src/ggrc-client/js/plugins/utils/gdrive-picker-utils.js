/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {gapiClient} from '../ggrc-gapi-client';
import {getPickerElement} from '../ggrc_utils';
import escStack from './esc-stack-utils';

export const GDRIVE_PICKER_ERR_CANCEL = 'GDRIVE_PICKER_ERR_CANCEL';

/**
 * Calls GDrive Picker and returns promise which is resolved to uploaded files
 * @param  {Object}  [opts={}]     options
 * @param  {String}  opts.parentId id of the destination folder
 * @param  {boolean} opts.pickFolder wether to use the single folder picker mode ( overrides multiSelect to false )
 * @param  {boolean} opts.multiSelect wether to allow multiple file selection available only in file picker mode i.e. pickFolder=false
 * @return {Promise.<Array.<GDriveFile>>} A Promise which resolves to an array of GDriveFile instances and a picker action as a second parameter
 */
export function uploadFiles(opts = {}) {
  let {parentId=null, pickFolder=false, multiSelect=true} = opts;
  let dfd = new $.Deferred();
  let pickerBuilder;
  let picker;

  gapiClient.authorizeGapi(['https://www.googleapis.com/auth/drive'])
    .then(() => {
      gapi.load('picker', {callback: createPicker});
    }, dfd.reject);

  // Create and render a Picker object for searching images.
  function createPicker() {
    let dialog;
    let view;

    pickerBuilder = new google.picker.PickerBuilder();

    if (pickFolder) {
      view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        // .setMimeTypes(['application/vnd.google-apps.folder'])
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);
      pickerBuilder.addView(view);
      pickerBuilder.setTitle('Select folder');
    } else {
      pickerBuilder
        .addView(new google.picker.DocsUploadView().setParent(parentId))
        .addView(google.picker.ViewId.DOCS);
      // .addView(new google.picker.DocsView().setParent(parentId));
      if (multiSelect) {
        pickerBuilder
          .enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
      }
    }

    picker = pickerBuilder.setOAuthToken(gapi.auth.getToken().access_token)
      .setDeveloperKey(GGRC.config.GAPI_KEY)
      .setMaxItems(10)
      .setCallback(pickerCallback)
      .build();

    console.warn('Next two errors are expected.');
    picker.setVisible(true);

    dialog = getPickerElement(picker);
    if (dialog) {
      dialog.style.zIndex = 4001; // our modals start with 2050
    }
  }

  // A simple callback implementation.
  function pickerCallback(data) {
    let ACTION = google.picker.Response.ACTION;
    let CANCEL = google.picker.Action.CANCEL;
    let PICKED = google.picker.Action.PICKED;
    let DOCUMENTS = google.picker.Response.DOCUMENTS;
    let LOADED = 'loaded';

    if (data[ACTION] === LOADED) {
      escStack.setGdriveState(true);
    }

    if (data[ACTION] === PICKED) {
      let pickedFiles = data[DOCUMENTS];
      // NB: picker file object have different format then GDrive file objects
      // "name" <=> "title", "url" <=> "alternateLink"
      // RefreshQueue converts picker file objects into GDrive file objects
      let pickedFilesById = _.keyBy(pickedFiles, 'id');
      let refreshDfds = pickedFiles.map((file) => findGDriveItemById(file.id));
      can.when(...refreshDfds).then((...files) => {
        // adding a newUpload flag so we can later distinguish newly
        // uploaded files from the picked ones.
        files.forEach((file) => {
          file.newUpload = pickedFilesById[file.id].isNew;
        });
        dfd.resolve(files);
      }, dfd.reject);
    } else if (data[ACTION] === CANCEL) {
      let err = new Error('Canceled by user');
      err.type = GDRIVE_PICKER_ERR_CANCEL;
      dfd.reject(err);
    }
    // sometimes pickerCallback is called with data == { action: 'loaded' }
    // which is not described in the Picker API Docs
    if ( data[ACTION] === PICKED || data[ACTION] === CANCEL ) {
      picker.dispose();
      escStack.setGdriveState(false);
    }
  }
  return dfd.promise();
}

export function findGDriveItemById(id) {
  let path = `/drive/v2/files/${id}`;

  return gapiClient.authorizeGapi(['https://www.googleapis.com/auth/drive'])
    .then(() => gapiClient.makeGapiRequest({path, method: 'get'}));
}
