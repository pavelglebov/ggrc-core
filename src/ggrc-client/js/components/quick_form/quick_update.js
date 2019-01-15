/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Stub from '../../models/stub';

/*
  This component is for quickly updating the properties of an object through form fields.
  It works similar to QuickForm controller but has an extra feature: if the instance
  we're working with is a join object, and the option type is changed, it will work around
  the lack of support in proxy mappers for join objects being changed like that, and
  destroy the join object while creating a new one.

  Field updates trigger updates to the model automatically, even on the server.  This differs
  from the quick-add component above, in that it is not waiting for a submit trigger.
*/
export default can.Component.extend({
  tag: 'ggrc-quick-update',
  leakScope: true,
  viewModel: {
    instance: null,
    model: null,
    attributes: {},
  },
  events: {
    init: function () {
      this.viewModel.attr('controller', this);
      this.viewModel.attr('model', this.viewModel.model ||
          this.viewModel.instance.constructor);
      if (!this.viewModel.instance._transient) {
        // only refresh if there's not currently an edit modal spawned.
        this.viewModel.instance.refresh();
      }
    },
    // currently we don't support proxy object updates in mappings, so for now a change
    // to a connected object (assuming we are operating on a proxy object) will trigger
    // a deletion of the proxy object and creation of a new one.
    autocomplete_select: function (el, event, ui) {
      let that = this;
      setTimeout(function () {
        let serial = that.viewModel.instance.serialize();
        delete serial[el.attr('name')];
        delete serial[el.attr('name') + '_id'];
        delete serial[el.attr('name') + '_type'];
        delete serial.id;
        delete serial.href;
        delete serial.selfLink;
        delete serial.created_at;
        delete serial.updated_at;
        serial[el.attr('name')] = new Stub(ui.item);
        that.viewModel.instance.destroy().then(function () {
          new that.viewModel.model(serial).save();
        });
      });
    },
    // null-if-empty attributes are a pattern carried over from Modals controller
    // Useful for connected objects.
    'input[null-if-empty] change': function (el) {
      if (!el.val()) {
        this.viewModel.instance.attr(el.attr('name'), null);
      }
    },
    'input, select change': function (el) {
      let isCheckbox = el.is('[type=checkbox][multiple]');
      let isDropdown = el.is('select');
      if (isCheckbox) {
        if (!this.viewModel.instance[el.attr('name')]) {
          this.viewModel.instance.attr(el.attr('name'), new can.List());
        }
        this.viewModel.instance
          .attr(el.attr('name'))
          .replace(
            can.map(
              this.element.find(
                'input[name="' + el.attr('name') + '"]:checked'),
              function (el) {
                return $(el).val();
              }
            )
          );
        this.element.find('input:checkbox').prop('disabled', true);
      } else {
        this.viewModel.instance.attr(el.attr('name'), el.val());
        if (isDropdown) {
          el.closest('dropdown').attr('is-disabled', true);
        }
      }
      this.viewModel.instance.save().then(function () {
        if (isCheckbox) {
          this.element.find('input:checkbox').prop('disabled', false);
        } else if (isDropdown) {
          el.closest('dropdown').attr('is-disabled', false);
        }
      }.bind(this));
    },
  },
});
