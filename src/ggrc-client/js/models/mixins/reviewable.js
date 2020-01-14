/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Mixin from './mixin';

export default class Reviewable extends Mixin {
  static 'after:init'() {
    this.isReviewable = true;
  }
}
