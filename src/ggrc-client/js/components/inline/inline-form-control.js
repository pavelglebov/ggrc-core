/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {notifierXHR} from '../../plugins/utils/notifiers-utils';

export default can.Component.extend({
  tag: 'inline-form-control',
  leakScope: true,
  viewModel: {
    deferredSave: null,
    instance: null,

    saveInlineForm: function (args) {
      let self = this;

      this.attr('deferredSave').push(function () {
        self.attr('instance.' + args.propName, args.value);
      }).fail(function (instance, xhr) {
        notifierXHR('error')(xhr);
      });
    },
  },
});
