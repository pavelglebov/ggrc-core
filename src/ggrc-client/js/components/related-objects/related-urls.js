/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/


import Permission from '../../permission';
import template from './templates/related-urls.mustache';
import {notifier} from '../../plugins/utils/notifiers-utils';

export default can.Component.extend({
  tag: 'related-urls',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      canAddUrl: {
        get() {
          let canEditInstance = this.attr('instance').isNew() ||
            Permission.is_allowed_for('update', this.attr('instance'));
          let isNotEditable = this.attr('isNotEditable');

          return canEditInstance && !isNotEditable;
        },
      },
      canRemoveUrl: {
        get() {
          let canEditInstance = this.attr('instance').isNew() ||
            Permission.is_allowed_for('update', this.attr('instance'));
          let isNotEditable = this.attr('isNotEditable');
          let allowToRemove = this.attr('allowToRemove');

          return canEditInstance && !isNotEditable && allowToRemove;
        },
      },
      emptyMessage: {
        get() {
          let canAddUrl = this.attr('canAddUrl');

          return canAddUrl ? '' : 'None';
        },
      },
      showMore: {
        type: 'boolean',
        get() {
          return !this.attr('isSnapshot');
        },
      },
    },
    instance: null,
    isSnaphot: false,
    element: null,
    urls: [],
    value: '',
    isFormVisible: false,
    isDisabled: false,
    isNotEditable: false,
    allowToRemove: true,
    /**
     * @description Moves focus to the create url input element
     */
    moveFocusToInput: function () {
      let inputElements = this.element.find('input');
      if (inputElements.length) {
        inputElements[0].focus();
      }
    },
    /**
     * @description Validates user input
     *
     * @param  {String} data Data for validation
     * @return {Boolean} - If incoming string is empty it returns false,
     * otherwise true
     */
    validateUserInput: function (data) {
      return data.length > 0;
    },
    /**
     * Handle changes during toggling form visibility.
     *
     * @param  {Boolean} isVisible - New value for form visibility
     * @param  {Boolean} [keepValue=false] - Whether to preserve the existing
     *   value of the form input field or not.
     */

    toggleFormVisibility: function (isVisible, keepValue) {
      this.attr('isFormVisible', isVisible);
      if (!keepValue) {
        this.attr('value', '');
      }
      if (isVisible) {
        this.moveFocusToInput();
      }
    },
    /**
     * @description Handles create url form submitting
     *
     * @param  {String} url - url to create
     * @return {Boolean} - it returns false to prevent page refresh
     */
    submitCreateUrlForm: function (url) {
      let existingUrls;
      let trimmedUrl = url.trim();
      let isValid = this.validateUserInput(trimmedUrl);

      // non-valid user input case - empty string
      if (!isValid) {
        notifier('error', 'Please enter a URL.');
        this.toggleFormVisibility(true);
        return false;
      }

      // duplicate URLs check
      existingUrls = _.map(this.attr('urls'), 'link');

      if (_.includes(existingUrls, trimmedUrl)) {
        notifier('error', 'URL already exists.');
        this.toggleFormVisibility(true, true);
        return false;
      }

      this.createUrl(trimmedUrl);

      this.toggleFormVisibility(false);
      return false;
    },
    /**
     * @description Dispatches 'createUrl' event with appropriate
     * data payload
     *
     * @param  {String} url - url to create
     */
    createUrl: function (url) {
      this.dispatch({
        type: 'createUrl',
        payload: url,
      });
    },
    /**
     * @description Dispatches 'removeUrl' event with appropriate
     * data payload
     *
     * @param  {string} url - url to delete
     */
    removeUrl: function (url) {
      this.dispatch({
        type: 'removeUrl',
        payload: url,
      });
    },
  },
  events: {
    /**
     * @description Handler for 'inserted' event to save reference
     * to component element
     */
    inserted: function () {
      this.viewModel.attr('element', this.element);
    },
  },
});
