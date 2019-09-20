/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import '../questionnaire-mapping-link/questionnaire-mapping-link';
import '../issue/issue-unmap-item';
import template from './unmap-dropdown-item.stache';
import {
  allowedToUnmap,
  toBeUnmappedExternally,
} from '../../models/mappers/mappings';
import {
  isAllObjects,
  isMyWork,
} from '../../plugins/utils/current-page-utils';

export default canComponent.extend({
  tag: 'unmap-dropdown-item',
  view: canStache(template),
  leakScope: false,
  viewModel: canMap.extend({
    define: {
      issueUnmap: {
        get() {
          return this.attr('page_instance.type') === 'Issue' ||
            this.attr('instance.type') === 'Issue';
        },
      },
      denyIssueUnmap: {
        get: function () {
          return this.attr('issueUnmap')
              && ((this.attr('page_instance.type') === 'Audit'
                  && !this.attr('instance.allow_unmap_from_audit'))
                || (this.attr('instance.type') === 'Audit'
                  && !this.attr('page_instance.allow_unmap_from_audit')));
        },
      },
      denySnapshotUnmap: {
        get() {
          let source = this.attr('page_instance');
          let destination = this.attr('instance');

          if (destination.attr('type') === 'Snapshot') {
            return source.attr('type') === 'Assessment' &&
              destination.attr('archived');
          }

          return false;
        },
      },
      isAllowedToUnmap: {
        get() {
          let source = this.attr('page_instance');
          let destination = this.attr('instance');
          let options = this.attr('options');

          return allowedToUnmap(source, destination)
            && !(isAllObjects() || isMyWork())
            && options.attr('isDirectlyRelated')
            && !this.attr('denyIssueUnmap')
            && !this.attr('denySnapshotUnmap')
            && !source._is_sox_restricted
            && !destination._is_sox_restricted;
        },
      },
      isUnmappableExternally: {
        get() {
          let source = this.attr('page_instance.type');
          let destination = this.attr('instance.type');

          return toBeUnmappedExternally(source, destination);
        },
      },
    },
    instance: {},
    page_instance: {},
    options: {},
  }),
});
