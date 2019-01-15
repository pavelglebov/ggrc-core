/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../spinner/spinner';
import template from './autocomplete-results.mustache';

/**
 * The component is used to show autocomplete results and handle user's clicks.
 */
export default can.Component.extend({
  tag: 'autocomplete-results',
  template,
  leakScope: true,
  viewModel: {
    define: {
      /**
       * Collection containing a list of results.
       * Each item should contain the following properties:
       * - title {String} - The property containing title of element.
       * - info {String} - The property containing additional info.
       * - value {Object} - The object that should be passed when user picks corresponding element.
       * @type {can.List}
       */
      results: {
        Value: can.List,
        get() {
          let values = this.attr('values');
          let titleFieldPath = this.attr('titleFieldPath');
          let infoFieldPath = this.attr('infoFieldPath');

          let results = values.map((result) => {
            return {
              title: titleFieldPath ? result.attr(titleFieldPath) : '',
              info: infoFieldPath ? result.attr(infoFieldPath) : '',
              value: result,
            };
          });

          return results;
        },
      },
    },
    /**
     * Contains path to field that should be displayed as title.
     * @type {String}
     */
    titleFieldPath: null,
    /**
     * Contains path to field that should be displayed as info.
     */
    infoFieldPath: null,
    /**
     * Indicates that system is loading results.
     * It used to toggle spinner.
     * @type {Boolean}
     */
    loading: false,

    /**
     * The list of results which should be displayed.
     * @type {can.List}
     */
    values: [],
    /**
     * Handles user's click and dispathes the event.
     * @param {Object} item - The item picked by user.
     * @param {Object} event - The corresponding event.
     */
    pickItem(item, event) {
      event.stopPropagation();
      this.dispatch({
        type: 'itemPicked',
        data: item,
      });
    },
  },
});
