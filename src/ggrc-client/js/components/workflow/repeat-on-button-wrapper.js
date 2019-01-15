/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './repeat-on-button';

export default can.Component.extend({
  tag: 'repeat-on-button-wrapper',
  template: '<repeat-on-button ' +
    '{unit}="instance.unit" ' +
    '{repeat-every}="instance.repeat_every" ' +
    '{on-save-repeat}="@onSetRepeat">' +
    '</repeat-on-button>',
  leakScope: true,
  viewModel: {
    define: {
      autoSave: {
        type: 'boolean',
        value: false,
      },
    },
    instance: {},
    setRepeatOn: function (unit, repeatEvery) {
      this.attr('instance.unit', unit);
      this.attr('instance.repeat_every', repeatEvery);
    },
    updateRepeatOn: function () {
      let deferred = $.Deferred();
      let instance = this.attr('instance');

      instance.save()
        .done(function () {
          $(document.body).trigger('ajax:flash', {
            success: 'Repeat updated successfully',
          });
        })
        .fail(function () {
          $(document.body).trigger('ajax:flash', {
            error: 'An error occurred',
          });
        })
        .always(function () {
          deferred.resolve();
        });

      return deferred;
    },
    onSetRepeat: function (unit, repeatEvery) {
      this.setRepeatOn(unit, repeatEvery);
      if (this.attr('autoSave')) {
        return this.updateRepeatOn();
      }

      return $.Deferred().resolve();
    },
  },
});
