/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import './revision-log-data';
import '../paginate/paginate';
import {getRolesForType} from '../../plugins/utils/acl-utils';
import RefreshQueue from '../../models/refresh_queue';
import template from './revision-log.mustache';
import tracker from '../../tracker';
import {getHighestAssigneeRole} from '../../plugins/ggrc_utils';
import Revision from '../../models/service-models/revision';
import Person from '../../models/business-models/person';
import Stub from '../../models/stub';
import Mappings from '../../models/mappers/mappings';
import {formatDate} from '../../plugins/utils/date-utils';

const EMPTY_DIFF_VALUE = '—';

let _DATE_FIELDS = {
  created_at: 1,
  updated_at: 1,
  start_date: 1,
  end_date: 1,
  requested_on: 1,
  finished_date: 1,
  verified_date: 1,
};

let _LIST_FIELDS = {
  recipients: 1,
};
let _EMBED_MAPPINGS = {
  Assessment: ['Comment', 'Document'],
};

/**
 * A component that calculates and renders the given Model object's revision
 * history.
 */
export default can.Component.extend({
  tag: 'revision-log',
  template,
  leakScope: true,
  viewModel: {
    _LIST_FIELDS: _LIST_FIELDS,
    _DATE_FIELDS: _DATE_FIELDS,
    _EMBED_MAPPINGS: _EMBED_MAPPINGS,
    define: {
      changeHistory: {
        Value: can.List,
      },
      showFilter: {
        get() {
          return (this.attr('review.status') === 'Unreviewed') &&
            !!this.attr('review.last_reviewed_by');
        },
      },
    },
    instance: null,
    review: null,
    isLoading: true,
    personLoadingDfd: $.Deferred,
    fullHistory: [],
    showLastReviewUpdates: false,
    currentPage: 0,

    fetchItems: function () {
      const stopFn = tracker.start(
        this.attr('instance.type'),
        tracker.USER_JOURNEY_KEYS.LOADING,
        tracker.USER_ACTIONS.CHANGE_LOG);

      return this._fetchRevisionsData()
        .done(function (revisions) {
          let fullHistory;
          // calculate history of role changes
          this.attr('roleHistory',
            this._computeRoleChanges(revisions));

          // load not cached people
          this._loadACLPeople(revisions.object);

          // combine all the changes and sort them by date descending
          fullHistory = _([]).concat(
            can.makeArray(this._computeObjectChanges(revisions.object)),
            can.makeArray(this._computeMappingChanges(revisions.mappings)))
            .sortBy('updatedAt')
            .reverse()
            .value();
          this.attr('fullHistory', fullHistory);
          stopFn();
        }.bind(this))
        .fail(function () {
          stopFn(true);
          $('body').trigger(
            'ajax:flash',
            {error: 'Failed to fetch revision history data.'});
        })
        .always(function () {
          this.attr('isLoading', false);
        }.bind(this));
    },
    /**
     * Fetch the instance's Revisions data from the server, including the
     * Revisions of the instance's mappings.
     *
     * The `instance` here refers to the instance of an object currently being
     * handled by the component.
     *
     * @return {$.Deferred} - an object representing the async operation of
     *   fetching the data from the server. On success it is resolved with an
     *   object containing the following Revision data, order by date from
     *   oldest to newest:
     *   - {Array} object - the list of Revisions of the instance itself,
     *   - {Array} mappings - the list of Revisions of all the instance's
     *      mappings
     */
    _fetchRevisionsData: function () {
      let findAll = function (attr) {
        let query = {__sort: 'updated_at'};
        query[attr + '_type'] = this.attr('instance.type');
        query[attr + '_id'] = this.attr('instance.id');
        return Revision.findAll(query);
      }.bind(this);

      return $.when(
        findAll('resource'), findAll('source'), findAll('destination')
      ).then(function (objRevisions, mappingsSrc, mappingsDest) {
        // manually include people for modified_by since using __include would
        // result in a lot of duplication
        let rq = new RefreshQueue();
        _.forEach(objRevisions.concat(mappingsSrc, mappingsDest),
          function (revision) {
            if (revision.modified_by) {
              rq.enqueue(revision.modified_by);
            }
          });
        _.forEach(mappingsSrc, function (revision) {
          if (revision.destination_type && revision.destination_id) {
            revision.destination = new Stub({
              id: revision.destination_id,
              type: revision.destination_type,
            });
            rq.enqueue(revision.destination);
          }
        });
        _.forEach(mappingsDest, function (revision) {
          if (revision.source_type && revision.source_id) {
            revision.source = new Stub({
              id: revision.source_id,
              type: revision.source_type,
            });
            rq.enqueue(revision.source);
          }
        });
        return this._fetchEmbeddedRevisionData(rq.objects, rq)
          .then(function (embedded) {
            return rq.trigger().then(function () {
              let reify = function (revision) {
                _.forEach(['modified_by', 'source', 'destination'],
                  function (field) {
                    if (revision[field] && revision[field].reify) {
                      revision.attr(field, revision[field].reify());
                    }
                  });
                return revision;
              };
              let mappings = mappingsSrc.concat(mappingsDest, embedded);
              return {
                object: _.map(objRevisions, reify),
                mappings: _.map(mappings, reify),
              };
            });
          });
      }.bind(this));
    },
    /**
     * Fetch revisions of indirect mappings.
     *
     * @param {Array} mappedObjects - the list of object instances to fetch
     *   mappings to (objects mapped to the current instance).
     *
     * @param {RefreshQueue} rq - current refresh queue to use for fetching
     *   full objects.
     *
     * @return {Deferred} - A deferred that will resolve into a array of
     *   revisons of the indirect mappings.
     */
    _fetchEmbeddedRevisionData: function (mappedObjects, rq) {
      let instance = this.attr('instance');
      let id = this.attr('instance.id');
      let type = this.attr('instance.type');
      let filterElegible = function (obj) {
        return _.includes(this.attr('_EMBED_MAPPINGS')[type], obj.type);
      }.bind(this);
      let dfds;

      function fetchRevisions(obj) {
        return [
          Revision.findAll({
            source_type: obj.type,
            source_id: obj.id,
            __sort: 'updated_at',
          }).then(function (revisions) {
            return _.map(revisions, function (revision) {
              revision = new can.Map(revision.serialize());
              revision.attr({
                updated_at: new Date(revision.updated_at),
                source_type: type,
                source_id: id,
                source: instance,
                destination: new Stub({
                  type: revision.destination_type,
                  id: revision.destination_id,
                }),
              });
              rq.enqueue(revision.destination);
              return revision;
            });
          }),
          Revision.findAll({
            destination_type: obj.type,
            destination_id: obj.id,
            __sort: 'updated_at',
          }).then(function (revisions) {
            return _.map(revisions, function (revision) {
              revision = new can.Map(revision.serialize());
              revision.attr({
                updated_at: new Date(revision.updated_at),
                destination_type: type,
                destination_id: id,
                destination: instance,
                source: new Stub({
                  type: revision.source_type,
                  id: revision.source_id,
                }),
              });
              rq.enqueue(revision.source);
              return revision;
            });
          }),
        ];
      }

      dfds = _.chain(mappedObjects).filter(filterElegible)
        .map(fetchRevisions)
        .flatten()
        .value();
      return $.when(...dfds).then(function () {
        return _.filter(_.flatten(arguments), function (revision) {
          // revisions where source == destination will be introduced when
          // spoofing the obj <-> instance mapping
          return revision.source.href !== revision.destination.href;
        });
      });
    },
    /**
     * Compute the the history of object changes from a list of Revisions.
     *
     * The computed list of changes is sorted from oldest to newest (the method
     * assumes that the `revisions` list is also sorted chronologically with
     * the oldest Revision placed first).
     *
     *
     * @param {Array} revisions - the list of revisions of the instance
     *   being handled by the component, sorted from oldest to newest.
     *
     * @return {Array} - the history of changes to the instance. Each
     *   element follows the format returned by the `_objectChangeDiff` method.
     */
    _computeObjectChanges: function (revisions) {
      let diffList = _.map(revisions, function (revision, i) {
        // default to empty revision
        let prev = revisions[i - 1] || {content: {}};
        return this._objectChangeDiff(prev, revision);
      }.bind(this));
      return _.filter(diffList, 'changes.length');
    },
    /**
     * Compare 2 arrays by property name
     *
     * @param {Array} arr1 - access_control_list
     *
     * @param {Array} arr2 - access_control_list
     *
     * @param {string} propName - property name for compare
     *
     * @return {Boolean} - arrays is equal.
     */
    _isEqualArrays: function (arr1, arr2, propName) {
      let diffArray;
      if (arr1.length === 0 && arr2.length === 0) {
        return true;
      }

      if (arr1.length !== arr2.length) {
        return false;
      }

      diffArray = arr1.filter((item1) =>
        _.findIndex(arr2, (item2) =>
          item1[propName] === item2[propName]) === -1
      );

      return !diffArray.length;
    },
    /**
     * Load to cache people from access control list
     *
     * @param {Object} revisions - list of revisions
     */
    _loadACLPeople: function (revisions) {
      const refreshQueue = new RefreshQueue();

      revisions.forEach((revision) => {
        if (!revision.content || !revision.content.access_control_list) {
          return;
        }

        revision.content.access_control_list.forEach((aclItem) => {
          if (!Person.findInCacheById(aclItem.person.id)) {
            refreshQueue.enqueue(aclItem.person);
          }
        });
      });

      if (refreshQueue.objects.length) {
        this.attr('personLoadingDfd', refreshQueue.trigger());
      } else {
        this.attr('personLoadingDfd', $.Deferred().resolve());
      }
    },
    /**
     * Build list of users emails
     *
     * @param {Array} people - list of people
     *
     * @return {Array} - array of people emails or empty value.
     */
    _buildPeopleEmails: function (people) {
      const peopleList = people.map((person) =>
        Person.findInCacheById(person.id) ?
          Person.findInCacheById(person.id).email :
          ''
      );

      return peopleList.length ? peopleList : [EMPTY_DIFF_VALUE];
    },
    /**
     * Get people list from access_contro_list by role
     *
     * @param {Object} role - access_control_role object
     *
     * @param {Object} revisionContent - content of current revision
     *
     * @return {Array} - array of people.
     */
    _getPeopleForRole: function (role, revisionContent) {
      if (!revisionContent.access_control_list) {
        return [];
      }

      return revisionContent.access_control_list
        .filter((item) => item.ac_role_id === role.id)
        .map((item) => item.person);
    },
    /**
     * A helper function for computing the difference between the two Revisions
     * of an access_control_list.
     * @param {Revision} rev1 - the older of the two revisions
     * @param {Revision} rev2 - the newer of the two revisions
     *
     * @return {Array} - A list of objects describing the modified attributes of the
     * instance's access_control_list, with each object having the following attributes:
     *  - fieldName: the name of the changed custom role
     *  - origVal: the attribute's original value
     *  - newVal: the attribute's new (modified) value
     *  - isLoading: the flag describing load state of people from access_control_list
     *  - isRole: the flag describing that diff related to access_control_list
     */
    _accessControlListDiff: function (rev1, rev2) {
      const rev1content = rev1.content;
      const rev2content = rev2.content;
      let diff = [];
      let roles;

      if (!this.attr('instance.type')) {
        return [];
      }

      roles = getRolesForType(this.attr('instance.type'));

      roles.forEach((role) => {
        let rev1people = this._getPeopleForRole(role, rev1content);
        let rev2people = this._getPeopleForRole(role, rev2content);
        let roleDiff;

        if (!this._isEqualArrays(rev1people, rev2people, 'id')) {
          roleDiff = new can.Map({
            fieldName: role.name,
            origVal: [],
            newVal: [],
            isLoading: true,
            isRole: true,
          });

          this.attr('personLoadingDfd').then(() => {
            roleDiff.attr('origVal', this._buildPeopleEmails(rev1people));
            roleDiff.attr('newVal', this._buildPeopleEmails(rev2people));
            roleDiff.attr('isLoading', false);
          });

          diff.push(roleDiff);
        }
      });

      return diff;
    },
    /**
     * A helper function for computing the difference between the two Revisions
     * of an object.
     *
     * The function assumes that the given revisions are two distinct Revisions
     * of the same object (application entity).
     *
     * NOTE: The object fields that do not have a user-friendly alias defined are
     * considered 'internal', and are thus not included in the resulting diff
     * objects, because they are not meant to be shown to the end user.
     *
     * @param {Revision} rev1 - the older of the two revisions
     * @param {Revision} rev2 - the newer of the two revisions
     *
     * @return {Object} - A 'diff' object describing the changes between the
     *   revisions. The object has the following attributes:
     *   - madeBy: the user who made the changes
     *   - updatedAt: the time when the changes have been made
     *   - role: highest role at the time of change
     *   - changes:
     *       A list of objects describing the modified attributes of the
     *       instance`, with each object having the following attributes:
     *         - fieldName: the name of the changed`instance` attribute
     *         - origVal: the attribute's original value
     *         - newVal: the attribute's new (modified) value
     */
    _objectChangeDiff: function (rev1, rev2) {
      let diff = {
        madeBy: null,
        updatedAt: null,
        changes: [],
        role: null,
      };
      let attrDefs = GGRC.model_attr_defs[rev2.resource_type];
      let madeByPersonId = rev2.modified_by ? rev2.modified_by.id : null;

      diff.madeBy = rev2.modified_by;
      diff.updatedAt = rev2.updated_at;
      diff.role = this._getRoleAtTime(madeByPersonId, rev2.updated_at);

      _.forEach(rev2.content, function (value, fieldName) {
        let origVal = rev1.content[fieldName];
        let displayName;
        let unifyValue = function (value) {
          value = value || EMPTY_DIFF_VALUE;
          value = value.length ? value : EMPTY_DIFF_VALUE;
          if (_.isObject(value)) {
            value = value.map(function (item) {
              return item.display_name;
            });
          }
          return value;
        };
        if (attrDefs) {
          displayName = (_.find(attrDefs, function (attr) {
            return attr.attr_name === fieldName;
          }) || {}).display_name;
        } else {
          displayName = fieldName;
        }

        if (displayName && value !== origVal) {
          // format date fields
          if (this.attr('_DATE_FIELDS')[fieldName]) {
            if (value) {
              value = formatDate(value, true);
            }
            if (origVal) {
              origVal = formatDate(origVal, true);
            }
          }
          if (this.attr('_LIST_FIELDS')[fieldName]) {
            if (value) {
              value = _(value).splitTrim(',').sort().compact().join(', ');
            }
            if (origVal) {
              origVal = _(origVal).splitTrim(',').sort().compact().join(', ');
            }
          }
          if (origVal || value) {
            origVal = unifyValue(origVal);
            value = unifyValue(value);
            let isDifferent = false;
            if (_.isObject(origVal) && _.isObject(value)) {
              isDifferent = !_.isEqual(_.sortBy(origVal), _.sortBy(value));
            } else {
              isDifferent = origVal !== value;
            }

            if (isDifferent) {
              diff.changes.push({
                fieldName: displayName,
                origVal: origVal,
                newVal: value,
              });

              if (fieldName === 'review_status') {
                diff.reviewWasChanged = value.toLowerCase();
              }
            }
          }
        }
      }.bind(this));
      diff.changes = diff.changes.concat(
        this._accessControlListDiff(rev1, rev2)
      );
      diff.changes = diff.changes.concat(
        this._objectCADiff(
          rev1.content.custom_attribute_values,
          rev1.content.custom_attribute_definitions,
          rev2.content.custom_attribute_values,
          rev2.content.custom_attribute_definitions));
      return diff;
    },
    _objectCADiff: function (origValues, origDefs, newValues, newDefs) {
      let ids;
      let defs;
      let showValue = function (value, def) {
        let obj;
        switch (def.attribute_type) {
          case 'Checkbox':
            return _.flow(Number, Boolean)(value.attribute_value)
              ? '✓'
              : undefined;
          case 'Map:Person':
            if (!value.attribute_object) {
              return;
            }
            obj = Person
              .findInCacheById(value.attribute_object_id);
            if (obj === undefined) {
              return value.attribute_value;
            }
            return obj.name || obj.email || value.attribute_value;
          case 'Date':
            if (!value.attribute_value) {
              return value.attribute_value;
            }
            return formatDate(value.attribute_value, true);
          default:
            return value.attribute_value;
        }
      };

      origValues = _.keyBy(origValues, 'custom_attribute_id');
      origDefs = _.keyBy(origDefs, 'id');
      newValues = _.keyBy(newValues, 'custom_attribute_id');
      newDefs = _.keyBy(newDefs, 'id');

      ids = _.uniq(_.keys(origValues).concat(_.keys(newValues)));
      defs = _.merge(origDefs, newDefs);

      return _.chain(ids)
        .filter((id) => !!defs[id])
        .map((id) => {
          const def = defs[id];
          const diff = {
            fieldName: def.title,
            origVal:
              showValue(origValues[id] || {}, def) || EMPTY_DIFF_VALUE,
            newVal:
              showValue(newValues[id] || {}, def) || EMPTY_DIFF_VALUE,
          };
          if (diff.origVal === diff.newVal) {
            return undefined;
          }
          return diff;
        })
        .filter()
        .value();
    },
    /**
     * Compute the instance's object mapping-related changes from the list of
     * mapping revisions.
     *
     * @param {Array} revisions - the list of instance mappings' revision
     *   history, sorted from oldest to newest.
     *
     * @return {Array} - the history of instance mappings' changes. Each
     *   element follows the format returned by the `_mappingChange` helper
     *   method.
     */
    _computeMappingChanges: function (revisions) {
      let chains = _.chain(revisions)
        .groupBy('resource_id')
        .mapValues(function (chain) {
          return _.sortBy(chain, 'updated_at');
        }).value();
      return _.map(revisions, function (revision) {
        return this._mappingChange(revision, chains[revision.resource_id]);
      }.bind(this));
    },
    /**
     * A helper function for extracting the mapping change information from a
     * Revision object.
     *
     * @param {Revision} revision - a Revision object describing a
     *   mapping between the object instance the component is handling, and an
     *   external object
     *
     * @param {Array} chain - revisions of the same resource ordered
     *   chronologically
     *
     * @return {Object} - A 'change' object describing a single modification
     *   of a mapping. The object has the following attributes:
     *   - madeBy: the user who made the changes
     *   - updatedAt: the time when the changes have been made
     *   - role: highest role at the time of change
     *   - changes:
     *       A list of objects describing the modified attributes of the
     *       instance`, with each object having the following attributes:
     *         - fieldName: the name of the changed`instance` attribute
     *         - origVal: the attribute's original value
     *         - newVal: the attribute's new (modified) value
     */
    _mappingChange: function (revision, chain) {
      let object;
      let displayName;
      let displayType;
      let fieldName;
      let origVal;
      let newVal;
      let previous;
      let madeByPersonId;

      if (revision.destination_type === this.attr('instance.type') &&
        revision.destination_id === this.attr('instance.id')) {
        object = revision.source;
      } else {
        object = revision.destination;
      }

      if (object instanceof Stub) {
        object = object.reify();
      }

      displayName = object.display_name() || object.description;
      displayType = object.display_type() || object.type;

      fieldName = 'Mapping to ' + displayType + ': ' + displayName;
      origVal = EMPTY_DIFF_VALUE;
      newVal = _.capitalize(revision.action);
      previous = chain[_.findIndex(chain, revision) - 1];
      if (revision.action !== 'deleted' &&
        _.exists(revision.content, 'attrs.AssigneeType')) {
        newVal = revision.content.attrs.AssigneeType;
      }
      if (_.exists(previous, 'content.attrs.AssigneeType')) {
        origVal = previous.content.attrs.AssigneeType;
      } else if (revision.action === 'deleted') {
        origVal = 'Created';
      }
      madeByPersonId = revision.modified_by ? revision.modified_by.id : null;

      return {
        madeBy: revision.modified_by,
        updatedAt: revision.updated_at,
        role: this._getRoleAtTime(madeByPersonId, revision.updated_at),
        changes: {
          origVal: origVal,
          newVal: newVal,
          fieldName: fieldName,
        },
      };
    },
    /**
     * Calculate each person's role history.
     *
     * It groups together all people mapping changes and for each change
     * gets the highest role at the time of change.
     *
     * If however the revision history isn't complete (they don't start with
     * "created" action, e.g. old assessments) it then adds "no role" to the
     * start of person's history.
     *
     * If we don't have any revisions to person mappings but they are
     * currently an assignee, we select the highest current role.
     *
     * If user has no role and was not or is not an assignee, we just add a
     * single role change ("no role").
     *
     * @param {Revision} revisions - a Revision object describing a
     *   mapping between the object instance the component is handling, and an
     *   external object
     *
     * @return {Object} - An object containing user IDs as keys and person's
     *   role history through time ordered in increasing order.
     */
    _computeRoleChanges: function (revisions) {
      let mappings = _.sortBy(revisions.mappings, 'updated_at');
      let instance = this.attr('instance');
      let assigneeList = this.attr('instance.class.assignable_list');
      let perPersonMappings;
      let perPersonRoleHistory;
      let modifiers;
      let currentAssignees;
      let assigneeRoles;
      let unmodifiedAssignees;
      let unassignedPeople;

      perPersonMappings = _(mappings)
        .filter(function (rev) {
          if (rev.source_type === 'Person' ||
            rev.destination_type === 'Person') {
            return rev;
          }
        })
        .groupBy(function (rev) {
          if (rev.source_type === 'Person') {
            return rev.source_id;
          }
          return rev.destination_id;
        })
        .value();

      perPersonRoleHistory = _.fromPairs(
        _.map(perPersonMappings, function (revisions, pid) {
          let history = _.map(revisions, function (rev) {
            // Add extra check to fix possible issue with inconsistent data
            if (rev.action === 'deleted' || !rev.content.attrs ||
                !rev.content.attrs.AssigneeType) {
              return {
                updated_at: rev.updated_at,
                role: 'none',
              };
            }
            return {
              updated_at: rev.updated_at,
              role: getHighestAssigneeRole(
                instance,
                rev.content.attrs.AssigneeType.split(',')),
            };
          });

          if (revisions[0].action !== 'created') {
            history.unshift({
              role: 'none',
              updated_at: instance.created_at,
            });
          }
          return [pid, history];
        }));

      modifiers = _.uniq(
        _.map(
          _.union(
            revisions.object,
            revisions.mappings),
          'modified_by.id')).map(String);

      currentAssignees = _.groupBy(
        _.flattenDeep(_.map(assigneeList, function (assignableType) {
          return _.map(
            Mappings.getBinding(assignableType.mapping, instance).list,
            function (person) {
              return {
                id: person.instance.id,
                type: assignableType.type,
              };
            });
        })), 'id');

      assigneeRoles = _.fromPairs(
        _.map(currentAssignees, function (rolePeople, pid) {
          return [pid, _.map(rolePeople, 'type')];
        }));

      unmodifiedAssignees = _.difference(
        _.keys(assigneeRoles), _.keys(perPersonRoleHistory));

      _.forEach(unmodifiedAssignees, function (pid) {
        let existingRoles = assigneeRoles[pid];
        let role = getHighestAssigneeRole(
          instance, existingRoles);
        perPersonRoleHistory[pid] = [{
          updated_at: instance.created_at,
          role: role,
        }];
      });

      unassignedPeople = _.difference(
        modifiers, _.keys(perPersonRoleHistory));

      _.forEach(unassignedPeople, function (pid) {
        perPersonRoleHistory[pid] = [{
          updated_at: instance.created_at,
          role: 'none',
        }];
      });

      return perPersonRoleHistory;
    },
    /**
     * A function to return person's highest role at a certain time
     *
     * @param {String|Number} personId - Person ID
     * @param {Date|Number} timePoint - Time of change
     * @return {String} - Lowercase role string
     */
    _getRoleAtTime: function (personId, timePoint) {
      let personHistory = this.attr('roleHistory')[personId] || [];
      let role = _.last(_.takeWhile(personHistory, function (roleChange) {
        let updateAt = new Date(roleChange.updated_at).getTime();
        timePoint = new Date(timePoint).getTime();
        return updateAt <= timePoint;
      }));
      if (role) {
        return role.role;
      }
      return 'none';
    },
    changeLastUpdatesFilter(element) {
      const isChecked = element.checked;

      this.showRevisionsHistory(isChecked);
    },
    showRevisionsHistory(showLastReviewUpdates) {
      this.attr('currentPage', 0);

      if (showLastReviewUpdates) {
        this.showFilteredHistory();
      } else {
        this.showFullHistory();
      }
    },
    showFilteredHistory() {
      const fullHistory = this.attr('fullHistory');
      const index = _.findIndex(fullHistory, (revision) =>
        revision.reviewWasChanged === 'reviewed');
      const filteredData = fullHistory.slice(0, index + 1);

      this.attr('changeHistory', filteredData);
    },
    showFullHistory() {
      const fullHistory = this.attr('fullHistory');
      this.attr('changeHistory', fullHistory);
    },
    getLastUpdatesFlag() {
      return this.attr('showFilter') &&
        this.attr('review').getShowLastReviewUpdates();
    },
    resetLastUpdatesFlag() {
      const review = this.attr('review');

      if (review) {
        review.setShowLastReviewUpdates(false);
      }
    },
    initObjectReview() {
      const review = this.attr('instance.review');

      if (review) {
        this.attr('review', review.reify());
      }
    },
  },
  /**
   * The component's entry point. Invoked when a new component instance has
   * been created.
   */
  init: function () {
    const viewModel = this.viewModel;

    viewModel.initObjectReview();

    const showLastUpdates = viewModel.getLastUpdatesFlag();
    viewModel.attr('showLastReviewUpdates', showLastUpdates);

    viewModel.fetchItems()
      .then(() => {
        viewModel.showRevisionsHistory(showLastUpdates);
        viewModel.resetLastUpdatesFlag();
      });
  },
  events: {
    '{viewModel.instance} refreshInstance': function () {
      this.viewModel.fetchItems();
    },
  },
});
