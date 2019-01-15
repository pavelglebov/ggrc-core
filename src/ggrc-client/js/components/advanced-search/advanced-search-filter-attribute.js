/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../dropdown/autocomplete-dropdown';
import template from './advanced-search-filter-attribute.mustache';

/**
 * Filter Attribute view model.
 * Contains logic used in Filter Attribute component
 * @constructor
 */
let viewModel = can.Map.extend({
  define: {
    isUnary: {
      get() {
        let operator = this.attr('attribute.operator');
        return operator === 'is';
      },
    },
    /**
     * Contains available attributes for specific model.
     * Initializes component with first attribute in the list.
     * @type {can.List}
     */
    availableAttributes: {
      type: '*',
      Value: can.List,
      set: function (attributes) {
        let attribute = this.attr('attribute');
        if (attributes.length &&
          attributes[0].attr_title &&
          !attribute.attr('field')) {
          attribute.attr('field', attributes[0].attr_title);
        }
        return attributes;
      },
    },
  },
  /**
   * Contains criterion's fields: field, operator, value.
   * @type {object}
   */
  attribute: {},
  /**
   * Returns titles of available attributes for specific model.
   * @return {list}
   */
  attributeTitles: function () {
    return this.attr('availableAttributes').map((item) => {
      return {value: item.attr_title};
    });
  },
  /**
   * Indicates Filter Attribute can be transformed to Filter Group.
   * @type {boolean}
   */
  extendable: false,
  /**
   * Indicates that action buttons should be displayed.
   * @type {boolean}
   */
  showActions: true,
  /**
   * Dispatches event meaning that the component should be removed from parent container.
   */
  remove: function () {
    this.dispatch('remove');
  },
  /**
   * Dispatches event meaning that the component should be transformed to Filter Group.
   */
  createGroup: function () {
    this.dispatch('createGroup');
  },
  /**
   * Sets attribute value from $element value
   * Used to update value on pressing enter as $value binding works
   * on focusout event
   *
   * @param {jQuery} $element the DOM element that triggered event
   */
  setValue: function ($element) {
    this.attr('attribute.value', $element.val());
  },
});

/**
 * Filter Attribute is a component representing a filter criterion.
 * Criterion has the following form:
 * field - operator - value
 */
export default can.Component.extend({
  tag: 'advanced-search-filter-attribute',
  template: template,
  leakScope: true,
  viewModel: viewModel,
  events: {
    '{viewModel} availableAttributes': function (ev, desc, attributes) {
      if (attributes[0] && attributes[0].attr_title) {
        this.viewModel.attr('attribute.field', attributes[0].attr_title);
      }
    },
    '{viewModel.attribute} operator'(attribute, ev, newValue, oldValue) {
      if (newValue === 'is') {
        attribute.attr('value', 'empty');
        return;
      }
      if (oldValue === 'is') {
        attribute.attr('value', '');
        return;
      }
    },
  },
});
