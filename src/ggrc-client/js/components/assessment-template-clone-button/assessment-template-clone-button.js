/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import template from './assessment-template-clone-button.mustache';
import router from '../../router';
import {getPageInstance} from '../../plugins/utils/current-page-utils';

export default can.Component.extend({
  tag: 'assessment-template-clone-button',
  template,
  leakScope: true,
  viewModel: {
    model: null,
    text: null,
    parentId: null,
    parentType: null,
    objectType: null,
    openCloneModal(el) {
      let that = this;
      let $el = $(el);
      import(/* webpackChunkName: "mapper" */ '../../controllers/mapper/mapper')
        .then((mapper) => {
          mapper.AssessmentTemplateClone.launch($el, {
            object: that.attr('parentType'),
            type: that.attr('objectType'),
            join_object_id: that.attr('parentId'),
            refreshTreeView: that.refreshTreeView.bind(that),
          });
        });
    },
    refreshTreeView() {
      if (getPageInstance().type === 'Audit') {
        if (router.attr('widget') === 'assessment_template') {
          this.dispatch('refreshTree');
        } else {
          router.attr({
            widget: 'assessment_template',
            refetch: true,
          });
        }
      }
    },
  },
});
