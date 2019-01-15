/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './related-objects';
import '../add-issue-button/add-issue-button';
import template from './related-issues.mustache';

export default can.Component.extend({
  tag: 'related-issues',
  template,
  leakScope: true,
  viewModel: {
    define: {
      orderBy: {
        type: 'string',
        value: 'created_at',
      },
      itemsType: {
        type: 'string',
        value: 'Issue',
      },
      relatedIssuesFilter: {
        type: '*',
        get: function () {
          let id = this.attr('baseInstance.id');
          let type = this.attr('baseInstance.type');
          return {
            expression: {
              left: {
                object_name: type,
                op: {name: 'relevant'},
                ids: [id],
              },
              right: {
                object_name: type,
                op: {name: 'similar'},
                ids: [id],
              },
              op: {name: 'OR'},
            },
          };
        },
      },
    },
    baseInstance: null,
  },
});
