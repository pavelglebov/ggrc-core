/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  isSnapshot,
} from '../../plugins/utils/snapshot-utils';
import {
  related,
  isObjectContextPage,
  getPageType,
} from '../../plugins/utils/current-page-utils';
import TreeViewOptions from './tree-view-options';

(function (can, $) {
  function _firstElementChild(el) {
    let i;
    if (el.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      for (i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType !== Node.TEXT_NODE) {
          return el.childNodes[i];
        }
      }
    } else {
      return el;
    }
  }

  can.Control.extend('CMS.Controllers.TreeViewNode', {
    defaults: {
      model: null,
      parent: null,
      instance: null,
      options_property: 'tree_view_options',
      show_view: null,
      expanded: false,
      subTreeLoading: false,
      draw_children: true,
      child_options: [],
    },
  }, {
    setup: function (el, opts) {
      let that = this;
      if (typeof this._super === 'function') {
        this._super(el);
      }
      if (opts instanceof can.Map) {
        this.options = opts;
        can.each(this.constructor.defaults, function (v, k) {
          if (!that.options.hasOwnProperty(k)) {
            that.options.attr(k, v);
          }
        });
      } else {
        this.options = new TreeViewOptions(this.constructor.defaults)
          .attr(opts.model ? opts.model[opts.options_property ||
            this.constructor.defaults.options_property] : {})
          .attr(opts);
      }
    },

    init: function () {
      this._draw_node_deferred = can.Deferred();

      if (this.options.child_options) {
        this.options.child_options.each(function (option) {
          option.attr({
            parent: this,
            parent_instance: this.options.instance,
          });
        }.bind(this));
      }

      // this timeout is required because the invoker will access the control via
      // the element synchronously so we must not replace the element just yet
      setTimeout(function () {
        this.draw_node();
      }.bind(this), 0);
    },

    '{instance} custom_attribute_values':
      function (object, ev, newVal, oldVal) {
        function getValues(cav) {
          return _.map(cav.reify(), 'attribute_value');
        }
        if ((!oldVal || !newVal) || (oldVal.length === newVal.length &&
          _.difference(getValues(oldVal), getValues(newVal)).length)) {
          this.draw_node();
        }
      },
    ' updateCount'(el, ev, count, updateCount) {
      // prevents updating counts for widget after openning tree-view-node
      ev.stopPropagation();
    },

    markNotRelatedItem: function () {
      let instance = this.options.instance;
      let relatedInstances = related.attr(instance.type);
      let instanceId = isSnapshot(instance) ?
        instance.snapshot.child_id :
        instance.id;
      if (!relatedInstances || relatedInstances &&
        !relatedInstances[instanceId]) {
        this.element.addClass('not-directly-related');
      } else {
        this.element.addClass('directly-related');
      }
    },

    /**
     * Trigger rendering the tree node in the DOM.
     * @param {Boolean} force - indicates redraw is/is not mandatory
     */
    draw_node: function () {
      if (!this.element) {
        return;
      }

      if (this._draw_node_in_progress) {
        return;
      }

      this._draw_node_in_progress = true;

      // the node's isActive state is not stored anywhere, thus we need to
      // determine it from the presemce of the corresponding CSS class
      let isActive = this.element.hasClass('active');

      can.view(
        this.options.show_view,
        this.options,
        this._ifNotRemoved(function (frag) {
          this.replace_element(frag);

          if (isActive) {
            this.element.addClass('active');
          }

          this._draw_node_deferred.resolve();
        }.bind(this))
      );

      this._draw_node_in_progress = false;
    },

    should_draw_children: function () {
      let drawChildren = this.options.draw_children;
      if (can.isFunction(drawChildren)) {
        return drawChildren.apply(this.options);
      }
      return drawChildren;
    },

    // add all child options to one TreeViewOptions object
    add_child_lists_to_child: function () {
      let originalChildList = this.options.child_options;
      let newChildList = [];

      if (this.options.attr('_added_child_list')) {
        return;
      }
      this.options.attr('child_options', new can.Observe.List());

      if (originalChildList.length === null) {
        originalChildList = [originalChildList];
      }

      if (this.should_draw_children()) {
        can.each(originalChildList, function (data, i) {
          let options = new can.Map();
          data.each(function (v, k) {
            options.attr(k, v);
          });
          this.add_child_list(this.options, options);
          options.attr({
            options_property: this.options.options_property,
            single_object: false,
            parent: this,
            parent_instance: this.options.instance,
          });
          newChildList.push(options);
        }.bind(this));

        this.options.attr('child_options', newChildList);
        this.options.attr('_added_child_list', true);
      }
    },

    // data is an entry from child options.  if child options is an array, run once for each.
    add_child_list: function (item, data) {
      let findParams;
      data.attr({start_expanded: false});
      if (can.isFunction(item.instance[data.property])) {
        // Special case for handling mappings which are functions until
        // first requested, then set their name via .attr('...')
        findParams = function () {
          return item.instance[data.property]();
        };
        data.attr('find_params', findParams);
      } else if (data.property) {
        findParams = item.instance[data.property];
        if (findParams && findParams.isComputed) {
          data.attr('original_list', findParams);
          findParams = findParams();
        } else if (findParams && findParams.length) {
          data.attr('original_list', findParams);
          findParams = findParams.slice(0);
        }
        data.attr('list', findParams);
      } else {
        findParams = data.attr('find_params');
        if (findParams) {
          findParams = findParams.serialize();
        } else {
          findParams = {};
        }
        if (data.parent_find_param) {
          findParams[data.parent_find_param] = item.instance.id;
        } else {
          findParams['parent.id'] = item.instance.id;
        }
        data.attr('find_params', new can.Map(findParams));
      }
      // $subtree.cms_controllers_tree_view(opts);
    },

    replace_element: function (el) {
      let oldEl = this.element;
      let oldData;
      let firstchild;

      if (!this.element) {
        return;
      }

      oldData = $.extend({}, oldEl.data());

      firstchild = $(_firstElementChild(el));

      oldData.controls = oldData.controls.slice(0);
      oldEl.data('controls', []);
      this.off();
      oldEl.replaceWith(el);
      this.element = firstchild.addClass(this.constructor._fullName)
        .data(oldData);

      if (this.options.is_subtree &&
        isObjectContextPage() &&
        getPageType() !== 'Workflow') {
        this.markNotRelatedItem();
      }
      this.on();
    },

    display: function () {
      return this.trigger_expand();
    },

    display_subtrees: function () {
      let childTreeDfds = [];
      let that = this;

      this.element.find('.' + CMS.Controllers.TreeView._fullName)
        .each(function (_, el) {
          let $el = $(el);
          let childTreeControl;

          //  Ensure this targets only direct child trees, not sub-tree trees
          if ($el.closest('.' + that.constructor._fullName).is(that.element)) {
            childTreeControl = $el.control();
            if (childTreeControl) {
              that.options.attr('subTreeLoading', true);
              childTreeDfds.push(childTreeControl.display()
                .then(function () {
                  that.options.attr('subTreeLoading', false);
                }));
            }
          }
        });

      return $.when(...childTreeDfds);
    },

    /**
     * Expand the tree node to make its subnodes visible.
     *
     * @return {can.Deferred} - a deferred object resolved when all the child
     *   nodes have been loaded and displayed
     */
    expand: function () {
      let $el = this.element;

      this.add_child_lists_to_child();
      if (this._expand_deferred && $el.find('.openclose').is('.active')) {
        // If we have already expanded and are currently still expanded, then
        // short-circuit the call. However, we still need to toggle `expanded`,
        // but if it's the first time expanding, `this.add_child_lists_to_child`
        // *must* be called first.
        this.options.attr('expanded', true);
        return this._expand_deferred;
      }

      this.options.attr('expanded', true);

      this._expand_deferred = can.Deferred();
      setTimeout(this._ifNotRemoved(function () {
        this.display_subtrees()
          .then(this._ifNotRemoved(function () {
            this.element.trigger('subtree_loaded');
            this.element.trigger('loaded');
            if (this._expand_deferred) {
              this._expand_deferred.resolve();
            }
          }.bind(this)));
      }.bind(this)), 0);
      return this._expand_deferred;
    },

    '.openclose:not(.active) click': function (el, ev) {
      // Ignore unless it's a direct child
      if (el.closest('.' + this.constructor._fullName).is(this.element)) {
        this.expand();
      }
    },

    'input,select click': function (el, ev) {
      // Don't toggle accordion when clicking on input/select fields
      ev.stopPropagation();
    },

    trigger_expand: function () {
      let $expandEl = this.element.find('.openclose').first();
      if (!$expandEl.hasClass('active')) {
        $expandEl.trigger('click');
      }
      return this.expand();
    },
  });
})(window.can, window.$);
