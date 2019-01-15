/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../object-list-item/editable-document-object-list-item';
import {
  BEFORE_MAPPING,
  REFRESH_MAPPING,
  BEFORE_DOCUMENT_CREATE,
  DOCUMENT_CREATE_FAILED,
} from '../../events/eventTypes';
import Permission from '../../permission';
import template from './folder-attachments-list.mustache';

/**
 * Wrapper Component for rendering and managing of folder and
 * attachments lists
 */
export default can.Component.extend({
  tag: 'folder-attachments-list',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      showSpinner: {
        type: 'boolean',
        get() {
          return this.attr('isUnmapping')
            || this.attr('isListLoading')
            || this.attr('isMapping');
        },
      },
      readonly: {
        type: 'boolean',
        get() {
          let instance = this.attr('instance');

          if (!instance) {
            return true;
          }

          let isSnapshot = this.attr('isSnapshot');
          return isSnapshot || !Permission.is_allowed_for('update', instance);
        },
      },
      showMore: {
        type: 'boolean',
        get() {
          return !this.attr('isSnapshot');
        },
      },
      tooltip: {
        get() {
          let instance = this.attr('instance');
          if (instance) {
            return 'No copy will be created. Original files will be added to ' +
              'the destination ' + instance.class.title_singular + ' folder.';
          }
        },
      },
    },
    readonly: false,
    title: null,
    tooltip: null,
    instance: null,
    isSnapshot: false,
    folderError: null,
    isAttaching: false,
    isUnmapping: false,
    isListLoading: false,
  },
  events: {
    [`{viewModel.instance} ${BEFORE_DOCUMENT_CREATE.type}`]() {
      this.viewModel.attr('isMapping', true);
    },
    [`{viewModel.instance} ${DOCUMENT_CREATE_FAILED.type}`]() {
      this.viewModel.attr('isMapping', false);
    },
    [`{viewModel.instance} ${BEFORE_MAPPING.type}`](scope, ev) {
      if (ev.destinationType === 'Document') {
        this.viewModel.attr('isMapping', true);
      }
    },
    [`{viewModel.instance} ${REFRESH_MAPPING.type}`]() {
      this.viewModel.attr('isMapping', false);
    },
  },
});
