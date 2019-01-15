/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

/**
 * Simple wrapper component to load Related to Parent Object Comments
 */
export default can.Component.extend({
  tag: 'related-comments',
  leakScope: true,
  viewModel: {
    define: {
      parentInstance: {
        value: {},
      },
      // Load only Comment
      relatedTypes: {
        type: String,
        value: function () {
          return 'Comment';
        },
      },
    },
  },
});
