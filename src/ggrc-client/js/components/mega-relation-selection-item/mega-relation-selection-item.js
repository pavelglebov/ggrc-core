/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './mega-relation-selection-item.stache';

export default can.Component.extend({
  tag: 'mega-relation-selection-item',
  template: can.stache(template),
  leakScope: false,
  viewModel: {
    mapAsChild: null,
    isDisabled: false,
    id: null,
    element: null,
    switchRelation(mapAsChild) {
      can.trigger(this.attr('element'), 'mapAsChild', {
        id: this.attr('id'),
        val: mapAsChild ? 'child' : 'parent',
      });
    },
  },
  events: {
    inserted(element) {
      this.viewModel.attr('element', element);
    },
  },
});
