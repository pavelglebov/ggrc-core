/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './templates/three-dots-menu.mustache';

const viewModel = can.Map.extend({
  disabled: true,
  observer: null,
  manageEmptyList(menuNode) {
    const isEmpty = menuNode.children.length === 0;
    this.attr('disabled', isEmpty);
  },
  mutationCallback(mutationsList) {
    mutationsList.forEach((mutation) => {
      const menuNode = mutation.target;
      this.manageEmptyList(menuNode);
    });
  },
  initObserver(menuNode) {
    const config = {childList: true};
    const observer = new MutationObserver(this.mutationCallback.bind(this));
    observer.observe(menuNode, config);
    this.attr('observer', observer);
  },
});

const events = {
  inserted(element) {
    const [menuNode] = element.find('[role=menu]');
    this.viewModel.initObserver(menuNode);
    this.viewModel.manageEmptyList(menuNode);
  },
  removed() {
    this.viewModel.attr('observer').disconnect();
  },
};

export default can.Component({
  tag: 'three-dots-menu',
  template,
  leakScope: true,
  viewModel,
  events,
});
