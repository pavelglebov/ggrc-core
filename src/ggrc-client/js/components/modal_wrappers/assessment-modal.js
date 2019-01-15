/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  toObject,
} from '../../plugins/utils/snapshot-utils';

export default can.Component.extend({
  tag: 'assessment-modal',
  leakScope: true,
  viewModel: {
    instance: null,
    isNewInstance: false,
    mappedObjects: [],
    loadData() {
      return this.attr('instance').getRelatedObjects()
        .then((data) => {
          let snapshots = data.Snapshot.map((snapshot) => {
            let object = toObject(snapshot);

            snapshot.class = object.class;
            snapshot.title = object.title;
            snapshot.description = object.description;
            snapshot.viewLink = object.originalLink;

            return snapshot;
          });

          this.attr('mappedObjects', snapshots);
        });
    },
  },
  events: {
    inserted() {
      let vm = this.viewModel;
      if (!vm.attr('isNewInstance')) {
        vm.loadData();
      }
    },
  },
});
