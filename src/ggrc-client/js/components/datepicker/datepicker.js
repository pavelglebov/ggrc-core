/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  inViewport,
  isInnerClick,
} from '../../plugins/ggrc_utils';
import {DATE_FORMAT} from '../../plugins/utils/date-utils';
import template from './datepicker.mustache';

export default can.Component.extend({
  tag: 'datepicker',
  template,
  leakScope: true,
  viewModel: can.Map.extend({
    format: '@',
    helptext: '@',
    label: '@',
    setMinDate: null,
    setMaxDate: null,
    _date: null, // the internal value of the text input field
    define: {
      date: {
        set(newValue, setValue, onError, oldValue) {
          if (newValue === oldValue) {
            return;
          }

          if (this.attr('picker')) {
            this.attr('picker').datepicker('setDate', newValue);
          }
          setValue(newValue);
        },
      },
      readonly: {
        type: 'boolean',
        value: false,
      },
      disabled: {
        type: 'boolean',
        value: false,
      },
      required: {
        type: 'htmlbool',
        value: false,
      },
      persistent: {
        type: 'boolean',
        value: false,
      },
      isShown: {
        type: 'boolean',
        value: false,
      },
      noWeekends: {
        type: 'boolean',
        value: false,
      },
    },
    onSelect: function (val, ev) {
      this.attr('date', val);
      this.attr('isShown', false);
    },
    onFocus: function (el, ev) {
      this.attr('showTop', false);
      this.attr('isShown', true);

      if (!inViewport(this.picker)) {
        this.attr('showTop', true);
      }
    },
    removeValue: function (event) {
      event.preventDefault();

      this.picker.datepicker('setDate', null);
      this.attr('date', null);
    },
    MOMENT_DISPLAY_FMT: DATE_FORMAT.MOMENT_DISPLAY_FMT,
  }),

  events: {
    inserted: function () {
      let viewModel = this.viewModel;
      let element = this.element.find('.datepicker__calendar');
      let minDate;
      let maxDate;
      let date;
      let options = {
        dateFormat: DATE_FORMAT.PICKER_ISO_DATE,
        altField: this.element.find('.datepicker__input'),
        altFormat: DATE_FORMAT.PICKER_DISPLAY_FMT,
        onSelect: this.viewModel.onSelect.bind(this.viewModel),
      };

      if (viewModel.attr('noWeekends')) {
        options.beforeShowDay = $.datepicker.noWeekends;
      }

      element.datepicker(options);
      viewModel.attr('picker', element);

      date = this.getDate(viewModel.attr('date'));
      viewModel.picker.datepicker('setDate', date);

      // set the boundaries of the dates that user is allowed to select
      minDate = this.getDate(viewModel.setMinDate);
      maxDate = this.getDate(viewModel.setMaxDate);
      viewModel.attr('setMinDate', minDate);
      viewModel.attr('setMaxDate', maxDate);

      if (viewModel.setMinDate) {
        this.updateDate('minDate', viewModel.setMinDate);
      }
      if (viewModel.setMaxDate) {
        this.updateDate('maxDate', viewModel.setMaxDate);
      }
    },

    /**
     * Convert given date to an ISO date string.
     *
     * @param {Date|string|null} date - the date to convert
     * @return {string|null} - date in ISO format or null if empty or invalid
     */
    getDate: function (date) {
      if (date instanceof Date) {
        // NOTE: Not using moment.utc(), because if a Date instance is given,
        // it is in the browser's local timezone, thus we need to take that
        // into account to not end up with a different date. Ideally this
        // should never happen, but that would require refactoring the way
        // Date objects are created throughout the app.
        return moment(date).format(DATE_FORMAT.MOMENT_ISO_DATE);
      } else if (this.isValidDate(date)) {
        return date;
      }

      return null;
    },

    isValidDate: function (date) {
      return moment(date, DATE_FORMAT.MOMENT_ISO_DATE, true).isValid();
    },

    /**
     * Change the min/max date allowed to be picked.
     *
     * @param {string} type - the setting to change ("minDate" or "maxDate").
     *   The value given is automatically adjusted for a day as business
     *   rules dictate.
     * @param {Date|string|null} date - the new value of the `type` setting.
     *   If given as string, it must be in ISO date format.
     * @return {Date|null} - the new date value
     */
    updateDate: function (type, date) {
      let viewModel = this.viewModel;

      let types = {
        minDate: function () {
          date.add(1, 'day');
        },
        maxDate: function () {
          date.subtract(1, 'day');
        },
      };

      if (!date) {
        viewModel.picker.datepicker('option', type, null);
        return null;
      }

      if (date instanceof Date) {
        // NOTE: Not using moment.utc(), because if a Date instance is given,
        // it is in the browser's local timezone, thus we need to take that
        // into account to not end up with a different date. Ideally this
        // should never happen, but that would require refactoring the way
        // Date objects are created throughout the app.
        date = moment(date).format(DATE_FORMAT.MOMENT_ISO_DATE);
      }
      date = moment.utc(date);

      if (types[type]) {
        types[type]();
      }
      date = date.toDate();
      viewModel.picker.datepicker('option', type, date);
      return date;
    },

    /**
     * Prepeare date to ISO format.
     *
     * @param {Object} viewModel - viewModel of the Component
     * @param {string|null} val - the new value of the date setting.
     *   If given as string, it must be in ISO date format.
     * @return {string|null} - the new date value
     */
    prepareDate: function (viewModel, val) {
      let valISO = null;
      let valF = null;

      if (val) {
        val = val.trim();
        valF = moment.utc(val, DATE_FORMAT.MOMENT_DISPLAY_FMT, true);
        valISO = valF.isValid() ?
          valF.format(DATE_FORMAT.MOMENT_ISO_DATE) :
          null;
      }
      return valISO;
    },

    '{viewModel} setMinDate': function (viewModel, ev, date) {
      let currentDateObj = null;
      let updated = this.updateDate('minDate', date);

      if (viewModel.date) {
        currentDateObj = moment.utc(viewModel.date).toDate();
        if (currentDateObj < updated) {
          this.viewModel.attr(
            '_date',
            moment.utc(updated).format(DATE_FORMAT.MOMENT_DISPLAY_FMT));
        }
      }
    },

    '{viewModel} setMaxDate': function (viewModel, ev, date) {
      this.updateDate('maxDate', date);
    },

    '{viewModel} _date': function (viewModel, ev, val) {
      let valISO = this.prepareDate(viewModel, val);
      viewModel.attr('date', valISO);
      viewModel.picker.datepicker('setDate', valISO);
    },

    '{window} mousedown': function (el, ev) {
      let isInside;

      if (this.viewModel.attr('persistent')) {
        return;
      }
      isInside = isInnerClick(this.element, ev.target);

      if (this.viewModel.isShown && !isInside) {
        this.viewModel.attr('isShown', false);
      }
    },
  },
  helpers: {
    isHidden: function (opts) {
      if (this.attr('isShown') || this.attr('persistent')) {
        return opts.inverse();
      }
      return opts.fn();
    },
  },
});
