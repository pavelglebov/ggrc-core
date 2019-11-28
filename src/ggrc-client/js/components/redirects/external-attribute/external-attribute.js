/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import template from './templates/external-attribute.stache';
import {isChangeableExternally} from '../../../plugins/utils/ggrcq-utils';
import '../proposable-control/proposable-control';
import '../external-control/external-control';

const viewModel = canMap.extend({
  define: {
    showToolbarControls: {
      get() {
        return isChangeableExternally(this.attr('instance'));
      },
    },
  },
  instance: null,
  attrName: '',
  title: '',
  mandatory: false,
});

export default canComponent.extend({
  tag: 'external-attribute',
  leakScope: false,
  view: canStache(template),
  viewModel,
});
