/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './current-exports.mustache';
import {jobStatuses} from '../../../plugins/utils/import-export-utils';

export default can.Component.extend({
  tag: 'current-exports',
  template,
  leakScope: true,
  viewModel: {
    exports: [],
    disabled: {},
    inProgress: false,
    remove(id) {
      this.dispatch({
        type: 'removeItem',
        id,
      });
    },
    stop(id) {
      this.dispatch({
        type: 'stopExport',
        id,
      });
    },
    downloadCSV(id, fileName) {
      this.dispatch({
        type: 'viewContent',
        format: 'csv',
        fileName,
        id,
      });
    },
    openSheet(id) {
      this.dispatch({
        type: 'viewContent',
        format: 'gdrive',
        id,
      });
    },
  },
  helpers: {
    canRemove(status, options) {
      let canRemove = [
        jobStatuses.FINISHED, jobStatuses.STOPPED, jobStatuses.FAILED,
      ].includes(status());

      return canRemove ?
        options.fn(options.contexts) :
        options.inverse(options.contexts);
    },
    isDisabled(id, options) {
      let isDisabled = this.attr(`disabled.${id()}`);

      return isDisabled ?
        options.fn(options.contexts) :
        options.inverse(options.contexts);
    },
  },
});
