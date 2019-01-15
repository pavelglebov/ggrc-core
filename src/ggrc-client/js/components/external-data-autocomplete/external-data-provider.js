/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {notifier} from '../../plugins/utils/notifiers-utils';

/**
 * The component is used to load data for autocomplete component from external sources.
 */
export default can.Component.extend({
  tag: 'external-data-provider',
  leakScope: true,
  viewModel: {
    /**
     * The search that should be used in request.
     * @type {String}
     */
    searchCriteria: '',
    /**
     * The type of model.
     * @type {String}
     */
    type: null,
    /**
     * The list of values returned from external source.
     * @type {Array}
     */
    values: [],
    /**
     * Indicates that system is loading results.
     * @type {Boolean}
     */
    loading: false,
    /**
     * The current request number.
     * It is used to process only latest request result.
     * @type {Number}
     */
    currentRequest: 0,
    /**
     * Loads data from external source.
     */
    loadData() {
      let searchCriteria = this.attr('searchCriteria');
      let type = this.attr('type');
      let requestNumber = this.attr('currentRequest') + 1;

      // We have to process only latest request because only latest search criteria is valid.
      // Otherwise intermediate data will be displayed.
      let executeForLastRequest = (callback) => {
        return (response) => {
          if (this.attr('currentRequest') === requestNumber) {
            callback(response);
          }
        };
      };

      this.attr('loading', true);

      this.attr('request', $.get({
        url: GGRC.config.external_services[type],
        data: {
          prefix: searchCriteria,
        },
      }).done(executeForLastRequest((response) => {
        this.attr('values', response);
      })).fail(executeForLastRequest(() => {
        notifier('error', `Unable to load ${type}s`);
      })).always(executeForLastRequest(() => {
        this.attr('loading', false);
      })));

      this.attr('currentRequest', requestNumber);
    },
  },
  /**
   * Launch search when component is initialized.
   */
  init() {
    this.viewModel.loadData();
  },
  events: {
    /**
     * Launch search when search criteria was changed.
     */
    '{viewModel} searchCriteria'() {
      this.viewModel.loadData();
    },
  },
});
