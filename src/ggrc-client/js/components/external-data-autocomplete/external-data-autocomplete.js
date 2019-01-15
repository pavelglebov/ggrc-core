/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './external-data-provider';
import './autocomplete-results';
import '../spinner/spinner';
import * as businessModels from '../../models/business-models';
import template from './external-data-autocomplete.mustache';

/**
 * The autocomplete component used to load data from external sources.
 * When user picks an external item, system will create corresponding item in database.
 */
export default can.Component.extend({
  tag: 'external-data-autocomplete',
  template,
  leakScope: true,
  viewModel: {
    define: {
      /**
       * The flag indicating that results will be rendered.
       * @type {Boolean}
       */
      renderResults: {
        value: false,
        get() {
          let showResults = this.attr('showResults');
          let minLength = this.attr('minLength');
          let searchCriteria = this.attr('searchCriteria');

          let result = showResults && searchCriteria.length >= minLength;

          return result;
        },
      },
    },
    /**
     * The type of model.
     * @type {String}
     */
    type: null,
    /**
     * The search criteria read from input.
     * @type {String}
     */
    searchCriteria: '',
    /**
     * The minimal length of search criteria that run search.
     * @type {Number}
     */
    minLength: 0,
    /**
     * The placeholder that should be displayed in input.
     * @type {String}
     */
    placeholder: '',
    /**
     * Additional CSS classes which should be applid to input element.
     * @type {String}
     */
    extraCssClass: '',
    /**
     * The flag indicating that results should be shown.
     * @type {Boolean}
     */
    showResults: false,
    /**
     * The flag indicating that search criteria should be cleaned after user picks an item.
     * @type {Boolean}
     */
    autoClean: true,
    /**
     * The flag indicating that system is creating corresponding model for external item.
     */
    saving: false,
    /**
     * Opens results list section.
     */
    openResults() {
      this.attr('showResults', true);
    },
    /**
     * Closes results list section.
     */
    closeResults() {
      this.attr('showResults', false);
    },
    /**
     * Updates search criteria and dispatches corresponding event.
     * @param {Object} - input html element.
     */
    setSearchCriteria: _.debounce(function (element) {
      let newCriteria = element.val();
      this.attr('searchCriteria', newCriteria);
      this.dispatch({
        type: 'criteriaChanged',
        value: newCriteria,
      });
    }, 500),
    /**
     * Creates model in system and dispatches corresponding event.
     * @param {Object} item - an item picked by user.
     */
    onItemPicked(item) {
      this.attr('saving', true);
      this.createOrGet(item).then((model) => {
        if (this.attr('autoClean')) {
          this.attr('searchCriteria', '');
        }

        this.dispatch({
          type: 'itemSelected',
          selectedItem: model,
        });
      }).finally(() => {// create is async and returns Promise (not $.Deferred)
        this.attr('saving', false);
      });
    },
    /**
     * Creates new model or returns existing from cache.
     * @param {Object} item - model data.
     * @return {can.promise} - promise indicates state of operation.
     */
    createOrGet(item) {
      const type = this.attr('type');
      const ModelClass = businessModels[type];

      item.attr('context', null);
      item.attr('external', true);

      return ModelClass.create(item).then((response) => {
        let data = response[0];
        let model = data[1][ModelClass.root_object];

        model = model.reify ? model.reify() : model;

        let result = ModelClass.cache[model.id] || new ModelClass(model);

        return result;
      });
    },
  },
});
