/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {DESTINATION_UNMAPPED} from '../../events/eventTypes';
import Relationship from '../../models/service-models/relationship';

export default can.Component.extend({
  tag: 'unmap-button',
  leakScope: true,
  viewModel: {
    destination: {},
    source: {},
    isUnmapping: false,
    preventClick: false,
    unmapInstance: async function () {
      this.attr('isUnmapping', true);
      this.dispatch({type: 'beforeUnmap', item: this.attr('source')});
      try {
        const item = await this.getMapping();
        await item.destroy();
        this.dispatch('unmapped');
        this.attr('destination').dispatch('refreshInstance');

        // as for unmapping doesn't matter what is source and destination
        // dispatch event on both
        this.attr('destination')
          .dispatch({
            ...DESTINATION_UNMAPPED,
            item: this.attr('source'),
          });

        this.attr('source')
          .dispatch({
            ...DESTINATION_UNMAPPED,
            item: this.attr('destination'),
          });

        this.dispatch('afterUnmap');
      } catch (e) {
        console.warn('Unmap failed', e);
      } finally {
        this.attr('isUnmapping', false);
      }
      return true;
    },
    getMapping: function () {
      return Relationship.findRelationship(
        this.source, this.destination);
    },
  },
  events: {
    click: function () {
      if (this.viewModel.attr('preventClick')) {
        return;
      }

      this.viewModel.unmapInstance();
    },
  },
});
