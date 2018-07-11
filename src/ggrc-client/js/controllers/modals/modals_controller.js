/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../components/issue-tracker/modal-issue-tracker-fields';
import '../../components/issue-tracker/issue-tracker-switcher';
import '../../components/access_control_list/access-control-list-roles-helper';
import '../../components/assessment/assessment-people';
import '../../components/assessment/assessment-object-type-dropdown';
import '../../components/assessment_templates/assessment-template-attributes';
import '../../components/assessment_templates/template-field';
import '../../components/assessment_templates/add-template-field';
import '../../components/textarea-array/textarea-array';
import '../../components/object-list-item/object-list-item-updater';
import '../../components/related-objects/related-documents';
import '../../components/related-objects/related-urls';
import '../../components/spinner/spinner';
import '../../components/object-list/object-list';
import '../../components/object-list-item/document-object-list-item';
import '../../components/action-toolbar-control/action-toolbar-control';
import '../../components/effective-dates/effective-dates';
import '../../components/dropdown/dropdown';
import '../../components/modal_wrappers/assessment_template_form';
import '../../components/autocomplete/autocomplete';
import '../../components/external-data-autocomplete/external-data-autocomplete';
import '../../components/person/person-data';
import '../../components/rich_text/rich_text';
import '../../components/modal_wrappers/checkboxes_to_list';
import '../../components/modal-connector';
import '../../components/modal_wrappers/assessment-modal';
import '../../components/assessment/map-button-using-assessment-type';
import '../../components/gca-controls/gca-controls';
import '../../components/datepicker/datepicker';
import '../../components/external-data-autocomplete/inline-autocomplete-wrapper';
import '../../components/multi-select-label/multi-select-label';
import '../../components/proposal/create-proposal';
import '../../components/input-filter/input-filter';
import {BUTTON_VIEW_DONE} from '../../plugins/utils/modals';
import {
  checkPreconditions,
  becameDeprecated,
} from '../../plugins/utils/controllers';
import {REFRESH_MAPPING} from '../../events/eventTypes';


export default can.Control({
  pluginName: 'ggrc_controllers_modals',
  defaults: {
    preload_view: GGRC.mustache_path + '/dashboard/modal_preload.mustache',
    header_view: GGRC.mustache_path + '/modals/modal_header.mustache',
    custom_attributes_view:
    GGRC.mustache_path + '/custom_attributes/modal_content.mustache',
    button_view: null,
    model: null, // model class to use when finding or creating new
    instance: null, // model instance to use instead of finding/creating (e.g. for update)
    new_object_form: false,
    mapping: false,
    find_params: {},
    add_more: false,
    ui_array: [],
    reset_visible: false,
    extraCssClass: '',
    afterFetch: function () {},
    isProposal: false,
    isSaving: false, // is there a save/map operation currently in progress
  },

  init: function () {
    this.defaults.button_view = BUTTON_VIEW_DONE;
  },
}, {
  init: function () {
    let currentUser;
    let userFetch;

    if (!(this.options instanceof can.Observe)) {
      this.options = new can.Observe(this.options);
    }

    if (!this.element.find('.modal-body').length) {
      can.view(this.options.preload_view, {}, this.proxy('after_preload'));
      return;
    }

    // Make sure that the current user object, if it exists, is fully
    // loaded before rendering the form, otherwise initial validation can
    // incorrectly fail for form fields whose values rely on current user's
    // attributes.
    currentUser = CMS.Models.Person.store[GGRC.current_user.id];

    if (currentUser) {
      currentUser = currentUser.reify();
    }

    if (!currentUser) {
      userFetch = CMS.Models.Person.findOne({id: GGRC.current_user.id});
    } else if (currentUser && !currentUser.email) {
      // If email - a required attribute - is missing, the user object is
      // not fully loaded and we need to force-fetch it first - yes, it can
      // actually happen that reify() returns a partially loaded object.
      userFetch = currentUser.refresh();
    } else {
      // nothing to wait for
      userFetch = new can.Deferred().resolve(currentUser);
    }

    userFetch.then(function () {
      if (this.element) {
        this.after_preload();
      }
    }.bind(this));
  },
  after_preload: function (content) {
    let that = this;
    if (content) {
      this.element.html(content);
    }
    CMS.Models.DisplayPrefs.getSingleton().then(function (displayPrefs) {
      this.display_prefs = displayPrefs;

      this.options.attr('$header', this.element.find('.modal-header'));
      this.options.attr('$content', this.element.find('.modal-body'));
      this.options.attr('$footer', this.element.find('.modal-footer'));
      this.on();
      this.fetch_all()
        .then(this.proxy('apply_object_params'))
        .then(this.proxy('serialize_form'))
        .then(function () {
          // If the modal is closed early, the element no longer exists
          if (that.element) {
            that.element.trigger('preload');
          }
        })
        .then(this.proxy('autocomplete'))
        .then(function () {
          this.options.afterFetch(this.element);
          this.restore_ui_status_from_storage();
        }.bind(this));
    }.bind(this));
  },

  apply_object_params: function () {
    if (!this.options.object_params) {
      return;
    }
    this.options.object_params.each(function (value, key) {
      this.set_value({name: key, value: value});
    }, this);
  },

  'input[data-lookup] focus': function (el, ev) {
    this.autocomplete(el);
  },

  'input[data-lookup] keyup': function (el, ev) {
    // Set the transient field for validation
    let name;
    let instance;
    let value;

    // * in some cases we want to disable automapping the selected item to the
    // * modal's underlying object (e.g. we don't want to map the picked Persons
    // * to an AssessmentTemplates object)
    // ** does nothing after press tab to not lose deafault value in input
    if (el.data('no-automap') || ev.keyCode === 9) {
      return;
    }

    name = el.attr('name').split('.');
    instance = this.options.instance;
    value = el.val();

    name.pop(); // set the owner to null, not the email

    if (!instance._transient) {
      instance.attr('_transient', new can.Observe({}));
    }

    can.reduce(name.slice(0, -1), function (current, next) {
      current = current + '.' + next;
      if (!instance.attr(current)) {
        instance.attr(current, new can.Observe({}));
      }
      return current;
    }, '_transient');

    if (name.length) {
      instance.attr(['_transient'].concat(name).join('.'), value);
    }
  },

  autocomplete: function (el) {
    $.cms_autocomplete.call(this, el);
  },

  autocomplete_select: function (el, event, ui) {
    let path;
    let instance;
    let index;
    let cb;
    $('#extended-info').trigger('mouseleave'); // Make sure the extra info tooltip closes

    path = el.attr('name').split('.');
    instance = this.options.instance;
    index = 0;
    path.pop(); // remove the prop
    cb = el.data('lookup-cb');

    if (cb) {
      cb = cb.split(' ');
      instance[cb[0]](...cb.slice(1).concat([ui.item]));
      setTimeout(function () {
        el.val(ui.item.name || ui.item.email || ui.item.title, ui.item);
      }, 0);
      return;
    }

    if (/^\d+$/.test(path[path.length - 1])) {
      index = parseInt(path.pop(), 10);
      path = path.join('.');
      if (!instance.attr(path)) {
        instance.attr(path, []);
      }
      instance.attr(path).splice(index, 1, ui.item.stub());
    } else {
      path = path.join('.');
      setTimeout(function () {
        el.val(ui.item.name || ui.item.email || ui.item.title, ui.item);
      }, 0);

      instance.attr(path, null).attr(path, ui.item);
      if (!instance._transient) {
        instance.attr('_transient', can.Map());
      }
      instance.attr('_transient.' + path, ui.item);
    }
  },

  immediate_find_or_create: function (el, ev, data) {
    let that = this;
    let prop = el.data('drop');
    let model = CMS.Models[el.data('lookup')];
    let context = that.options.instance.context;
    let params = {
      context: context && context.serialize ? context.serialize() : context,
    };

    setTimeout(function () {
      params[prop] = el.val();
      el.prop('disabled', true);
      model.findAll(params).then(function (list) {
        if (list.length) {
          that.autocomplete_select(el, ev, {item: list[0]});
        } else {
          new model(params).save().then(function (item) {
            that.autocomplete_select(el, ev, {item: item});
          });
        }
      })
        .always(function () {
          el.prop('disabled', false);
        });
    }, 100);
  },
  'input[data-lookup][data-drop] paste': 'immediate_find_or_create',
  'input[data-lookup][data-drop] drop': 'immediate_find_or_create',
  fetch_templates: function (dfd) {
    let that = this;
    dfd = dfd ? dfd.then(function () {
      return that.options;
    }) : $.when(this.options);
    return $.when(
      can.view(this.options.content_view, dfd),
      can.view(this.options.header_view, dfd),
      can.view(this.options.button_view, dfd),
      can.view(this.options.custom_attributes_view, dfd)
    ).done(this.proxy('draw'));
  },

  fetch_data: function (params) {
    let that = this;
    let dfd;
    let instance = this.options.attr('instance');

    params = params || this.find_params();
    params = params && params.serialize ? params.serialize() : params;

    if (this.options.skip_refresh && instance) {
      return new $.Deferred().resolve(instance);
    } else if (instance) {
      dfd = instance.refresh();
    } else if (this.options.model) {
      if (this.options.new_object_form) {
        if (this.options.extendNewInstance) {
          let extendedInstance = this.options.extendNewInstance.attr ?
            this.options.extendNewInstance.attr() :
            this.options.extendNewInstance;
          Object.assign(params, extendedInstance);
        }

        dfd = $.when(this.options.attr(
          'instance',
          new this.options.model(params).attr('_suppress_errors', true)
        )).then(function () {
          instance = this.options.attr('instance');
        }.bind(this));
      } else {
        dfd = this.options.model.findAll(params).then(function (data) {
          if (data.length) {
            that.options.attr('instance', data[0]);
            return data[0].refresh(); // have to refresh (get ETag) to be editable.
          }
          that.options.attr('new_object_form', true);
          that.options.attr('instance', new that.options.model(params));
          return instance;
        }).done(function () {
          // Check if modal was closed
          if (that.element !== null) {
            that.on(); // listen to instance.
          }
        });
      }
    } else {
      this.options.attr('instance', new can.Observe(params));
      that.on();
      dfd = new $.Deferred().resolve(instance);
    }

    dfd.then(function () {
      if (instance &&
        _.exists(instance, 'class.is_custom_attributable') &&
        !(instance instanceof CMS.Models.Assessment)) {
        return $.when(
          instance.load_custom_attribute_definitions &&
          instance.load_custom_attribute_definitions(),
          instance.custom_attribute_values ?
            instance.refresh_all('custom_attribute_values') :
            []
        );
      }
    });

    return dfd.done(function () {
      this.reset_form();
    }.bind(that));
  },

  reset_form: function (setFieldsCb) {
    let preloadDfd;

    // If the modal is closed early, the element no longer exists
    if (this.element) {
      // Do the fields (re-)setting
      if (_.isFunction(setFieldsCb)) {
        setFieldsCb();
      }
      // This is to trigger `focus_first_element` in modal_ajax handling
      this.element.trigger('loaded');
    }
    if (!this.options.instance._transient) {
      this.options.instance.attr('_transient', new can.Observe({}));
    }
    if (this.options.instance.form_preload) {
      preloadDfd = this.options.instance.form_preload(
        this.options.new_object_form,
        this.options.object_params);
      if (preloadDfd) {
        preloadDfd.then(function () {
          this.options.instance.backup();
        }.bind(this));
      }
    }
  },

  fetch_all: function () {
    return this.fetch_templates(this.fetch_data(this.find_params()));
  },

  find_params: function () {
    let findParams = this.options.find_params;
    return findParams.serialize ? findParams.serialize() : findParams;
  },

  draw: function (content, header, footer, customAttributes) {
    let modalTitle = this.options.modal_title;
    let isProposal = this.options.isProposal;
    let isObjectModal = modalTitle && (modalTitle.indexOf('Edit') === 0 ||
      modalTitle.indexOf('New') === 0);
    let $form;
    let tabList;
    let hidableTabs;
    let storableUI;
    let i;
    // Don't draw if this has been destroyed previously
    if (!this.element) {
      return;
    }
    if (can.isArray(content)) {
      content = content[0];
    }
    if (can.isArray(header)) {
      header = header[0];
    }
    if (can.isArray(footer)) {
      footer = footer[0];
    }
    if (can.isArray(customAttributes)) {
      customAttributes = customAttributes[0];
    }
    if (header !== null) {
      this.options.$header.find('h2').html(header);
    }
    if (content !== null) {
      this.options.$content.html(content).removeAttr('style');
    }
    if (footer !== null) {
      this.options.$footer.html(footer);
    }

    if (customAttributes !== null && (isObjectModal || isProposal)) {
      this.options.$content.append(customAttributes);
    }

    // Update UI status array
    $form = $(this.element).find('form');
    tabList = $form.find('[tabindex]');
    hidableTabs = 0;
    for (i = 0; i < tabList.length; i++) {
      if ($(tabList[i]).attr('tabindex') > 0) {
        hidableTabs++;
      }
    }
    // ui_array index is used as the tab_order, Add extra space for skipped numbers
    storableUI = hidableTabs + 20;
    for (i = 0; i < storableUI; i++) {
      // When we start, all the ui elements are visible
      this.options.ui_array.push(0);
    }
  },

  [`input:not(isolate-form input), textarea:not(isolate-form textarea),
    select:not(isolate-form select) change`]:
    function (el, ev) {
      this.options.instance.removeAttr('_suppress_errors');
      // Set the value if it isn't a search field
      if (!el.hasClass('search-icon') ||
        el.is('[null-if-empty]') &&
        (!el.val() || !el.val().length)
      ) {
        this.set_value_from_element(el);
      }
    },

  'input:not([data-lookup], isolate-form *), textarea keyup':
    function (el, ev) {
      // TODO: If statement doesn't work properly. This is the right one:
      //       if (el.attr('value').length ||
      //          (typeof el.attr('value') !== 'undefined' && el.val().length)) {
      if (el.prop('value').length === 0 ||
        (typeof el.attr('value') !== 'undefined' &&
        !el.attr('value').length)) {
        this.set_value_from_element(el);
      }
    },

  /**
   * The onChange handler for the custom attribute type dropdown.
   *
   * This handler is specific to the Custom Attribute Edit modal.
   *
   * @param {jQuery} $el - the dropdown DOM element
   * @param {$.Event} ev - the event object
   */
  'dropdown[data-purpose="ca-type"] change': function ($el, ev) {
    let instance = this.options.instance;

    if (instance.attribute_type !== 'Dropdown') {
      instance.attr('multi_choice_options', undefined);
    }
  },

  serialize_form: function () {
    let $form = this.options.$content.find('form');
    let $elements = $form
      .find(':input:not(isolate-form *):not([data-no-serialization])');

    can.each($elements.toArray(), this.proxy('set_value_from_element'));
  },
  set_value_from_element: function (el) {
    let name;
    let value;
    let cb;
    let instance = this.options.instance;
    el = el instanceof jQuery ? el : $(el);
    name = el.attr('name');
    value = el.val();
    cb = el.data('lookup-cb');

    // If no model is specified, short circuit setting values
    // Used to support ad-hoc form elements in confirmation dialogs
    if (!this.options.model) {
      return;
    }
    // if data was populated in a callback, use that data from the instance
    // except if we are editing an instance and some fields are already populated
    if (!_.isUndefined(el.attr('data-populated-in-callback')) &&
      value === '') {
      if (!_.isUndefined(instance[name])) {
        if (typeof instance[name] === 'object' && instance[name] !== null) {
          this.set_value({name: name, value: instance[name].id});
        } else {
          this.set_value({name: name, value: instance[name]});
        }
        return;
      }
    }
    if (cb) {
      cb = cb.split(' ');
      instance[cb[0]](...cb.slice(1).concat([value]));
    } else if (name) {
      this.set_value({name: name, value: value});
    }
  },
  set_value: function (item) {
    let instance = this.options.instance;
    let name = item.name.split('.');
    let $elem;
    let value;
    let model;
    let $other;

    if (!(instance instanceof this.options.model)) {
      instance = this.options.instance =
        new this.options.model(instance && instance.serialize ?
          instance.serialize() : instance);
    }
    $elem = this.options.$content
      .find("[name='" + item.name + "']:not(isolate-form *)");
    model = $elem.attr('model');

    if (model) {
      if (item.value instanceof Array) {
        value = can.map(item.value, function (id) {
          return CMS.Models.get_instance(model, id);
        });
      } else if (item.value instanceof Object) {
        value = CMS.Models.get_instance(model, item.value.id);
      } else {
        value = CMS.Models.get_instance(model, item.value);
      }
    } else if ($elem.is('[type=checkbox]')) {
      value = $elem.is(':checked');
    } else {
      value = item.value;
    }

    if ($elem.is('[null-if-empty]') && (!value || !value.length)) {
      value = null;
    }

    if (name.length > 1) {
      if (can.isArray(value)) {
        value = new can.Observe.List(can.map(value, function (v) {
          return new can.Observe({}).attr(name.slice(1).join('.'), v);
        }));
      } else if ($elem.is('[data-lookup]')) {
        if (!value) {
          value = null;
        } else {
          // Setting a "lookup field is handled in the autocomplete() method"
          return;
        }
      } else if (name[name.length - 1] === 'date') {
        name.pop(); // date is a pseudoproperty of datetime objects
        if (!value) {
          value = null;
        } else {
          value = this.options.model.convert.date(value);
          $other = this.options.$content
            .find("[name='" + name.join('.') + ".time']:not(isolate-form *)");
          if ($other.length) {
            value = moment(value).add(parseInt($other.val(), 10)).toDate();
          }
        }
      } else if (name[name.length - 1] === 'time') {
        name.pop(); // time is a pseudoproperty of datetime objects
        value = moment(this.options.instance.attr(name.join('.')))
          .startOf('day').add(parseInt(value, 10)).toDate();
      } else {
        value = new can.Observe({}).attr(name.slice(1).join('.'), value);
      }
    }

    value = value && value.serialize ? value.serialize() : value;
    if (name[0] === 'custom_attributes') {
      const caId = Number(name[1]);
      const caValue = value[name[1]];
      instance.customAttr(caId, caValue);
    } else if (name[0] !== 'people') {
      instance.attr(name[0], value);
    }
  },
  '[data-before], [data-after] change': function (el, ev) {
    let date;
    let data;
    let options;
    if (!el.data('datepicker')) {
      el.datepicker({changeMonth: true, changeYear: true});
    }
    date = el.datepicker('getDate');
    data = el.data();
    options = {
      before: 'maxDate',
      after: 'minDate',
    };

    _.each(options, function (val, key) {
      let targetEl;
      let isInput;
      let targetDate;
      let otherKey;
      if (!data[key]) {
        return;
      }
      targetEl = this.element.find('[name=' + data[key] + ']');
      isInput = targetEl.is('input');
      targetDate = isInput ? targetEl.val() : targetEl.text();

      el.datepicker('option', val, targetDate);
      if (targetEl) {
        otherKey = key === 'before' ? 'after' : 'before';
        targetEl.datepicker('option', options[otherKey], date);
      }
    }, this);
  },

  "{$footer} a.btn[data-toggle='modal-submit-addmore'] click":
    function (el, ev) {
      if (el.hasClass('disabled')) {
        return;
      }
      this.options.attr('add_more', true);
      this.save_ui_status();
      this.triggerSave(el, ev);
    },

  "{$footer} a.btn[data-toggle='modal-submit'] click": function (el, ev) {
    let options = this.options;
    let instance = options.attr('instance');
    let oldData = options.attr('oldData');
    let applyPreconditions = options.attr('applyPreconditions');
    let saveInstance = function () {
      options.attr('add_more', false);
      this.triggerSave(el, ev);
    }.bind(this);

    if (el.hasClass('disabled')) {
      return;
    }

    if (applyPreconditions) {
      checkPreconditions({
        instance: instance,
        operation: 'deprecation',
        // functions that will be called as an extra conditions (return true
        // or false). If all conditions are passed then are showed a
        // message else - called success handler.
        extraConditions: [
          becameDeprecated.bind(
            null,
            instance,
            oldData.status,
          ),
        ],
      }, saveInstance);
    } else {
      saveInstance();
    }
  },

  '{$content} a.field-hide click': function (el, ev) { // field hide
    let $el = $(el);
    let totalInner = $el.closest('.hide-wrap.hidable')
      .find('.inner-hide').length;
    let totalHidden;
    let uiUnit;
    let i;
    let tabValue;
    let $hidable = [
      'span',
      'ggrc-form-item',
    ].map((className) => $el.closest(`[class*="${className}"].hidable`))
      .find((item) => item.length > 0);

    $el.closest('.inner-hide').addClass('inner-hidable');
    totalHidden = $el.closest('.hide-wrap.hidable')
      .find('.inner-hidable').length;

    $hidable.addClass('hidden');
    this.options.attr('reset_visible', true);
    // update ui array
    uiUnit = $hidable.find('[tabindex]');
    for (i = 0; i < uiUnit.length; i++) {
      tabValue = $(uiUnit[i]).attr('tabindex');
      if (tabValue > 0) {
        this.options.ui_array[tabValue - 1] = 1;
        $(uiUnit[i]).attr('tabindex', '-1');
        $(uiUnit[i]).attr('uiindex', tabValue);
      }
    }

    if (totalInner === totalHidden) {
      $el.closest('.inner-hide').parent('.hidable').addClass('hidden');
    }

    return false;
  },

  '{$content} #formHide click': function () {
    let i;
    let uiArrLength = this.options.ui_array.length;
    let $hidables = this.element.find('.hidable');
    let hiddenElements = $hidables.find('[tabindex]');
    let $hiddenElement;
    let tabValue;
    for (i = 0; i < uiArrLength; i++) {
      this.options.ui_array[i] = 0;
    }

    this.options.attr('reset_visible', true);

    $hidables.addClass('hidden');
    this.element.find('.inner-hide').addClass('inner-hidable');

    // Set up the hidden elements index to 1
    for (i = 0; i < hiddenElements.length; i++) {
      $hiddenElement = $(hiddenElements[i]);
      tabValue = $hiddenElement.attr('tabindex');
      // The UI array index start from 0, and tab-index/io-index is from 1
      if (tabValue > 0) {
        this.options.ui_array[tabValue - 1] = 1;
        $hiddenElement.attr({
          tabindex: '-1',
          uiindex: tabValue,
        });
      }
    }

    return false;
  },

  '{$content} #formRestore click': function () {
    // Update UI status array to initial state
    let i;
    let uiArrLength = this.options.ui_array.length;
    let $form = this.element.find('form');
    let $body = $form.closest('.modal-body');
    let uiElements = $body.find('[uiindex]');
    let $el;
    let tabVal;

    for (i = 0; i < uiArrLength; i++) {
      this.options.ui_array[i] = 0;
    }

    // Set up the correct tab index for tabbing
    // Get all the ui elements with 'uiindex' set to original tabindex
    // Restore the original tab index

    for (i = 0; i < uiElements.length; i++) {
      $el = $(uiElements[i]);
      tabVal = $el.attr('uiindex');
      $el.attr('tabindex', tabVal);
    }

    this.options.attr('reset_visible', false);
    this.element.find('.hidden').removeClass('hidden');
    this.element.find('.inner-hide').removeClass('inner-hidable');
    return false;
  },

  save_ui_status: function () {
    let modelName;
    let resetVisible;
    let uiArray;
    let displayState;
    if (!this.options.model) {
      return;
    }
    modelName = this.options.model.model_singular;
    resetVisible = this.options.reset_visible ?
      this.options.reset_visible : false;
    uiArray = this.options.ui_array ? this.options.ui_array : [];
    displayState = {
      reset_visible: resetVisible,
      ui_array: uiArray,
    };

    this.display_prefs.setModalState(modelName, displayState);
    this.display_prefs.save();
  },

  restore_ui_status_from_storage: function () {
    let modelName;
    let displayState;
    if (!this.options.model) {
      return;
    }
    modelName = this.options.model.model_singular;
    displayState = this.display_prefs.getModalState(modelName);

    // set up reset_visible and ui_array
    if (displayState !== null) {
      if (displayState.reset_visible) {
        this.options.attr('reset_visible', displayState.reset_visible);
      }
      if (displayState.ui_array) {
        this.options.ui_array = displayState.ui_array.slice();
      }
    }
    this.restore_ui_status();
  },

  restore_ui_status: function () {
    let $selected;
    let str;
    let tabindex;
    let i;
    let $form;
    let $body;

    // walk through the ui_array, for the one values,
    // select the element with tab index and hide it

    if (this.options.attr('reset_visible')) {// some elements are hidden
      $form = this.element.find('form');
      $body = $form.closest('.modal-body');

      for (i = 0; i < this.options.ui_array.length; i++) {
        if (this.options.ui_array[i] === 1) {
          tabindex = i + 1;
          str = '[tabindex=' + tabindex + ']';
          $selected = $body.find(str);

          if ($selected) {
            $selected.closest('.hidable').addClass('hidden');
            $selected.attr({
              uiindex: tabindex,
              tabindex: '-1',
            });
          }
        }
      }

      return false;
    }
  },

  // make buttons non-clickable when saving, make it disable afterwards
  bindXHRToButton_disable: function (xhr, el, newtext, disable) {
    // binding of an ajax to a click is something we do manually
    let $el = $(el);
    let oldtext = $el.text();

    if (newtext) {
      $el[0].innerHTML = newtext;
    }
    $el.addClass('disabled');
    if (disable !== false) {
      $el.attr('disabled', true);
    }
    xhr.fail(function () {
      if ($el.length) {
        $el.removeClass('disabled');
      }
    }).always(function () {
      // If .text(str) is used instead of innerHTML, the click event may not fire depending on timing
      if ($el.length) {
        $el.removeAttr('disabled')[0].innerHTML = oldtext;
      }
    });
  },

  // make element non-clickable when saving
  bindXHRToDisableElement(xhr, el) {
    // binding of an ajax to a click is something we do manually
    const $el = $(el);

    if (!$el.length) {
      return;
    }

    $el.addClass('disabled');
    xhr.always(() => {
      $el.removeClass('disabled');
    });
  },

  triggerSave(el, ev) {
    // disable ui while the form is being processed (loading)
    this.disableEnableContentUI(true);

    // Normal saving process
    if (el.is(':not(.disabled)')) {
      const ajd = this.save_instance(el, ev);

      if (!ajd) {
        return;
      }

      const saveCloseBtn = this.element.find('a.btn[data-toggle=modal-submit]');
      const modalBackdrop = this.element.data('modal_form').$backdrop;
      const modalCloseBtn = this.element.find('.modal-dismiss > .fa-times');
      const deleteBtn = this.element.find(
        'a.btn[data-toggle=modal-ajax-deleteform]'
      );
      const saveAddmoreBtn = this.element.find(
        'a.btn[data-toggle=modal-submit-addmore]'
      );

      this.options.attr('isSaving', true);

      ajd.always(() => {
        this.options.attr('isSaving', false);
      });

      if (this.options.add_more) {
        this.bindXHRToButton_disable(ajd, saveCloseBtn);
        this.bindXHRToButton_disable(ajd, saveAddmoreBtn);
      } else {
        this.bindXHRToButton(ajd, saveCloseBtn, 'Saving, please wait...');
        this.bindXHRToButton(ajd, saveAddmoreBtn);
      }

      this.bindXHRToDisableElement(ajd, deleteBtn);
      this.bindXHRToDisableElement(ajd, modalBackdrop);
      this.bindXHRToDisableElement(ajd, modalCloseBtn);
    }
  },

  new_instance: function (data) {
    let newInstance = this.prepareInstance();

    $.when(this.options.attr('instance', newInstance))
      .done(function () {
        this.reset_form(function () {
          let $form = $(this.element).find('form');
          $form.trigger('reset');
        }.bind(this));
      }.bind(this))
      .then(this.proxy('apply_object_params'))
      .then(this.proxy('serialize_form'))
      .then(this.proxy('autocomplete'));

    this.restore_ui_status();
  },

  prepareInstance: function () {
    let params = this.find_params();
    let instance = new this.options.model(params);
    let saveContactModels = ['TaskGroup', 'TaskGroupTask'];

    instance.attr('_suppress_errors', true)
      .attr('custom_attribute_definitions',
        this.options.instance.custom_attribute_definitions)
      .attr('custom_attributes', new can.Map());

    if (this.options.add_more &&
      _.includes(saveContactModels, this.options.model.shortName)) {
      instance.attr('contact', this.options.attr('instance.contact'));
    }

    return instance;
  },

  save_instance: function (el, ev) {
    let that = this;
    let instance = this.options.instance;
    let ajd;
    let instanceId = instance.id;
    let params;

    if (instance.errors()) {
      instance.removeAttr('_suppress_errors');
      return;
    }

    this.serialize_form();

    // Special case to handle context outside the form itself
    // - this avoids duplicated change events, and the API requires
    //   `context` to be present even if `null`, unlike other attributes
    if (!instance.context) {
      instance.attr('context', {id: null});
    }

    this.disable_hide = true;

    ajd = instance.save();
    ajd.fail(this.save_error.bind(this))
      .done(function (obj) {
        function finish() {
          // enable ui after clicking on save & other
          that.disableEnableContentUI(false);
          delete that.disable_hide;
          if (that.options.add_more) {
            if (that.options.$trigger && that.options.$trigger.length) {
              that.options.$trigger.trigger('modal:added', [obj]);
            }
            that.new_instance();
          } else {
            that.element.trigger('modal:success', [
              obj,
              {
                map_and_save: $('#map-and-save').is(':checked'),
              },
            ]).modal_form('hide');
            that.update_hash_fragment();
          }
        }

        // If this was an Objective created directly from a Requirement, create a join
        params = that.options.object_params;
        if (obj instanceof CMS.Models.Objective &&
          params && params.section) {
          new CMS.Models.Relationship({
            source: obj,
            destination: CMS.Models.Requirement
              .findInCacheById(params.section.id),
            context: {id: null},
          }).save()
            .fail(that.save_error.bind(that))
            .done(function () {
              $(document.body).trigger('ajax:flash',
                {success: 'Objective mapped successfully.'});
              finish();
            });
        } else {
          if (instanceId === undefined &&
            obj.is_declining_review &&
            obj.is_declining_review === '1') { // new element
            $(document.body).trigger('ajax:flash', {
              success: 'Review declined',
            });
          }
          finish();
        }
      });
    this.save_ui_status();
    return ajd;
  },

  save_error: function (_, error) {
    if (error) {
      if (error.status !== 409) {
        GGRC.Errors.notifier('error', error.responseText);
      } else {
        clearTimeout(error.warningId);
        GGRC.Errors.notifierXHR('warning')(error);
      }
    }
    // enable ui after a fail
    this.disableEnableContentUI(false);

    $('html, body').animate({
      scrollTop: '0px',
    }, {
      duration: 200,
      complete: function () {
        delete this.disable_hide;
      }.bind(this),
    });
  },

  '{instance} destroyed': ' hide',

  ' hide': function (el, ev) {
    let cad;
    const instance = this.options.instance;
    if (this.disable_hide) {
      ev.stopImmediatePropagation();
      ev.stopPropagation();
      ev.preventDefault();
      return false;
    }
    if (instance instanceof can.Model &&
      // Ensure that this modal was hidden and not a child modal
      this.element && ev.target === this.element[0] &&
      !this.options.skip_refresh && !instance.isNew()) {
      if (instance.type === 'AssessmentTemplate') {
        cad = instance.attr('custom_attribute_definitions');
        cad = _.filter(cad, function (attr) {
          return attr.id;
        });
        instance.attr('custom_attribute_definitions', cad);
      }
      instance.notifier.on_empty(() => {
        instance.refresh();
      });
      instance.dispatch(REFRESH_MAPPING);
    }
  },

  destroy: function () {
    if (this.options.model && this.options.model.cache) {
      delete this.options.model.cache[undefined];
    }
    if (this._super) {
      this._super(...arguments);
    }
    if (this.options.instance && this.options.instance._transient) {
      this.options.instance.removeAttr('_transient');
    }
  },

  should_update_hash_fragment: function () {
    let $trigger = this.options.$trigger;

    if (!$trigger) {
      return false;
    }
    return $trigger.data('updateHash') ||
      !$trigger.closest('.modal, .cms_controllers_info_pin').length;
  },

  update_hash_fragment: function () {
    let hash;
    if (!this.should_update_hash_fragment()) {
      return;
    }

    if (this.options.instance.getHashFragment) {
      hash = this.options.instance.getHashFragment();
      if (hash) {
        window.location.hash = hash;
        return;
      }
    }

    let locationHash = window.location.hash.split('/')[0];
    let instanceHashFragment = this.options.instance.hash_fragment();

    hash = `${locationHash}/${instanceHashFragment}`;
    window.location.hash = hash;
  },

  /**
   * disable/enable ui to disallow/allow user to edit input elements
   * after clicking on the save button
   *  @param {boolean} isDisabled
   */
  disableEnableContentUI(isDisabled = false) {
    const content = this.options.attr('$content');

    if (!content) {
      return;
    }

    if (isDisabled) {
      content.addClass('ui-disabled');
    } else {
      content.removeClass('ui-disabled');
    }
  },
});
