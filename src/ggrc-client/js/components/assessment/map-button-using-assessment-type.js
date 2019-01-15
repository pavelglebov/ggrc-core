/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

const tag = 'map-button-using-assessment-type';

export default can.Component.extend({
  tag,
  leakScope: true,
  viewModel: {
    instance: {},
    deferredTo: {},
    openMapper: function () {
      let data = {
        join_object_type: this.attr('instance.type'),
        join_object_id: this.attr('instance.id'),
        type: this.attr('instance.assessment_type'),
        deferred_to: this.attr('deferredTo'),
      };

      import(/* webpackChunkName: "mapper" */ '../../controllers/mapper/mapper')
        .then((mapper) => {
          mapper.ObjectMapper.openMapper(data);
        });
    },
    onClick: function (el, ev) {
      el.data('type', this.attr('instance.assessment_type'));
      el.data('deferred_to', this.attr('deferredTo'));
      import(/* webpackChunkName: "mapper" */ '../../controllers/mapper/mapper')
        .then(() => {
          can.trigger(el, 'openMapper', ev);
        });
    },
  },
  events: {
    inserted: function () {
      this.viewModel.attr('deferredTo',
        this.element.data('deferred_to'));
    },
    '.assessment-map-btn click': function (el, ev) {
      this.viewModel.onClick(el, ev);
      ev.preventDefault();
      return false;
    },
  },
});
