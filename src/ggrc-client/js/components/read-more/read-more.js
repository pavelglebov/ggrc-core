/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './read-more.mustache';

const readMore = 'Read More';
const readLess = 'Read Less';
const classPrefix = 'ellipsis-truncation-';
const viewModel = {
  define: {
    text: {
      type: 'string',
      value: '',
    },
    maxLinesNumber: {
      type: 'number',
      value: 5,
    },
    cssClass: {
      type: 'string',
      value: '',
      get() {
        return this.attr('expanded') ? '' :
          classPrefix + this.attr('maxLinesNumber');
      },
    },
  },
  expanded: false,
  overflowing: false,
  btnText() {
    return this.attr('expanded') ? readLess : readMore;
  },
  toggle(ev) {
    ev.stopPropagation();
    this.attr('expanded', !this.attr('expanded'));
  },
  updateOverflowing(el) {
    let truncatedHeight;
    let extendedHeight;
    const readMore = $(el);
    const linesNumber = this.attr('maxLinesNumber');

    // have to use opacity:0 when we use visibility:hidden line clamp
    // is not working properly
    const clonedReadMoreWrap = readMore.find('div.read-more')
      .clone()
      .css({position: 'absolute', opacity: 0});

    const clonedReadMoreBody = clonedReadMoreWrap.find('div.read-more__body');
    clonedReadMoreWrap.appendTo(readMore);

    if (!clonedReadMoreBody.hasClass(`ellipsis-truncation-${linesNumber}`)) {
      clonedReadMoreBody.addClass(`ellipsis-truncation-${linesNumber}`);
    }

    truncatedHeight = clonedReadMoreBody.height();
    clonedReadMoreBody.removeClass(`ellipsis-truncation-${linesNumber}`);
    extendedHeight = clonedReadMoreBody.height();
    clonedReadMoreWrap.remove();
    this.attr('overflowing', extendedHeight > truncatedHeight);
  },
};

export default can.Component.extend({
  tag: 'read-more',
  template,
  leakScope: true,
  viewModel,
  init() {
    const observedElement = $(arguments[0]).children()[0];
    const observer = new MutationObserver((mutations) => {
      if (mutations.find((mutation) => mutation.type === 'childList')) {
        this.viewModel.updateOverflowing(arguments[0]);
      }
    });
    observer.observe(observedElement, {childList: true, subtree: true});
  },
  events: {
    inserted() {
      this.viewModel.updateOverflowing(this.element);
    },
    '{window} resize'() {
      this.viewModel.updateOverflowing(this.element);
    },
  },
});
