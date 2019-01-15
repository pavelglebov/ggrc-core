/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../person/person-data';
import viewModel from '../view-models/people-group-vm';
import template from './deletable-people-group.mustache';

export default can.Component.extend({
  tag: 'deletable-people-group',
  template,
  leakScope: true,
  viewModel,
});
