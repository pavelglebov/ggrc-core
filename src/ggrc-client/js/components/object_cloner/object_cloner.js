/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {confirm} from '../../plugins/utils/modals';
import {navigate} from '../../plugins/utils/current-page-utils';

export default can.Component.extend({
  tag: 'object-cloner',
  leakScope: true,
  viewModel: {
    instance: null,
    modalTitle: '@',
    modalDescription: '@',
    includeObjects: {},
    getIncluded: function () {
      let included = this.attr('includeObjects');
      return _.filter(can.Map.keys(included), function (val) {
        return included[val];
      });
    },
    cloneObject: function (scope, el, ev) {
      let instance = this.instance;
      this.attr('includeObjects', {});

      confirm({
        instance: scope,
        modal_title: scope.attr('modalTitle'),
        modal_description: scope.attr('modalDescription'),
        content_view: GGRC.mustache_path + '/' +
          instance.class.root_collection + '/object_cloner.mustache',
        modal_confirm: 'Clone',
        skip_refresh: true,
        button_view: GGRC.mustache_path + '/modals/prompt_buttons.mustache',
      }, function () {
        let clonedInstance = instance.clone({
          cloneOptions: {
            sourceObjectId: instance.id,
            mappedObjects: this.getIncluded(),
          },
        });
        clonedInstance.save().done(function (object) {
          navigate(object.viewLink);
        });
      }.bind(this));
    },
  },
});
