/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Mixin from './mixin';

/*
  Mega object can be mapped to the same object type,
  e.g. map Program to Mega Program
*/
export default Mixin({
  isMegaObject: true,
  'after:init'() {
    this.tree_view_options.mega_attr_list =
      this.tree_view_options.mega_attr_list || [];
    this.tree_view_options.mega_attr_list.push({
      attr_title: 'Map as',
      attr_name: 'map_as',
      order: 41,
      disable_sorting: true,
      mandatory: true,
    });
  },
}, {});
