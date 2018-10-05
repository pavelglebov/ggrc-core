/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Spinner from 'spin.js';
import NotificationConfig from './models/service-models/notification-config';
import Control from './models/business-models/control';

let $body = $('body');
let $window = $(window);

// We remove loading class
$window.on('load', function () {
  $('html').removeClass('no-js');
});

$body.on('click', '.lhn-no-init', function () {
  $(this).removeClass('lhn-no-init');
  import(/* webpackChunkName: "lhn" */'./controllers/lhn_controllers')
    .then(function () {
      $('#lhn').cms_controllers_lhn();
      $(document.body).ggrc_controllers_recently_viewed();
    });
});

$body.on('click', 'a[data-toggle=unmap]', function (ev) {
  let $el = $(this);
  //  Prevent toggling `openclose` state in trees
  ev.stopPropagation();
  $el.fadeTo('fast', 0.25);
  $el.children('.result').each(function (i, resultEl) {
    let $resultEl = $(resultEl);
    let result = $resultEl.data('result');
    let mappings = result && result.get_mappings();

    function notify(instance) {
      $(document.body).trigger(
        'ajax:flash',
        {success: 'Unmap successful.'}
      );
    }

    can.each(mappings, function (mapping) {
      mapping.refresh().done(function () {
        if (mapping instanceof Control) {
          mapping.removeAttr('directive');
          mapping.save().then(notify);
        } else {
          mapping.destroy().then(notify);
        }
      });
    });
  });
});

// Initialize delegated event handlers
jQuery(function ($) {
  window.natural_comparator = function (a, b) {
    let i;
    a = a.slug.toString();
    b = b.slug.toString();
    if (a === b) {
      return 0;
    }

    a = a.replace(/(?=\D\d)(.)|(?=\d\D)(.)/g, '$1$2|').split('|');
    b = b.replace(/(?=\D\d)(.)|(?=\d\D)(.)/g, '$1$2|').split('|');

    for (i = 0; i < Math.max(a.length, b.length); i++) {
      if (Number(a[i]) === Number(a[i]) && Number(b[i]) === Number(b[i])) {
        if (Number(a[i]) < Number(b[i])) {
          return -1;
        }
        if (Number(b[i]) < Number(a[i])) {
          return 1;
        }
      } else {
        if (a[i] < b[i]) {
          return -1;
        }
        if (b[i] < a[i]) {
          return 1;
        }
      }
    }
    return 0;
  };

  // After the modal template has loaded from the server, but before the
  //  data has loaded to populate into the body, show a spinner
  $body.on('loaded', '.modal.modal-slim, .modal.modal-wide', function (e) {
    let spin = function () {
      $(this).html(
        $(new Spinner().spin().el)
          .css({
            width: '100px', height: '100px',
            left: '50%', top: '50%',
            zIndex: calculate_spinner_z_index,
          })
      ).one('loaded', function () {
        $(this).find('.source').each(spin);
      });
    };

    $(e.target).find('.modal-body .source').each(spin);
  });
});

jQuery(function ($) {
  function checkActive(notificationConfigs) {
    let inputs = $('.notify-wrap').find('input');
    let activeNotifications = $.map(notificationConfigs, function (a) {
      if (a.enable_flag) {
        return a.notif_type;
      }
    });
    $.map(inputs, function (input) {
      // Handle the default case, in case notification objects are not set:
      if (notificationConfigs.length === 0) {
        input.checked = input.value === 'Email_Digest';
      } else {
        input.checked = activeNotifications.indexOf(input.value) > -1;
      }
    });
  }
  function updateNotifications() {
    NotificationConfig.findActive().then(checkActive);
    $body.off('click',
      '.user-dropdown > .dropdown-toggle',
      updateNotifications
    );
  }

  $body.on('click', '.user-dropdown > .dropdown-toggle', updateNotifications);

  // Don't close the dropdown if clicked on checkbox
  $body.on('click', '.notify-wrap', function (ev) {
    ev.stopPropagation();
  });

  $body.on('click', 'input[name=notifications]', function (ev, el) {
    let li = $(ev.target).closest('.notify-wrap');
    let inputs = li.find('input');
    let active = [];
    let emailNow = li.find('input[value="Email_Now"]');
    let emailNowLabel = emailNow.closest('label');
    let emailDigest = li.find('input[value="Email_Digest"]');

    if (emailDigest[0].checked) {
      emailNowLabel.removeClass('disabled');
      emailNow.prop('disabled', false);
    } else if (!emailDigest[0].checked) {// uncheck email_now
      emailNow.prop('checked', false);
      emailNowLabel.addClass('disabled');
    }

    inputs.prop('disabled', true);
    active = $.map(inputs, function (input) {
      if (input.checked) {
        return input.value;
      }
    });
    NotificationConfig.setActive(active).always(function (response) {
      emailDigest.prop('disabled', false);
      if (emailDigest[0].checked) {
        emailNow.prop('disabled', false);
      }
    });
  });
});

// Make all external links open in new window.
jQuery(function ($) {
  $body.on('click', 'a[href]:not([target])', function (e) {
    if (!e.isDefaultPrevented()) {
      if (/^http/.test(this.protocol)
        && this.hostname !== window.location.hostname) {
        e.preventDefault();
        window.open(this.href);
      }
    }
  });
});

jQuery(function ($) {
  $body.on('click', '.show-long', function (e) {
    let $this = $(this);
    let $descField = $this.closest('.span12').find('.tree-description');
    $this.hide();
    $descField.removeClass('short');
  });
});


$(function () {
  $('body').on(
    'click',
    '[data-toggle="user-roles-modal-selector"]',
    async function (ev) {
      let $this = $(this);
      let options = $this.data('modal-selector-options');
      let dataSet = can.extend({}, $this.data());
      let objectParams = $this.attr('data-object-params');
      const {
        getOptionSet,
        'default': userRolesModalSelector,
      } = await import(
        /* webpackChunkName: "userRoleModalSelector" */
        './controllers/contributions'
      );
      dataSet.params = objectParams && JSON.parse(
        objectParams.replace(/\\n/g, '\\n')
      );

      can.each($this.data(), function (v, k) {
        //  This is just a mapping of keys to underscored keys
        let newKey = k.replace(
          /[A-Z]/g,
          function (str) {
            return '_' + str.toLowerCase();
          }
        );

        dataSet[newKey] = v;
        //  If we changed the key at all, delete the original
        if (newKey !== k) {
          delete dataSet[k];
        }
      });

      if (typeof options === 'string') {
        options = getOptionSet(options, dataSet);
      }

      ev.preventDefault();
      ev.stopPropagation();

      // Trigger the controller
      userRolesModalSelector.launch($this, options)
        .on('relationshipcreated relationshipdestroyed', function (ev, data) {
          // $this.trigger("modal:" + ev.type, data);
        });
    });
});

function openMapperByElement(ev, disableMapper) {
  let btn = $(ev.currentTarget);
  let data = {};

  can.each(btn.data(), function (val, key) {
    data[can.camelCaseToUnderscore(key)] = val;
  });

  if (data.tooltip) {
    data.tooltip.hide();
  }

  if (!data.clickable) {
    ev.preventDefault();
  }

  import(/* webpackChunkName: "mapper" */ './controllers/mapper/mapper')
    .then((mapper) => {
      mapper.ObjectMapper.openMapper(data, disableMapper, btn);
    });
}

$body.on('openMapper', (el, ev, disableMapper) => {
  openMapperByElement(ev, disableMapper);
});

$body.on('click', ['unified-mapper', 'unified-search']
  .map((val) => `[data-toggle="${val}"]`).join(', '), (ev, disable) => {
  openMapperByElement(ev, disable);
});
