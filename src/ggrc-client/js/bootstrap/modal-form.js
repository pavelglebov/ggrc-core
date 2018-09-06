/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {confirm} from '../plugins/utils/modals';
import {hasPending as hasPendingUtil} from '../plugins/ggrc_utils';
import {navigate} from '../plugins/utils/current-page-utils';
import {changeUrl} from '../router';

(function ($) {
  'use strict';

  /* MODAL_FORM PUBLIC CLASS DEFINITION
   * =============================== */

  let ModalForm = function (element, options, trigger) {
    this.options = options;
    this.$element = $(element);
    this.$trigger = $(trigger);

    this.init();
  };

  /* NOTE: MODAL_FORM EXTENDS BOOTSTRAP-MODAL.js
   * ========================================== */

  ModalForm.prototype = new $.fn.modal.Constructor(null, {remote: false});

  $.extend(ModalForm.prototype, {

    init: function () {
      const $element = this.$element;
      $element
        .on('preload', function () {
          this.is_form_dirty(true);
          this.control = this.$element.control();
          if (this.control.options && this.control.options.instance) {
            this.instance = this.control.options.instance;
            this.instance.backup();
          }
        }.bind(this))
        .on('keypress', 'form', $.proxy(this.keypress_submit, this))
        .on('keyup', 'form', $.proxy(this.keyup_escape, this))
        .on('click.modal-form.close', '[data-dismiss="modal"]', $.proxy(this.hide, this))
        .on('click.modal-form.reset', 'input[type=reset], [data-dismiss="modal-reset"]', $.proxy(this.reset, this))
        .on('click.modal-form.submit', 'input[type=submit], [data-toggle="modal-submit"]', $.proxy(this.submit, this))
        .on('shown.modal-form', $.proxy(this.focus_first_input, this))
        .on('loaded.modal-form', $.proxy(this.focus_first_input, this))
        .on('delete-object', $.proxy(this.delete_object, this))
        .draggable({
          handle: '.modal-header',
          cancel: '.btn',
          stop() {
            // jquery UI unsets focus from modal
            // we fix it
            $element.focus();
          },
        });
    },

    doNothing: function (e) {
      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
    },
    delete_object: function (e, data, xhr) {
      // If this modal is contained within another modal, pass the event onward
      let $trigger_modal = this.$trigger.closest('.modal');
      let delete_target;

      if ($trigger_modal.length > 0) {
        $trigger_modal.trigger('delete-object', [data, xhr]);
      } else {
        delete_target = this.$trigger.data('delete-target');
        if (delete_target === 'refresh') {
          // Refresh the page
          navigate(window.location.href.replace(/#.*/, ''));
        } else if (xhr && xhr.getResponseHeader('location')) {
          // Otherwise redirect if possible
          navigate(xhr.getResponseHeader('location'));
        } else {
          // Otherwise refresh the page
          navigate(window.location.href.replace(/#.*/, ''));
        }
      }
    },
    $form: function () {
      return this.$element.find('form').first();
    },

    is_form_dirty: function (cache_values) {
      let that = this;
      let cache = {};
      let dirty = false;

      // Generate a hash of the form values
      can.each(this.$form().serializeArray(), function (field) {
        let val;
        if (cache[field.name]) {
          val = cache[field.name] + ',' + field.value;
        } else {
          val = field.value;
        }
        cache[field.name] = val;
      });

      if (cache_values || !this._cached_values) {
        // Cache the initial form values as requested
        this._cached_values = cache;
      } else {
        // Otherwise compute a diff to determine whether the form is dirty
        can.each(cache, function (value, key) {
          if (!dirty) {
            dirty = (value !== that._cached_values[key] &&
              (!!value || that._cached_values[key] !== undefined));
          }
        });
      }

      return dirty;
    },

    submit: function (e) {
      let $form = this.$form();
      let that = this;

      if (!$form.data('submitpending')) {
        $('[data-toggle=modal-submit]', $form)
          .each(function () {
            $(this).data('origText', $(this).text());
          })
          .addClass('disabled')
          .attr('disabled', true);

        $form.data('submitpending', true)
          .one('ajax:beforeSend', function (ev, _xhr) {
            that.xhr = _xhr;
          })
          .submit();
      }
      if (e.type === 'click') {
        e.preventDefault();
      }
    },

    keypress_submit: function (e) {
      if (e.which === 13 && !$(e.target).is('textarea') &&
        !$(e.target).hasClass('create-form__input')) {
        if (!e.isDefaultPrevented()) {
          e.preventDefault();
          this.$form().submit();
        }
      }
    },

    keyup_escape: function (e) {
      if ($(document.activeElement).is('select, [data-toggle=datepicker]') && e.which === 27) {
        this.$element.attr('tabindex', -1).focus();
        e.stopPropagation();
      }
    },

    reset: function (e) {
      let form = this.$form()[0];
      if (form) {
        form.reset();
      }
      this.hide(e);
    },

    hide: function (e, verifyChanges) {
      let instance = this.instance;
      let pending;
      let hasPending;
      let changedInstance;

      if (e) {
        e.preventDefault();
      }

      // If the hide was initiated by the backdrop, check for dirty form data before continuing
      // Same behavior if extra flag is sent
      if (e && $(e.target).is('.modal-backdrop,.fa-times') || verifyChanges) {
        if ($(e.target).is('.disabled')) {
          // In the case of a disabled modal backdrop, treat it like any other disabled data-dismiss,
          //  i.e. do nothing.
          e.stopPropagation();
          return;
        }
        if (instance) {
          instance._backupStore()['-1'] = instance['-1'];
          changedInstance = instance.isDirty(true);
          if (!instance.id) {
            hasPending = false;
          } else {
            hasPending = hasPendingUtil(instance);
          }
        }
        if (this.is_form_dirty() || changedInstance || hasPending) {
          // Confirm that the user wants to lose the data prior to hiding
          confirm({
            modal_title: 'Discard Changes',
            modal_description: 'Are you sure that you want' +
            ' to discard your changes?',
            modal_confirm: 'Continue Editing',
            button_view: GGRC.mustache_path +
              '/modals/discard_buttons.mustache',
            skip_refresh: true,
          }, function () {
            can.trigger(instance, 'modal:dismiss');
            can.trigger(instance, 'modal:discard');
            this.$element.trigger('modal:discard');
            this.$trigger.trigger('modal:dismiss');
            this.$element
              .find("[data-dismiss='modal'], [data-dismiss='modal-reset']")
              .trigger('click');
            $(window).trigger('modal:dismiss', this.options);
            this.hide();
          }.bind(this));
          return;
        }

        // trigger event if form is not dirty
        $(window).trigger('modal:dismiss', this.options);
      }

      // Hide the modal like normal
      if (instance) {
        pending = instance.attr('_pending_joins');
        if (pending && pending.length) {
          instance.attr('_pending_joins', []);
        }
        can.trigger(instance, 'modal:dismiss');
      }
      $.fn.modal.Constructor.prototype.hide.apply(this, [e]);
      this.$element.trigger('modal:dismiss');
      this.$element.off('modal_form');
    },

    silentHide: function () {
      $.fn.modal.Constructor.prototype.hide.call(this);
    },

    focus_first_input: function (ev) {
      let that = this;
      setTimeout(function () {
        let $first_input;
        $first_input = that.$element.find('*[autofocus]');
        if (!$first_input.length) {
          $first_input = that.$element
            .find('input[type="text"], input[type="checkbox"], select, textarea')
            .not('[placeholder*=autofill], label:contains(autofill) + *, [disabled]')
            .first();
        }
        if ($first_input.length && (!ev || that.$element.is(ev.target))) {
          $first_input.get(0).focus();
        }
      }, 100);
    },
  });

  $.fn.modal_form = function (option, trigger, params) {
    return this.each(function () {
      let $this = $(this);
      let data = $this.data('modal_form');
      let options = $.extend({}, $.fn.modal_form.defaults,
        $this.data(), typeof option === 'object' && option);

      if (!data) {
        $this.data('modal_form', (data = new ModalForm(this, options, trigger)));
      }
      if (typeof option === 'string') {
        data[option]();
      } else if (options.show) {
        data.show();
      }
    });
  };

  $.fn.modal_form.Constructor = ModalForm;
  $.fn.modal_form.defaults = $.extend({}, $.fn.modal.defaults, {
  });

  /* MODAL-FORM DATA-API
   * =================== */

  $(function () {
    $('body').on('click.modal-form.data-api', '[data-toggle="modal-form"]', function (e) {
      let $this = $(this);
      let href;
      let $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')); // strip for ie7
      let option = $target.data('modal-form') ? 'toggle' : $.extend({}, $target.data(), $this.data());

      e.preventDefault();
      $target.modal_form(option);
    });
  });

  // Default flash handler
  $(function () {
    // Default form complete handler
    $('body').on('ajax:complete', function (e, xhr, status) {
      let data = null;
      let modal_form;
      let flash_types;
      let type_i;
      let message;
      let flash;

      try {
        data = JSON.parse(xhr.responseText);
      } catch (exc) {
        // console.debug('exc', exc);
      }

      if (!e.stopRedirect) {
        // Maybe handle AJAX/JSON redirect or refresh
        if (xhr.status === 278) {
          // Handle 278 redirect (AJAX redirect)
          navigate(xhr.getResponseHeader('location'));
        } else if (xhr.status === 279) {
          // Handle 279 page refresh
          navigate(window.location.href.replace(/#.*/, ''));
        } else {
          modal_form = $('.modal:visible:last').data('modal_form');
          if (modal_form && xhr === modal_form.xhr) {
            delete modal_form.xhr;
            $('[data-toggle=modal-submit]', modal_form.$element)
              .removeAttr('disabled')
              .removeClass('disabled')
              .each(function () {
                $(this).text($(this).data('origText'));
              });
            $('form', modal_form.$element).data('submitpending', false);
          }
        }
      }

      if (data) {
        // Parse and dispatch JSON object
        $(e.target).trigger('ajax:json', [data, xhr]);
      } else if (xhr.responseText) {
        // Dispatch as html, if there is html to dispatch.  (no result should not blank out forms)
        $(e.target).trigger('ajax:html', [xhr.responseText, xhr]);
      }

      if (!e.stopFlash) {
        // Maybe handle AJAX flash messages
        flash_types = ['error', 'alert', 'notice', 'warning'];

        for (type_i in flash_types) {
          if (!flash_types.hasOwnProperty(type_i)) {
            continue;
          }
          message = xhr.getResponseHeader('x-flash-' + flash_types[type_i]);
          message = JSON.parse(message);
          if (message) {
            if (!flash) {
              flash = {};
            }
            flash[flash_types[type_i]] = message;
          }
        }
        if (flash) {
          $(document.body).trigger('ajax:flash', flash);
        }
      }
    });

    $('body').on('ajax:flash', function (e, flash, redirectLink) {
      let $target;
      let $flashHolder;
      let type;
      let message;
      let messageI;
      let flashClass;
      let addLink;
      let $link;
      let flashClassMappings = {
        notice: 'success',
        Running: 'progress',
        Pending: 'progress',
      };
      let textContainer;
      let $html;
      let gotMessage = _.some(_.values(flash), function (msg) {
        return !!msg;
      });

      if (!gotMessage) {
        // sometimes ajax:flash is triggered with bad data
        return;
      }

      // Find or create the flash-message holder
      $target = $(e.target);
      if ($target.has('.modal-body').length < 1) {
        $target = $('body');
      }
      $flashHolder = $target.find('.flash');

      if ($flashHolder.length === 0) {
        $flashHolder = $('<div class="flash"></div>');
        $target.find('.modal-body').prepend($flashHolder);
      } else {
        $flashHolder.empty();
      }

      for (type in flash) {
        // data prop is reserved for mustache template data and
        // we don't expect to have ajax:flash of a "data" type
        if ( type === 'data' ) {
          continue;
        }

        if (flash[type]) {
          if (_.isString(flash[type])) {
            flash[type] = [flash[type]];
          }

          flashClass = flashClassMappings[type] || type;

          $html = $('<div></div>');
          $html.addClass('alert').addClass('alert-' + flashClass);
          textContainer = '<span class="content"></span>';

          if (flashClass !== 'progress') {
            $html.addClass('alert-autohide');
          }

          if ( _.isFunction(flash[type]) ) {
            $html.append(flash[type](flash.data || {}));
          } else {
            for (messageI in flash[type]) {
              if (!flash[type].hasOwnProperty(messageI)) {
                continue;
              }
              message = flash[type][messageI];
              // Skip error codes. To force display use String(...) when
              // triggering the flash.
              if (_.isString(message)) {
                addLink = message.indexOf('{reload_link}') > -1;
                message = message.replace('{reload_link}', '');
                $html.append($(textContainer).text(message));
                if (addLink) {
                  $html.removeClass('alert-autohide');
                  $link = $(`<a href="javascript://" class="reload-link">
                                Show results
                             </a>`);
                  $link.on('click', function () {
                    if (redirectLink) {
                      $('html').addClass('no-js');
                      changeUrl(redirectLink);
                    }
                    window.location.reload();
                  });
                  $html.append($link);
                }
              }
            }
          }

          $html.append(
            '<a href="#" class="close" data-dismiss="alert">' +
              '<i class="fa fa-times" aria-hidden="true"></i>' +
            '</a>'
          );

          $flashHolder.append($html);
        }
      }
    });

    $('body').on('ajax:html', '.modal > form', function (e, html, xhr) {
      let sel = "script[type='text/javascript'], script[language='javascript'], script:not([type])";
      let $frag = $(html);
      $frag.filter(sel).add($frag.find(sel)).each(function () {
        $(this).remove();
        setTimeout($(this).html(), 10);
      });
      $(this).find('.modal-body').html($frag);
    });
  });
})(window.jQuery);
