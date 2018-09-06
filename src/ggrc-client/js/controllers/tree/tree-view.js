/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import * as StateUtils from '../../plugins/utils/state-utils';
import {
  getCounts,
} from '../../plugins/utils/current-page-utils';
import Permission from '../../permission';
import DisplayPrefs from '../../models/local-storage/display-prefs';
import TreeViewOptions from './tree-view-options';

(function (can, $) {
  CMS.Controllers.TreeLoader.extend('CMS.Controllers.TreeView', {
    // static properties
    defaults: {
      model: null,
      show_view: null,
      show_header: false,
      footer_view: null,
      add_item_view: null,
      parent: null,
      list: null,
      filteredList: [],
      single_object: false,
      find_params: {},
      fields: [],
      filter_states: [],
      sortable: true,
      start_expanded: false, // true
      draw_children: true,
      find_function: null,
      options_property: 'tree_view_options',
      allow_reading: true,
      allow_mapping: true,
      allow_creating: true,
      child_options: [], // this is how we can make nested configs. if you want to use an existing
      // example child option:
      // { property: "controls", model: Control, }
      // { parent_find_param: "system_id" ... }
      scroll_page_count: 1, // pages above and below viewport
      is_subtree: false,
      subTreeElementsLimit: 20,
      limitDeepOfTree: 2,
    },
    do_not_propagate: [
      'header_view',
      'footer_view',
      'add_item_view',
      'list',
      'original_list',
      'single_object',
      'find_function',
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

      this.options = new can.Map(defaults).attr(defaultOptions).attr(opts);
      if (opts instanceof can.Map) {
        this.options = can.extend(this.options, opts);
      }
    },

    init: function (el, opts) {
      let setAllowMapping;
      let states = StateUtils.getStatesForModel(this.options.model.shortName);

      let filterStates = states.map(function (state) {
        return {value: state};
      });

      this.options.attr('filter_states', filterStates);

      this.element.closest('.widget')
        .on('widget_hidden', this.widget_hidden.bind(this));
      this.element.closest('.widget')
        .on('widget_shown', this.widget_shown.bind(this));
      DisplayPrefs.getSingleton().then(function (displayPrefs) {
        let allowed;

        this.display_prefs = displayPrefs;

        this.element.uniqueId();

        this.options.attr('is_subtree',
          this.element && this.element.closest('.inner-tree').length > 0);

        if ('parent_instance' in opts && 'status' in opts.parent_instance) {
          setAllowMapping = function () {
            let isAccepted = opts.parent_instance.attr('status') === 'Accepted';
            let admin = Permission.is_allowed('__GGRC_ADMIN__');
            this.options.attr('allow_mapping_or_creating',
              (admin || !isAccepted) &&
              (this.options.allow_mapping || this.options.allow_creating));
          }.bind(this);
          setAllowMapping();
          opts.parent_instance.bind('change', setAllowMapping);
        } else {
          this.options.attr('allow_mapping_or_creating',
            this.options.allow_mapping || this.options.allow_creating);
        }

        this.options.update_count =
          _.isBoolean(this.element.data('update-count')) ?
            this.element.data('update-count') :
            true;

        if (!this.options.scroll_element) {
          this.options.attr('scroll_element', $('.object-area'));
        }

        // Override nested child options for allow_* properties
        allowed = {};
        this.options.each(function (item, prop) {
          if (prop.indexOf('allow') === 0 && item === false) {
            allowed[prop] = item;
          }
        });
        this.options.attr('child_options', this.options.child_options.slice(0));
        can.each(this.options.child_options, function (options, i) {
          this.options.child_options.attr(i,
            new can.Map(can.extend(options.attr(), allowed)));
        }.bind(this));

        this._attached_deferred = can.Deferred();
        if (this.element && this.element.closest('body').length) {
          this._attached_deferred.resolve();
        }
      }.bind(this));
      // Make sure the parent_instance is not a computable
      if (typeof this.options.parent_instance === 'function') {
        this.options.attr('parent_instance', this.options.parent_instance());
      }
    },

    ' inserted': function () { // eslint-disable-line quote-props
      this._attached_deferred.resolve();
    },

    init_view: function () {
      let self = this;
      let dfds = [];
      let optionsDfd;
      let statusControl;

      if (this.options.header_view && this.options.show_header) {
        optionsDfd = $.when(this.options);
        dfds.push(
          can.view(this.options.header_view, optionsDfd).then(
            this._ifNotRemoved(function (frag) {
              this.element.before(frag);

              statusControl = this.element.parent()
                .find('.tree-filter__status-wrap');
              // set state filter (checkboxes)
              can.bind.call(statusControl.ready(function () {
                let selectStateList = self.options.attr('selectStateList');

                self.options.attr('filter_states').forEach(function (item) {
                  if (selectStateList.indexOf(item.value) > -1) {
                    item.attr('checked', true);
                  }
                });
              }));
            }.bind(this))));
      }

      this.init_count();

      if (this.options.footer_view) {
        dfds.push(
          can.view(this.options.footer_view, this.options,
            this._ifNotRemoved(function (frag) {
              this.element.after(frag);
            }.bind(this))
          ));
      }

      this._init_view_deferred = $.when.apply($.when, dfds);
      return this._init_view_deferred;
    },

    init_count: function () {
      let self = this;
      let options = this.options;
      let counts;
      let countsName = options.countsName || options.model.shortName;

      if (this.options.parent_instance && this.options.mapping) {
        counts = getCounts();

        if (self.element) {
          can.trigger(self.element, 'updateCount',
            [counts.attr(countsName), self.options.update_count]);
        }

        counts.on(countsName, function (ev, newVal, oldVal) {
          can.trigger(self.element, 'updateCount',
            [newVal, self.options.update_count]);
        });
      } else if (this.options.list_loader) {
        this.options.list_loader(this.options.parent_instance)
          .then(function (list) {
            return can.compute(function () {
              return list.attr('length');
            });
          })
          .then(function (count) {
            if (self.element) {
              can.trigger(self.element, 'updateCount', [count(),
                self.options.update_count]);
            }
            count.bind('change', self._ifNotRemoved(function () {
              can.trigger(self.element, 'updateCount', [count(),
                self.options.update_count]);
            }));
          });
      }
    },

    fetch_list: function () {
      if (this.find_all_deferred) {
        //  Skip, because already done, e.g., display() already called
        return this.find_all_deferred;
      }
      if (can.isEmptyObject(this.options.find_params.serialize())) {
        this.options.find_params.attr(
          'id', this.options.parent_instance ?
            this.options.parent_instance.id : undefined);
      }

      if (this.options.mapping) {
        if (this.options.parent_instance === undefined) {
          // TODO investigate why is this method sometimes called twice
          return undefined; // not ready, will try again
        }
        this.find_all_deferred =
          this.options.parent_instance.get_list_loader(this.options.mapping);
      } else if (this.options.list_loader) {
        this.find_all_deferred =
          this.options.list_loader(this.options.parent_instance);
      } else {
        console.debug('Unexpected code path', this);
      }

      return this.find_all_deferred;
    },

    /*
     * Removes items from the list by ids
     * @param  {can.List}      list             list of items
     * @param  {Array{Number}} removedItemsIds  array of item ids
     */
    removeFromList: function (list, removedItemsIds) {
      // Since list items have slightly different format,
      // we are lookig for instance property in possible places
      let itemsToKeep = list.filter((item) => {
        let inst = item && item.options && item.options.attr('instance') ||
          item.attr('instance');

        return !_.includes(removedItemsIds, inst.attr('id'));
      });
      list.replace(itemsToKeep);
    },

    prepare_child_options: function (v, forceReload) {
      //  v may be any of:
      //    <model_instance>
      //    { instance: <model instance>, mappings: [...] }
      //    <TreeOptions>
      let tmp;
      let that = this;
      let original = v;
      if (v._child_options_prepared && !forceReload) {
        return v._child_options_prepared;
      }
      if (!(v instanceof TreeViewOptions)) {
        tmp = v;
        v = new TreeViewOptions();
        v.attr('instance', tmp);
        this.options.each(function (val, k) {
          if (can.inArray(k, that.constructor.do_not_propagate) === -1) {
            v.attr(k, val);
          }
        });
      }
      if (!(v.instance instanceof can.Model)) {
        if (v.instance.instance instanceof can.Model) {
          v.attr('result', v.instance);
          v.attr('mappings', v.instance.mappings_compute());
          v.attr('instance', v.instance.instance);
        } else {
          v.attr('instance', this.options.model.model(v.instance));
        }
      }
      v.attr('child_count', can.compute(function () {
        let totalChildren = 0;
        if (v.attr('child_options')) {
          can.each(v.attr('child_options'), function (childCptions) {
            let list = childCptions.attr('list');
            if (list) {
              totalChildren += list.attr('length');
            }
          });
        }
        return totalChildren;
      }));
      original._child_options_prepared = v;
      return v;
    },

    '{original_list} remove': function (list, ev, removedItems, index) {
      let removedItemsIds = removedItems.map((remItem) => {
        return remItem.attr('id');
      });

      this.removeFromList(this.options.list, removedItemsIds);
      this.removeFromList(this.options.filteredList, removedItemsIds);

      // NB: since row element are not rendered with mustache and binded element
      // not always reflected in the filteredList ( for newly created items )
      // we are just removeing the items from the lists and removing the DOM
      // elements by ids
      removedItemsIds.forEach((id) => {
        this.element
          .find(`.cms_controllers_tree_view_node[data-object-id="${id}"]`)
          .remove();
      });
    },

    '{original_list} add': function (list, ev, newVals, index) {
      let that = this;
      let realAdd = [];

      can.each(newVals, function (newVal) {
        let _newVal = newVal.instance ? newVal.instance : newVal;
        if (that.oldList && ~can.inArray(_newVal, that.oldList)) {
          that.oldList.splice(can.inArray(_newVal, that.oldList), 1);
        } else if (that.element) {
          realAdd.push(newVal);
        }
      });
      this.enqueue_items(realAdd);
    },

    '.tree-structure subtree_loaded': function (el, ev) {
      let instanceId;
      let parent;
      ev.stopPropagation();
      instanceId = el.closest('.tree-item').data('object-id');
      parent = can.reduce(this.options.list, function (a, b) {
        switch (true) {
          case !!a : return a;
          case b.instance.id === instanceId: return b;
          default: return null;
        }
      }, null);
      if (parent && !parent.children_drawn) {
        parent.attr('children_drawn', true);
      }
    },
    // add child options to every item (TreeViewOptions instance) in the drawing list at this level of the tree.
    add_child_lists: function (list) {
      let that = this;
      let currentList = can.makeArray(list);
      let listWindow = [];
      let finalDfd;
      let queue = [];
      let BATCH = 200;
      let opId = this._add_child_lists_id = (this._add_child_lists_id || 0) + 1;

      can.each(currentList, function (item) {
        listWindow.push(item);
        if (listWindow.length >= BATCH) {
          queue.push(listWindow);
          listWindow = [];
        }
      });
      if (listWindow.length > 0) {
        queue.push(listWindow);
      }
      this.options.attr('filter_shown', 0);
      this.options.attr('filteredList', []);
      finalDfd = _.reduce(queue, function (dfd, listWindow) {
        return dfd.then(function () {
          let res = can.Deferred();
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
      }, can.Deferred().resolve());

      finalDfd.done(this._ifNotRemoved(function () {
        let shown = this.element[0].children.length;
        let count = this.options.list.length;
        // We need to hide `of` in case the numbers are same
        if (shown === count && shown > 0) {
          shown = false;
        } else {
          shown = shown.toString();
        }
        this.options.attr('filter_shown', shown);
        this.options.attr('filter_count', count.toString());
      }.bind(this)));
      return finalDfd;
    },
    draw_items: function (optionsList) {
      let items;
      let $footer = this.element.children('.tree-item-add').first();
      let drawItemsDfds = [];
      let filteredItems = this.options.attr('filteredList') || [];
      let res;

      items = can.makeArray(optionsList);

      items = _.map(items, function (options) {
        let control;
        let elem = document.createElement('li');
        control = new CMS.Controllers.TreeViewNode(elem, options);
        drawItemsDfds.push(control._draw_node_deferred);
        filteredItems.push(control);
        return control.element[0];
      }.bind(this));

      if ($footer.length) {
        $(items).insertBefore($footer);
      } else {
        this.element.append(items);
      }
      if (this.options.sortable) {
        $(this.element).sortable({element: 'li.tree-item', handle: '.drag'});
      }
      this.options.attr('filteredList', filteredItems);
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

    '.edit-object modal:success': function (el, ev, data) {
      let model = el.closest('[data-model]').data('model');
      model.attr(data[model.constructor.root_object] || data);
      ev.stopPropagation();
    },

    reload_list: function (forceReload) {
      if (this.options.list === undefined || this.options.list === null) {
        return;
      }
      this._draw_list_deferred = false;
      this.find_all_deferred = false;
      this.options.list.replace([]);
      this.draw_list(this.options.original_list, forceReload);
      this.init_count();
    },

    clearList: function () {
      this.element.children('.tree-item').remove();
    },
  });
})(window.can, window.$);
