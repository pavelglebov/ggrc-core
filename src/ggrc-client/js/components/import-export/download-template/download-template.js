/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import '../../dropdown/multiselect-dropdown';
import template from './download-template.mustache';
import {downloadTemplate, download} from '../../../plugins/utils/import-export-utils';
import {backendGdriveClient} from '../../../plugins/ggrc-gapi-client';
import {confirm} from '../../../plugins/utils/modals';

const tag = 'download-template';
const CSV_FILE_NAME = 'import_template.csv';
const CSV_FORMAT = 'csv';
const SHEET_FORMAT = 'gdrive';
const importOptions = GGRC.Bootstrap.importable.map((el) => {
  return {
    name: el.model_singular,
    value: el.title_plural,
  };
});
const viewModel = can.Map.extend({
  define: {},
  modalTitle: 'Download Template',
  modalState: {
    open: false,
    result: {},
  },
  isLoading: false,
  selected: [],
  importableModels: importOptions,
  close() {
    if (this.attr('isLoading')) {
      return;
    }
    this.attr('modalState.open', false);
    this.attr('selected').replace([]);
    this.attr('importableModels').forEach((element) => {
      element.attr('checked', false);
    });
  },
  showDialog() {
    this.attr('modalState.open', true);
  },
  selectItems(event) {
    let selected = event.selected;

    if (!selected || !selected.length) {
      this.attr('selected', []);
    } else {
      this.attr('selected', selected);
    }
  },
  prepareSelected() {
    let selected = this.attr('selected');
    let objects = [];

    objects = Array.from(selected).map(({name}) => {
      return {
        object_name: name,
      };
    });

    return objects;
  },
  downloadCSV() {
    let objects = this.prepareSelected();

    this.attr('isLoading', true);

    return downloadTemplate({
      data: {
        objects,
        export_to: CSV_FORMAT,
      },
    }).then(function (data) {
      download(CSV_FILE_NAME, data);
    }).always(() => {
      this.attr('isLoading', false);
      this.close();
    });
  },
  downloadSheet() {
    let objects = this.prepareSelected();

    this.attr('isLoading', true);

    return backendGdriveClient.withAuth(() => {
      return downloadTemplate({
        data: {
          objects,
          export_to: SHEET_FORMAT,
        },
      });
    }).then((data) => {
      let link = `https://docs.google.com/spreadsheets/d/${data.id}`;

      confirm({
        modal_title: 'File Generated',
        modal_description: `GDrive file is generated successfully.
         Click button below to view the file.`,
        gDriveLink: link,
        button_view: `${GGRC.mustache_path}/modals/open_sheet.mustache`,
      });
    }).always(() => {
      this.attr('isLoading', false);
      this.close();
    });
  },
});

export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel,
});
