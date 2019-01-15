/*
  Copyright (C) 2019 Google Inc., authors, and contributors <see AUTHORS file>
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {
  peopleWithRoleName,
} from '../../plugins/utils/acl-utils';
import './inline-aggregate-field';
import Person from '../../models/business-models/person';

const viewModel = can.Map.extend({
  define: {
    peopleList: {
      get() {
        const instance = this.attr('instance');
        const roleName = this.attr('role');
        return peopleWithRoleName(instance, roleName);
      },
    },
  },
  instance: {},
  role: '',
  type: Person,
});

export default can.Component.extend('peopleWithRoleInlineField', {
  tag: 'people-with-role-inline-field',
  leakScope: true,
  template: `
    <inline-aggregate-field
      {source}="peopleList"
      {type}="type"
      {field}="'email'"
    />`,
  viewModel,
});
