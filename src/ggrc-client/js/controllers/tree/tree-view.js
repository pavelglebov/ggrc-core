/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import loReduce from 'lodash/reduce';
import loForEach from 'lodash/forEach';
import loMap from 'lodash/map';
import {getFragment} from '../../plugins/ggrc-utils';
import isEmptyObject from 'can-util/js/is-empty-object/is-empty-object';
import canCompute from 'can-compute';
import makeArray from 'can-util/js/make-array/make-array';
import canModel from 'can-model';
import canMap from 'can-map';
import * as StateUtils from '../../plugins/utils/state-utils';
import {getCounts} from '../../plugins/utils/widgets-utils';
import TreeLoader from './tree-loader';
import TreeViewNode from './tree-view-node';
import TreeViewOptions from './tree-view-options';
import CustomAttributeDefinition from '../../models/custom-attributes/custom-attribute-definition';
import AccessControlRole from '../../models/custom-roles/access-control-role';

const TreeViewControl = TreeLoader.extend({
  // static properties
  defaults: {
    model: null,
    show_view: null,
    show_header: false,
    add_item_view: null,
    parent: null,
    find_params: {},
    fields: [],
    filter_states: [],
    sortable: true,
    options_property: 'tree_view_options',
    child_options: [], // this is how we can make nested configs. if you want to use an existing
    // example child option:
    // { property: "controls", model: Control, }
    // { parent_find_param: "system_id" ... }
  },
  do_not_propagate: [
    'header_view',
    'add_item_view',
    'original_list',
    'find_all_deferred',
  ],
}, {
  // prototype properties
  setup: function (el, opts) {
    let defaultOptions;
    let optionsProperty;
    let defaults = this.constructor.defaults;
    if (typeof this._super === 'function') {
      this._super(el);
    }

    optionsProperty = opts.options_property || defaults.options_property;
    defaultOptions = opts.model[optionsProperty] || {};

    this.options = new canMap(defaults).attr(defaultOptions).attr(opts);
    if (opts instanceof canMap) {
      this.options = Object.assign(this.options, opts);
    }
  },

  init: function (el, opts) {
    let states = StateUtils
      .getStatesForModel(this.options.model.model_singular);

    let filterStates = states.map(function (state) {
      return {value: state};
    });

    this.options.attr('filter_states', filterStates);

    const widget = this.element.closest('.widget');

    if (widget && !widget.hasClass('tree-view-control-attached')) {
      widget.on('widget_hidden', this.widget_hidden.bind(this));
      widget.on('widget_shown', this.widget_shown.bind(this));

      widget.addClass('tree-view-control-attached');
    }

    this.element.uniqueId();

    if (!this.options.scroll_element) {
      this.options.attr('scroll_element', $('.object-area'));
    }

    // Override nested child options for allow_* properties
    let allowed = {};
    this.options.each(function (item, prop) {
      if (prop.indexOf('allow') === 0 && item === false) {
        allowed[prop] = item;
      }
    });
    this.options.attr('child_options', this.options.child_options.slice(0));
    loForEach(this.options.child_options, function (options, i) {
      this.options.child_options.attr(i,
        new canMap(Object.assign(options.attr(), allowed)));
    }.bind(this));

    this._attached_deferred = $.Deferred();
    if (this.element && this.element.closest('body').length) {
      this._attached_deferred.resolve();
    }

    // Make sure the parent_instance is not a computable
    if (typeof this.options.parent_instance === 'function') {
      this.options.attr('parent_instance', this.options.parent_instance());
    }
  },
  ' inserted': function () { // eslint-disable-line quote-props
    this._attached_deferred.resolve();
  },
  init_view: function () {
    let dfds = [];
    if (this.options.header_view && this.options.show_header) {
      dfds.push(
        $.when(this.options)
          .then((ctx) => {
            return getFragment(this.options.header_view, ctx);
          }).then(
            this._ifNotRemoved((frag) => {
              this.element.before(frag);
            })
          )
      );
    }

    this.init_count();

    return $.when.apply($.when, dfds);
  },

  init_count: function () {
    let self = this;
    let options = this.options;
    let countsName = options.countsName || options.model.model_singular;

    if (this.options.list_loader) {
      this.options.list_loader(this.options.parent_instance)
        .then(function (list) {
          return canCompute(function () {
            return list.attr('length');
          });
        })
        .then(function (count) {
          if (self.element) {
            getCounts().attr(countsName, count());
          }
          count.bind('change', self._ifNotRemoved(function () {
            getCounts().attr(countsName, count());
          }));
        });
    }
  },

  fetch_list: function () {
    if (this.find_all_deferred) {
      //  Skip, because already done, e.g., display() already called
      return this.find_all_deferred;
    }
    if (isEmptyObject(this.options.find_params.serialize())) {
      this.options.find_params.attr(
        'id', this.options.parent_instance ?
          this.options.parent_instance.id : undefined);
    }

    const {
      mapping,
      parent_instance: instance,
    } = this.options;
    // TODO Handle Add new GCA button - need to refresh list of GCA (the same for roles)
    if (mapping) {
      if (instance === undefined) {
        // TODO investigate why is this method sometimes called twice
        return undefined; // not ready, will try again
      }

      let dfd;
      switch (mapping) {
        case 'access_control_roles':
          dfd = AccessControlRole.findAll({
            object_type: instance.model_singular,
            internal: false,
          });
          break;
        case 'custom_attribute_definitions': {
          dfd = CustomAttributeDefinition.findAll({
            definition_type: instance.root_object,
            definition_id: null,
          });

          break;
        }
      }

      this.find_all_deferred = dfd;
    } else if (this.options.list_loader) {
      this.find_all_deferred = this.options.list_loader(instance);
    } else {
      console.warn(`Unexpected code path ${this}`);
    }

    return this.find_all_deferred;
  },

  prepare_child_options: function (v) {
    //  v may be any of:
    //    <model_instance>
    //    { instance: <model instance>, mappings: [...] }
    //    <TreeOptions>
    let tmp;
    let that = this;
    let original = v;
    if (v._child_options_prepared) {
      return v._child_options_prepared;
    }
    if (!(v instanceof TreeViewOptions)) {
      tmp = v;
      v = new TreeViewOptions();
      v.attr('instance', tmp);
      this.options.each(function (val, k) {
        if (!that.constructor.do_not_propagate.includes(k)) {
          v.attr(k, val);
        }
      });
    }
    if (!(v.instance instanceof canModel)) {
      if (v.instance.instance instanceof canModel) {
        v.attr('result', v.instance);
        v.attr('mappings', v.instance.mappings_compute());
        v.attr('instance', v.instance.instance);
      } else {
        v.attr('instance', this.options.model.model(v.instance));
      }
    }
    original._child_options_prepared = v;
    return v;
  },

  removeListItem(item) {
    this.element
      .find(`.tree-view-node[data-object-id="${item.attr('id')}"]`)
      .remove();
  },
  // add child options to every item (TreeViewOptions instance) in the drawing list at this level of the tree.
  add_child_lists: function (list) {
    let that = this;
    let currentList = makeArray(list);
    let listWindow = [];
    let finalDfd;
    let queue = [];
    let BATCH = 200;
    let opId = this._add_child_lists_id = (this._add_child_lists_id || 0) + 1;

    currentList.forEach(function (item) {
      listWindow.push(item);
      if (listWindow.length >= BATCH) {
        queue.push(listWindow);
        listWindow = [];
      }
    });
    if (listWindow.length > 0) {
      queue.push(listWindow);
    }
    finalDfd = loReduce(queue, function (dfd, listWindow) {
      return dfd.then(function () {
        let res = $.Deferred();
        if (that._add_child_lists_id !== opId) {
          return dfd;
        }
        setTimeout(function () {
          let draw;
          let drawDfd;
          if (that._add_child_lists_id !== opId) {
            return;
          }
          draw = that._ifNotRemoved(that.draw_items.bind(that));

          drawDfd = draw(listWindow);

          if (drawDfd) {
            drawDfd.then(res.resolve);
          } else {
            res.resolve();
          }
        }, 0);
        return res;
      });
    }, $.Deferred().resolve());

    return finalDfd;
  },
  draw_items: function (optionsList) {
    let items;
    let $footer = this.element.children('.tree-item-add').first();
    let drawItemsDfds = [];
    let res;

    items = makeArray(optionsList);

    items = loMap(items, function (options) {
      let elem = document.createElement('li');
      let control = new TreeViewNode(elem, options);
      drawItemsDfds.push(control._draw_node_deferred);
      return control.element[0];
    });

    if ($footer.length) {
      $(items).insertBefore($footer);
    } else {
      this.element.append(items);
    }
    if (this.options.sortable) {
      $(this.element).sortable({element: 'li.tree-item', handle: '.drag'});
    }

    res = $.when(...drawItemsDfds);
    return res;
  },

  widget_hidden: function (event) {
    if (this.options.original_list) {
      this.clearList();
    }
    if (this._add_child_lists_id) {
      this._add_child_lists_id += 1;
    }

    return false;
  },

  widget_shown: function (event) {
    if (this.options.original_list) {
      setTimeout(this.reload_list.bind(this), 0);
    }
    return false;
  },

  reload_list() {
    this._draw_list_deferred = false;
    this.find_all_deferred = false;
    this.draw_list(this.options.original_list);
    this.init_count();
  },

  clearList: function () {
    this.element.children('.tree-item').remove();
  },
});

export default TreeViewControl;
