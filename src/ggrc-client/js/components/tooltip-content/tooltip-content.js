/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './templates/tooltip-content.mustache';

const viewModel = can.Map.extend({
  content: '',
  placement: 'top',
  /**
   * @private
   */
  showTooltip: false,
  /**
   * @private
   */
  $el: null,
  updateOverflow() {
    const [trimTarget] = this.$el.find('[data-trim-target="true"]');
    this.attr('showTooltip', (
      trimTarget.offsetHeight < trimTarget.scrollHeight ||
      trimTarget.offsetWidth < trimTarget.scrollWidth
    ));
  },
});

const events = {
  inserted(element) {
    this.viewModel.$el = element;
    this.viewModel.updateOverflow();
  },
};

export default can.Component({
  tag: 'tooltip-content',
  template,
  leakScope: true,
  viewModel,
  events,
});
