/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import RefreshQueue from '../../models/refresh_queue';
import template from './person-data.mustache';
import {notifier} from '../../plugins/utils/notifiers-utils';
import Person from '../../models/business-models/person';

const tag = 'person-data';
/**
 * Person List Item Component
 */
export default can.Component.extend({
  tag,
  template,
  leakScope: true,
  viewModel: {
    define: {
      personId: {
        type: 'number',
        set: function (newVal) {
          this.attr('person', {id: newVal});
          return newVal;
        },
      },
      person: {
        set: function (newVal, setVal) {
          let actualPerson;
          if (!newVal || !newVal.id) {
            setVal({});
            return;
          }

          actualPerson = Person.findInCacheById(newVal.id) || {};
          if (actualPerson.email) {
            setVal(actualPerson);
          } else if (newVal.email) {
            setVal(newVal);
          } else {
            actualPerson = new Person({id: newVal.id});
            new RefreshQueue()
              .enqueue(actualPerson)
              .trigger()
              .done(function (person) {
                person = Array.isArray(person) ? person[0] : person;
                setVal(person);
              })
              .fail(function () {
                setVal({});
                notifier('error',
                  'Failed to fetch data for person ' + newVal.id + '.');
              });
          }
        },
      },
      personEmail: {
        get: function () {
          return this.attr('person.email') || false;
        },
      },
      personName: {
        get: function () {
          return this.attr('person.name') || this.attr('personEmail');
        },
      },
      hasNoAccess: {
        get: function () {
          return this.attr('person.system_wide_role') === 'No Access';
        },
      },
    },
  },
});
