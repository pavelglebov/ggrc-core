/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import template from './autocomplete-component.stache';

/**
 * A component that renders an autocomplete text input field.
 */

// the component's configuration object (i.e. its constructor's prototype)
let component = {
  tag: 'autocomplete-component',
  view: canStache(template),
  leakScope: true,
  viewModel: canMap.extend({
    placeholder: '',
    searchItemsType: '',
    extraCssClass: '',
    value: null,

    // disable automatically mapping the picked item from the live search
    // results to the instance object of the current context
    automappingOff: true,
    define: {
      disable: {
        type: 'boolean',
        value: false,
      },
    },
  }),

  _EV_ITEM_SELECTED: 'item-selected',

  events: {
    inserted: function (el, ev) {
      this.element.find('.autocomplete--input').ggrc_autocomplete({
        appendTo: this.element.find('.autocomplete--wrapper'),
      });
    },

    'input input': function (el) {
      const inputValue = el.val();
      if (!inputValue) {
        this.viewModel.dispatch({
          type: 'itemErased',
        });
      }
    },

    /**
     * Event handler when an item is selected from the list of autocomplete's
     * search results.
     *
     * @param {jQuery.Element} $el - the source of the event `ev`
     * @param {jQuery.Event} ev - the event object
     * @param {Object} data - information about the selected item
     */
    'autocomplete:select': function ($el, ev, data) {
      $el.triggerHandler({
        type: component._EV_ITEM_SELECTED,
        selectedItem: data.item,
      });

      // keep the legacy event emitting mechanism above, but emit the event
      // using the more modern dispatch mechanism, too
      this.viewModel.dispatch({
        type: 'itemSelected',
        selectedItem: data.item,
      });

      // If the input still has focus after selecting an item, search results
      // do not appear unless user clicks out and back in the input (or
      // starts typing). Removing the focus spares one unnecessary click.
      $el.find('input').blur();
    },
  },
};

export default canComponent.extend(component);
