/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {ROLES_CONFLICT} from '../../events/eventTypes';
import {getRolesForType} from '../../plugins/utils/acl-utils';

export default can.Component.extend({
  tag: 'related-people-access-control',
  leakScope: true,
  viewModel: {
    instance: {},
    deferredSave: null,
    includeRoles: [],
    groups: [],
    updatableGroupId: null,
    isNewInstance: false,
    excludeRoles: [],
    conflictRoles: [],
    orderOfRoles: [],
    hasConflicts: false,
    readOnly: false,
    singleUserRoles: Object.freeze({
      Assignee: true,
      Verifier: true,
    }),

    updateRoles: function (args) {
      if (this.attr('deferredSave')) {
        this.attr('deferredSave').push(this.performUpdate.bind(this, args));
      }
      this.performUpdate(args);

      this.dispatch({
        type: 'saveCustomRole',
        groupId: args.roleId,
      });
    },
    performUpdate: function (args) {
      this.updateAccessControlList(args.people, args.roleId);

      if (this.attr('conflictRoles').length) {
        this.checkConflicts(args.roleTitle);
      }
    },
    updateAccessControlList: function (people, roleId) {
      let instance = this.attr('instance');

      // get people without current role
      let listWithoutRole = instance
        .attr('access_control_list').filter(function (item) {
          return item.ac_role_id !== roleId;
        });

      // push update people with current role
      people.forEach(function (person) {
        listWithoutRole.push({
          ac_role_id: roleId,
          person: {id: person.id, type: 'Person'},
        });
      });

      instance.attr('access_control_list')
        .replace(listWithoutRole);
    },

    checkConflicts: function (groupTitle) {
      let groups = this.attr('groups');
      let conflictRoles = this.attr('conflictRoles');
      let hasConflict = false;

      if (groupTitle && conflictRoles.indexOf(groupTitle) === -1) {
        return;
      }

      hasConflict = groupTitle ?
        this.isCurrentGroupHasConflict(groupTitle, groups, conflictRoles) :
        this.isGroupsHasConflict(groups, conflictRoles);

      this.attr('hasConflicts', hasConflict);
      this.attr('instance').dispatch({
        ...ROLES_CONFLICT,
        rolesConflict: hasConflict,
      });
    },
    isGroupsHasConflict: function (groups, conflictRoles) {
      let hasConflict = false;

      let conflictGroups = groups
        .filter((group) => _.indexOf(conflictRoles, group.title) > -1);

      conflictGroups.forEach((conflictGroup) => {
        let otherConflictGroups = conflictGroups
          .filter((group) => group.groupId !== conflictGroup.groupId);

        // compare people from current group (conflictGroup)
        // with each other group (otherConflictGroups)
        otherConflictGroups.forEach((group) => {
          // get 2 people ids arrays
          let peopleIds = [conflictGroup, group]
            .map((group) => group.people)
            .map((people) => people.map((person) => person.id));

          hasConflict = !!_.intersection(...peopleIds).length;
        });
      });

      return hasConflict;
    },
    isCurrentGroupHasConflict: function (groupTitle, groups, conflictRoles) {
      let hasConflict = false;

      // get people IDs from conflict groups except current group
      let peopleIds = groups
        .filter((group) => groupTitle !== group.title &&
          _.indexOf(conflictRoles, group.title) > -1)
        .map((group) => group.people)
        .map((people) => people.map((person) => person.id));

      // get people IDs from current conflict group
      let currentGroupPeopleIds = groups
        .filter((group) => groupTitle === group.title)
        .map((group) => group.people)
        .map((people) => people.map((person) => person.id))[0];

      peopleIds.forEach((peopleGroupIds) => {
        if (_.intersection(peopleGroupIds, currentGroupPeopleIds).length) {
          hasConflict = true;
        }
      });

      return hasConflict;
    },
    buildGroups: function (role, roleAssignments) {
      let includeRoles = this.attr('includeRoles');
      let groupId = role.id;
      let title = role.name;
      let group;
      let people;
      let singleUserRole = this.singleUserRoles[title] ? true : false;

      if (includeRoles.length && includeRoles.indexOf(title) === -1) {
        return;
      }

      group = roleAssignments[groupId];
      people = group ?
        group.map(function (groupItem) {
          return {
            id: groupItem.person.id,
            email: groupItem.person_email,
            name: groupItem.person_name,
            type: 'Person',
          };
        }) :
        [];

      return {
        title: title,
        groupId: groupId,
        people: people,
        required: role.mandatory,
        singleUserRole: singleUserRole,
      };
    },
    filterByIncludeExclude: function (includeRoles, excludeRoles) {
      const instance = this.attr('instance');
      const objectRoles = getRolesForType(instance.class.model_singular);

      return objectRoles.filter((item) => {
        return _.indexOf(includeRoles, item.name) > -1 &&
          _.indexOf(excludeRoles, item.name) === -1;
      });
    },
    filterByInclude: function (includeRoles) {
      const instance = this.attr('instance');
      const objectRoles = getRolesForType(instance.class.model_singular);

      return objectRoles.filter((item) =>
        _.indexOf(includeRoles, item.name) > -1);
    },
    filterByExclude: function (excludeRoles) {
      const instance = this.attr('instance');
      const objectRoles = getRolesForType(instance.class.model_singular);

      return objectRoles.filter((item) =>
        _.indexOf(excludeRoles, item.name) === -1);
    },
    getFilteredRoles: function () {
      const instance = this.attr('instance');
      const includeRoles = this.attr('includeRoles');
      const excludeRoles = this.attr('excludeRoles');
      let roles;

      if (includeRoles.length && excludeRoles.length) {
        roles = this.filterByIncludeExclude(includeRoles, excludeRoles);
      } else if (includeRoles.length) {
        roles = this.filterByInclude(includeRoles);
      } else if (excludeRoles.length) {
        roles = this.filterByExclude(excludeRoles);
      } else {
        roles = getRolesForType(instance.class.model_singular);
      }

      return roles;
    },
    setGroupOrder: function (groups, orderOfRoles) {
      if (!Array.isArray(orderOfRoles)) {
        return groups;
      }

      orderOfRoles.forEach(function (roleName, index) {
        let roleIndex = _.findIndex(groups, {title: roleName});
        let group;
        let firstGroup;

        if (roleIndex === -1 || roleIndex === index) {
          return;
        }

        group = groups[roleIndex];
        firstGroup = groups[index];

        groups[index] = group;
        groups[roleIndex] = firstGroup;
      });

      return groups;
    },
    getRoleList: function () {
      let roleAssignments;
      let roles;
      let groups;
      let instance = this.attr('instance');

      if (!instance) {
        this.attr('rolesInfo', []);
        return;
      }

      roleAssignments = _.groupBy(instance
        .attr('access_control_list'), 'ac_role_id');

      roles = this.getFilteredRoles();

      groups = _.map(roles, function (role) {
        return this.buildGroups(role, roleAssignments);
      }.bind(this))
        .filter(function (group) {
          return typeof group !== 'undefined';
        })
        // sort by required
        .sort(function (a, b) {
          if (a.required === b.required) {
            return 0;
          }

          return a.required ? -1 : 1;
        });

      if (this.attr('orderOfRoles.length')) {
        groups = this.setGroupOrder(groups, this.attr('orderOfRoles').attr());
      }

      return groups;
    },
  },
  events: {
    refreshGroups: function () {
      this.viewModel.attr('groups',
        this.viewModel.getRoleList());
    },
    setupGroups() {
      this.refreshGroups();
      this.viewModel.checkConflicts();
    },
    inserted: 'setupGroups',
    '{viewModel.instance} updated': 'setupGroups',
    '{viewModel} instance': 'refreshGroups',
  },
});
