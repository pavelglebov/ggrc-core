/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './release-notes-list.mustache';
import notesTemplate from './release-notes.md';

const viewModel = can.Map.extend({
  notesTemplate: notesTemplate,
  onTopButtonCssClass: 'instantly-hidden',
  prevScrollValue: null,
});

const events = {
  ['a click'](el, event) {
    const id = el.attr('href');

    const linkedHeader = this.element.find(id)[0];

    if (linkedHeader) {
      event.preventDefault();

      linkedHeader.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  },
  ['{$content} scroll'](el, ev) {
    let prevScrollValue = this.viewModel.attr('prevScrollValue');
    let currentTop = ev.currentTarget.scrollTop;
    let clientHeight = ev.currentTarget.clientHeight;


    if ((currentTop > clientHeight) && (prevScrollValue > currentTop)) {
      this.viewModel.attr('onTopButtonCssClass', '');
    } else {
      this.viewModel.attr('onTopButtonCssClass', 'delayed-hidden');
    }

    this.viewModel.attr('prevScrollValue', currentTop);
  },
  ['.on-top-button click'](el, event) {
    $(this.element).scrollTop(0);
    this.viewModel.attr('onTopButtonCssClass', 'instantly-hidden');
  },
};

export default can.Component.extend({
  tag: 'release-notes-list',
  template,
  leakScope: true,
  viewModel,
  events,
});
