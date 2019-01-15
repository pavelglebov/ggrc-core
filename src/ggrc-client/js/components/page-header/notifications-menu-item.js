/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './notifications-menu-item.mustache';
import NotificationConfig
  from '../../models/service-models/notification-config';
import Context from '../../models/service-models/context';

const emailDigestType = 'Email_Digest';

export default can.Component.extend({
  tag: 'notifications-menu-item',
  template,
  leakScope: true,
  viewModel: {
    define: {
      emailDigest: {
        set(newValue) {
          if (!this.attr('isLoading')) {
            this.saveEmailDigest(newValue);
          }

          return newValue;
        },
      },
    },
    isSaving: false,
    isLoading: false,
    existingConfigId: null,
    async saveEmailDigest(checked) {
      this.attr('isSaving', true);

      try {
        let existingConfigId = this.attr('existingConfigId');

        if (existingConfigId) {
          await this.updateNotification(existingConfigId, checked);
        } else {
          await this.createNotification(checked);
        }
      } finally {
        this.attr('isSaving', false);
      }
    },
    async createNotification(checked) {
      let config = new NotificationConfig({
        person_id: GGRC.current_user.id,
        notif_type: emailDigestType,
        enable_flag: checked,
        context: new Context({id: null}),
      });

      config = await config.save();

      this.attr('existingConfigId', config.id);
    },
    async updateNotification(configId, checked) {
      let config = await NotificationConfig.findInCacheById(configId).refresh();
      config.attr('enable_flag', checked);
      await config.save();
    },
    async loadNotification() {
      this.attr('isLoading', true);
      try {
        let config = await NotificationConfig.find(emailDigestType);
        if (config) {
          this.attr('emailDigest', config.enable_flag);
          this.attr('existingConfigId', config.id);
        } else {
          // Handle the default case, in case notification object is not set
          this.attr('emailDigest', true);
        }
      } finally {
        this.attr('isLoading', false);
      }
    },
  },
  events: {
    // Don't close the dropdown if clicked on checkbox
    'click'(el, ev) {
      ev.stopPropagation();
    },
  },
  init() {
    this.viewModel.loadNotification();
  },
});

