/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Mixin from './mixin';

export default class DisableAddComments extends Mixin {
  static 'after:init'() {
    this.disableAddComments = true;
  }
}
