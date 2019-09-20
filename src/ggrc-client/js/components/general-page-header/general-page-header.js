/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import canStache from 'can-stache';
import canMap from 'can-map';
import canComponent from 'can-component';
import template from './templates/general-page-header.stache';
import {isChangeableExternally} from '../../plugins/utils/ggrcq-utils';
import {isSnapshot} from '../../plugins/utils/snapshot-utils';
import '../redirects/proposable-control/proposable-control';
import '../redirects/external-control/external-control';

const viewModel = canMap.extend({
  define: {
    redirectionEnabled: {
      get() {
        const instance = this.attr('instance');
        return isChangeableExternally(instance) && !isSnapshot(instance);
      },
    },
    showProposalButton: {
      get() {
        const instance = this.attr('instance');
        return (
          instance.constructor.isProposable &&
          !isChangeableExternally(instance) &&
          !isSnapshot(instance)
        );
      },
    },
  },
  instance: null,
  isSaving: false,
});

export default canComponent.extend({
  tag: 'general-page-header',
  view: canStache(template),
  leakScope: true,
  viewModel,
});
