/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import canMap from 'can-map';
import canComponent from 'can-component';
import {
  CUSTOM_ATTRIBUTE_TYPE,
} from '../../plugins/utils/custom-attribute/custom-attribute-config';
import {isAllowedFor} from '../../permission';
import {notifierXHR} from '../../plugins/utils/notifiers-utils';
import {isChangeableExternally} from '../../plugins/utils/ggrcq-utils';
import {isSnapshot} from '../../plugins/utils/snapshot-utils';

/**
 * Global Custom Attributes is a component representing custom attributes.
 */
export default canComponent.extend({
  tag: 'global-custom-attributes',
  leakScope: true,
  viewModel: canMap.extend({
    isAttributesDisabled: false,
    define: {
      redirectionEnabled: {
        get() {
          const instance = this.attr('instance');
          return isChangeableExternally(instance) && !isSnapshot(instance);
        },
      },
      /**
       * Indicates whether custom attributes can be edited.
       * @type {boolean}
       */
      isEditDenied: {
        type: 'boolean',
        get: function () {
          return this.attr('instance.snapshot') ||
            this.attr('instance.isRevision') ||
            this.attr('instance.archived') ||
            this.attr('isAttributesDisabled') ||
            this.isReadOnlyForInstance(this.attr('instance')) ||
            !isAllowedFor('update', this.attr('instance'));
        },
      },
    },
    instance: null,
    /**
     * Contains custom attributes.
     * @type {canList}
     */
    items: [],
    isReadOnlyForInstance(instance) {
      if (!instance) {
        return false;
      }

      return instance.constructor.isProposable || instance.attr('readonly');
    },
    initCustomAttributes: function () {
      const instance = this.attr('instance');
      const result = instance
        .customAttr({
          type: CUSTOM_ATTRIBUTE_TYPE.GLOBAL,
        });
      this.attr('items', result);
    },
    saveCustomAttributes: function (event, field) {
      const caId = field.customAttributeId;
      const value = event.value;
      const instance = this.attr('instance');

      this.attr('isSaving', true);
      instance.customAttr(caId, value);
      instance.save()
        .done(function () {
          $(document.body).trigger('ajax:flash', {
            success: 'Saved',
          });
          instance.backup();
        })
        .fail(function (instance, xhr) {
          notifierXHR('error', xhr);
        })
        .always(function () {
          this.attr('isSaving', false);
        }.bind(this));
    },
  }),
  init: function () {
    this.viewModel.initCustomAttributes();
  },
  events: {
    '{viewModel.instance} readyForRender': function () {
      this.viewModel.initCustomAttributes();
    },
  },
});
