/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

export default can.Component.extend({
  tag: 'textarea-array',
  template:
    '<textarea class="{{className}}" placeholder="{{placeholder}}">' +
    '{{content}}' +
    '</textarea>',
  leakScope: true,
  viewModel: {
    array: null,
    className: '@',
    delimeter: ', ',
    placeholder: '@',
    init: function () {
      this.updateContent();
    },
    updateContent: function () {
      let array = this.attr('array') || [];
      this.attr('content', array.join(this.attr('delimeter')));
    },
  },
  events: {
    'textarea change': function (el, ev) {
      let val = $(el).val();
      this.viewModel.attr('array',
        $.map(val.split(','), $.proxy(''.trim.call, ''.trim)));
      this.viewModel.updateContent();
    },
  },
});
