/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import Cacheable from '../cacheable';
import tracker from '../../tracker';
import caUpdate from '../mixins/ca-update';
import Stub from '../stub';

export default Cacheable('CMS.Models.Person', {
  root_object: 'person',
  root_collection: 'people',
  category: 'entities',
  findAll: 'GET /api/people',
  findOne: 'GET /api/people/{id}',
  create: 'POST /api/people',
  update: 'PUT /api/people/{id}',
  destroy: 'DELETE /api/people/{id}',
  search: function (request, response) {
    return can.ajax({
      type: 'get',
      url: '/api/people',
      dataType: 'json',
      data: {s: request.term},
      success: function (data) {
        response(can.$.map(data, function (item) {
          return can.extend({}, item.person, {
            label: item.person.email,
            value: item.person.id,
          });
        }));
      },
    });
  },
  is_custom_attributable: true,
  attributes: {
    context: Stub,
    modified_by: Stub,
    language: Stub,
    user_roles: Stub.List,
    name: 'trimmed',
    email: 'trimmedLower',
  },
  mixins: [caUpdate],
  defaults: {
    name: '',
    email: '',
    contact: null,
    owners: null,
  },
  convert: {
    trimmed: function (val) {
      return (val && val.trim) ? val.trim() : val;
    },
    trimmedLower: function (val) {
      return ((val && val.trim) ? val.trim() : val).toLowerCase();
    },
  },
  serialize: {
    trimmed: function (val) {
      return (val && val.trim) ? val.trim() : val;
    },
    trimmedLower: function (val) {
      return ((val && val.trim) ? val.trim() : val).toLowerCase();
    },
  },
  findInCacheById: function (id) {
    return this.store[id] || this.cache ? this.cache[id] : null;
  },
  findInCacheByEmail: function (email) {
    let result = null;
    let cache = this.store || this.cache || {};
    can.each(Object.keys(cache), function (k) {
      if (cache[k].email === email) {
        result = cache[k];
        return false;
      }
    });
    return result;
  },
  tree_view_options: {
    attr_view: GGRC.mustache_path + '/people/tree-item-attr.mustache',
    attr_list: [{
      attr_title: 'Name',
      attr_name: 'title',
    }, {
      attr_title: 'Email',
      attr_name: 'email',
    }, {
      attr_title: 'Authorizations',
      attr_name: 'authorizations',
    }, {
      attr_title: 'Last Updated Date',
      attr_name: 'updated_at',
    }],
    display_attr_names: ['title', 'email', 'authorizations', 'updated_at'],
  },
  list_view_options: {
    find_params: {__sort: 'name,email'},
  },
  sub_tree_view_options: {
    default_filter: ['Program', 'Control', 'Risk', 'Assessment'],
  },
  init: function () {
    let rEmail =
      /^[-!#$%&*+\\./0-9=?A-Z^_`{|}~]+@([-0-9A-Z]+\.)+([0-9A-Z]){2,4}$/i;
    this._super(...arguments);

    this.validateNonBlank('email');
    this.validateFormatOf('email', rEmail);
    this.validateNonBlank('name');
  },
}, {
  display_name: function () {
    return this.email;
  },
  autocomplete_label: function () {
    return this.name ?
      this.name + '<span class="url-link">' + this.email + '</span>' :
      this.email;
  },
  getWidgetCountForMyWorkPage: function () {
    let url = `/api/people/${this.attr('id')}/my_work_count`;
    const stopFn = tracker.start(
      tracker.FOCUS_AREAS.COUNTS,
      tracker.USER_JOURNEY_KEYS.API,
      tracker.USER_ACTIONS.API.COUNTS_MY_WORK);

    return $.get(url)
      .then((counts) => {
        stopFn();
        return counts;
      }, stopFn.bind(null, true));
  },
  getWidgetCountForAllObjectPage: function () {
    let url = `/api/people/${this.attr('id')}/all_objects_count`;
    const stopFn = tracker.start(
      tracker.FOCUS_AREAS.COUNTS,
      tracker.USER_JOURNEY_KEYS.API,
      tracker.USER_ACTIONS.API.COUNTS_ALL_OBJECTS);

    return $.get(url)
      .then((counts) => {
        stopFn();
        return counts;
      }, stopFn.bind(null, true));
  },
  getTasksCount: function () {
    let url = `/api/people/${this.attr('id')}/task_count`;
    const stopFn = tracker.start(
      tracker.FOCUS_AREAS.COUNTS,
      tracker.USER_JOURNEY_KEYS.API,
      tracker.USER_ACTIONS.API.TASKS_COUNT);

    return $.get(url)
      .then((counts) => {
        stopFn();
        return counts;
      })
      .fail(() => {
        stopFn(true);
        console.warn(`Request on '${url}' failed!`);
      });
  },
  getSnapshotsCount: function (id, data) {
    let url = `/api/audits/${id}/snapshot_counts`;
    const stopFn = tracker.start(
      tracker.FOCUS_AREAS.COUNTS,
      tracker.USER_JOURNEY_KEYS.API,
      tracker.USER_ACTIONS.API.SNAPSHOTS_COUNT);

    return $.post(url, data)
      .then((counts) => {
        stopFn();
        return counts;
      })
      .fail(() => {
        stopFn(true);
        console.warn(`Request on '${url}' failed!`);
      });
  },
});
