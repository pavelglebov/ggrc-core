/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../controls-toolbar/controls-toolbar';
import '../assessment-local-ca';
import '../assessment-custom-attributes';
import '../assessment-people';
import '../assessment-object-type-dropdown';
import '../attach-button';
import '../info-pane-save-status';
import '../../comment/comment-add-form';
import '../../comment/mapped-comments';
import '../mapped-objects/mapped-controls';
import '../../assessment/map-button-using-assessment-type';
import '../../ca-object/ca-object-modal-content';
import '../../comment/comment-add-form';
import '../../custom-attributes/custom-attributes';
import '../../custom-attributes/custom-attributes-field';
import '../../custom-attributes/custom-attributes-status';
import '../../prev-next-buttons/prev-next-buttons';
import '../../inline/inline-form-control';
import '../../object-change-state/object-change-state';
import '../../related-objects/related-assessments';
import '../../related-objects/related-issues';
import '../../issue-tracker/issue-tracker-switcher';
import './ticket-id-checker';
import '../../object-list-item/editable-document-object-list-item';
import '../../object-state-toolbar/object-state-toolbar';
import '../../loading/loading-status';
import './info-pane-issue-tracker-fields';
import '../../tabs/tab-container';
import './inline-item';
import './create-url';
import './confirm-edit-action';
import '../../multi-select-label/multi-select-label';
import {
  buildParam,
  batchRequests,
} from '../../../plugins/utils/query-api-utils';
import {
  getCustomAttributes,
  getLCAPopupTitle,
  CUSTOM_ATTRIBUTE_TYPE as CA_UTILS_CA_TYPE,
  convertValuesToFormFields,
} from '../../../plugins/utils/ca-utils';
import {getRole} from '../../../plugins/utils/acl-utils';
import DeferredTransaction from '../../../plugins/utils/deferred-transaction-utils';
import tracker from '../../../tracker';
import {REFRESH_TAB_CONTENT,
  RELATED_ITEMS_LOADED,
  REFRESH_MAPPING,
  REFRESH_RELATED,
} from '../../../events/eventTypes';
import Permission from '../../../permission';
import {
  getPageInstance,
} from '../../../plugins/utils/current-page-utils';
import {initCounts} from '../../../plugins/utils/widgets-utils';
import template from './info-pane.mustache';
import {CUSTOM_ATTRIBUTE_TYPE} from '../../../plugins/utils/custom-attribute/custom-attribute-config';
import pubsub from '../../../pub-sub';
import {relatedAssessmentsTypes} from '../../../plugins/utils/models-utils';
import {notifier, notifierXHR} from '../../../plugins/utils/notifiers-utils';
import Evidence from '../../../models/business-models/evidence';
import * as businessModels from '../../../models/business-models';

const editableStatuses = ['Not Started', 'In Progress', 'Rework Needed'];

/**
 * Assessment Specific Info Pane View Component
 */
export default can.Component.extend({
  tag: 'assessment-info-pane',
  template: template,
  leakScope: true,
  viewModel: {
    define: {
      verifiers: {
        get: function () {
          let acl = this.attr('instance.access_control_list');
          let verifierRoleId = this.attr('_verifierRoleId');
          let verifiers;

          if (!verifierRoleId) {
            return [];
          }

          verifiers = acl
            .filter((item) =>
              String(item.ac_role_id) === String(verifierRoleId)
            ).map(
              // Getter of 'verifiers' is called when access_control_list(ACL) length
              // is changed or object itself is changed.
              // When we save new ACL, after getting response from BE,
              // order of items in ACL can differ from original. In this case
              // verifiers won't be recalculated and we can get invalid list
              // after merging ACL data which we get from BE.
              // To prevent this we returns copies of persons which won't be modified
              // in scenario described above.
              ({person}) => ({
                id: person.id,
                type: person.type,
              }));

          return verifiers;
        },
      },
      showProcedureSection: {
        get: function () {
          return this.instance.attr('test_plan') ||
            this.instance.attr('issue_tracker.issue_url');
        },
      },
      isLoading: {
        type: 'boolean',
        value: false,
      },
      mappedSnapshots: {
        Value: can.List,
      },
      assessmentTypeNameSingular: {
        get: function () {
          let type = this.attr('instance.assessment_type');
          return businessModels[type].title_singular;
        },
      },
      assessmentTypeNamePlural: {
        get: function () {
          let type = this.attr('instance.assessment_type');
          return businessModels[type].title_plural;
        },
      },
      assessmentTypeObjects: {
        get: function () {
          let self = this;
          return this.attr('mappedSnapshots')
            .filter(function (item) {
              return item.child_type === self
                .attr('instance.assessment_type');
            });
        },
      },
      relatedInformation: {
        get: function () {
          let self = this;
          return this.attr('mappedSnapshots')
            .filter(function (item) {
              return item.child_type !== self
                .attr('instance.assessment_type');
            });
        },
      },
      comments: {
        Value: can.List,
      },
      urls: {
        Value: can.List,
      },
      files: {
        Value: can.List,
      },
      editMode: {
        type: 'boolean',
        get: function () {
          let status = this.attr('instance.status');

          return !this.attr('instance.archived') &&
            editableStatuses.includes(status);
        },
        set: function () {
          this.onStateChange({state: 'In Progress', undo: false});
        },
      },
      isEditDenied: {
        get: function () {
          return !Permission
            .is_allowed_for('update', this.attr('instance')) ||
            this.attr('instance.archived');
        },
      },
      isAllowedToMap: {
        get: function () {
          let audit = this.attr('instance.audit');
          return !!audit && Permission.is_allowed_for('read', audit);
        },
      },
      instance: {},
      isInfoPaneSaving: {
        get: function () {
          if (this.attr('isUpdatingRelatedItems')) {
            return false;
          }

          return this.attr('isUpdatingFiles') ||
            this.attr('isUpdatingState') ||
            this.attr('isUpdatingEvidences') ||
            this.attr('isUpdatingUrls') ||
            this.attr('isUpdatingComments') ||
            this.attr('isAssessmentSaving');
        },
      },
    },
    modal: {
      state: {
        open: false,
      },
    },
    pubsub,
    _verifierRoleId: undefined,
    isUpdatingRelatedItems: false,
    isUpdatingState: false,
    isAssessmentSaving: false,
    onStateChangeDfd: {},
    formState: {},
    noItemsText: '',
    initialState: 'Not Started',
    deprecatedState: 'Deprecated',
    assessmentMainRoles: ['Creators', 'Assignees', 'Verifiers'],
    refreshCounts: function (types) {
      let pageInstance = getPageInstance();
      initCounts(
        types,
        pageInstance.attr('type'),
        pageInstance.attr('id')
      );
    },
    setUrlEditMode: function (value, type) {
      this.attr(type + 'EditMode', value);
    },
    setInProgressState: function () {
      this.onStateChange({state: 'In Progress', undo: false});
    },
    getQuery: function (type, sortObj, additionalFilter) {
      let relevantFilters = [{
        type: this.attr('instance.type'),
        id: this.attr('instance.id'),
        operation: 'relevant',
      }];
      return buildParam(type,
        sortObj || {},
        relevantFilters,
        [],
        additionalFilter || []);
    },
    getSnapshotQuery: function () {
      return this.getQuery('Snapshot');
    },
    getEvidenceQuery: function (kind) {
      let query = this.getQuery(
        'Evidence',
        {sort: [{key: 'created_at', direction: 'desc'}]},
        this.getEvidenceAdditionFilter(kind));
      return query;
    },
    requestQuery: function (query, type) {
      let dfd = $.Deferred();
      type = type || '';
      this.attr('isUpdating' + can.capitalize(type), true);

      batchRequests(query)
        .done(function (response) {
          let type = Object.keys(response)[0];
          let values = response[type].values;
          dfd.resolve(values);
        })
        .fail(function () {
          dfd.resolve([]);
        })
        .always(function () {
          this.attr('isUpdating' + can.capitalize(type), false);

          tracker.stop(this.attr('instance.type'),
            tracker.USER_JOURNEY_KEYS.INFO_PANE,
            tracker.USER_ACTIONS.INFO_PANE.OPEN_INFO_PANE);
        }.bind(this));
      return dfd;
    },
    loadSnapshots: function () {
      let query = this.getSnapshotQuery();
      return this.requestQuery(query);
    },
    loadFiles: function () {
      let query = this.getEvidenceQuery('FILE');
      return this.requestQuery(query, 'files');
    },
    loadUrls: function () {
      let query = this.getEvidenceQuery('URL');
      return this.requestQuery(query, 'urls');
    },
    updateItems: function () {
      can.makeArray(arguments).forEach(function (type) {
        this.attr(type).replace(this['load' + can.capitalize(type)]());
      }.bind(this));
    },
    removeItems: function (event, type) {
      let items = this.attr(type);

      can.batch.start();
      let resultItems = items.filter((item) => {
        let newItemIndex = _.findIndex(event.items, (newItem) => {
          return newItem === item;
        });
        return newItemIndex < 0;
      });

      items.replace(resultItems);
      can.batch.stop();
    },
    addItems: function (event, type) {
      let items = event.items;
      this.attr('isUpdating' + can.capitalize(type), true);
      return this.attr(type).unshift(...can.makeArray(items));
    },
    getEvidenceAdditionFilter: function (kind) {
      return kind ?
        {
          expression: {
            left: 'kind',
            op: {name: '='},
            right: kind,
          },
        } :
        [];
    },
    addAction: function (actionType, related) {
      let assessment = this.attr('instance');
      let path = 'actions.' + actionType;

      if (!assessment.attr('actions')) {
        assessment.attr('actions', {});
      }
      if (assessment.attr(path)) {
        assessment.attr(path).push(related);
      } else {
        assessment.attr(path, [related]);
      }
    },
    addRelatedItem: function (event, type) {
      let self = this;
      let assessment = this.attr('instance');
      let relatedItemType = event.item.attr('type');
      let related = {
        id: event.item.attr('id'),
        type: relatedItemType,
      };

      this.attr('deferredSave').execute(function () {
        self.addAction('add_related', related);
      })
        .done(function () {
          if (type === 'comments') {
            tracker.stop(assessment.type,
              tracker.USER_JOURNEY_KEYS.INFO_PANE,
              tracker.USER_ACTIONS.INFO_PANE.ADD_COMMENT_TO_LCA);
            tracker.stop(assessment.type,
              tracker.USER_JOURNEY_KEYS.INFO_PANE,
              tracker.USER_ACTIONS.INFO_PANE.ADD_COMMENT);
          }
        })
        .fail(function () {
          if (type === 'comments') {
            tracker.stop(assessment.type,
              tracker.USER_JOURNEY_KEYS.INFO_PANE,
              tracker.USER_ACTIONS.INFO_PANE.ADD_COMMENT_TO_LCA,
              false);
            tracker.stop(assessment.type,
              tracker.USER_JOURNEY_KEYS.INFO_PANE,
              tracker.USER_ACTIONS.INFO_PANE.ADD_COMMENT,
              false);
          }

          self.removeItems({
            items: [event.item],
          }, type);
        })
        .always(function (assessment) {
          assessment.removeAttr('actions');
          self.attr('isUpdating' + can.capitalize(type), false);

          // dispatching event on instance to pass to the auto-save-form
          self.attr('instance').dispatch(RELATED_ITEMS_LOADED);

          if (relatedItemType === 'Evidence') {
            self.refreshCounts(['Evidence']);
          }
        });
    },
    removeRelatedItem: function (item, type) {
      let self = this;
      let related = {
        id: item.attr('id'),
        type: item.attr('type'),
      };
      let items = self.attr(type);
      let index = items.indexOf(item);
      this.attr('isUpdating' + can.capitalize(type), true);
      items.splice(index, 1);

      this.attr('deferredSave').push(function () {
        self.addAction('remove_related', related);
      })
        .fail(function () {
          notifier('error', 'Unable to remove URL.');
          items.splice(index, 0, item);
        })
        .always(function (assessment) {
          assessment.removeAttr('actions');
          self.attr('isUpdating' + can.capitalize(type), false);

          self.refreshCounts(['Evidence']);
        });
    },
    updateRelatedItems: function () {
      this.attr('isUpdatingRelatedItems', true);

      this.attr('instance').getRelatedObjects()
        .then((data) => {
          this.attr('mappedSnapshots').replace(data.Snapshot);
          this.attr('comments').replace(data.Comment);
          this.attr('files')
            .replace(data['Evidence:FILE'].map((file) => new Evidence(file)));
          this.attr('urls')
            .replace(data['Evidence:URL'].map((url) => new Evidence(url)));

          this.attr('isUpdatingRelatedItems', false);
          this.attr('instance').dispatch(RELATED_ITEMS_LOADED);

          tracker.stop(this.attr('instance.type'),
            tracker.USER_JOURNEY_KEYS.INFO_PANE,
            tracker.USER_ACTIONS.INFO_PANE.OPEN_INFO_PANE);
        });
    },
    initializeFormFields: function () {
      const cavs =
      getCustomAttributes(
        this.attr('instance'),
        CA_UTILS_CA_TYPE.LOCAL
      );
      this.attr('formFields',
        convertValuesToFormFields(cavs)
      );
    },
    reinitFormFields() {
      const cavs = getCustomAttributes(
        this.attr('instance'),
        CA_UTILS_CA_TYPE.LOCAL
      );

      let updatedFormFields = convertValuesToFormFields(cavs);
      let updatedFieldsIds = _.keyBy(updatedFormFields, 'id');

      this.attr('formFields').forEach((field) => {
        let updatedField = updatedFieldsIds[field.attr('id')];

        if (updatedField &&
          field.attr('value') !== updatedField.attr('value')) {
          field.attr('value', updatedField.attr('value'));
        }
      });
    },
    initGlobalAttributes: function () {
      const instance = this.attr('instance');
      const caObjects = instance
        .customAttr({type: CUSTOM_ATTRIBUTE_TYPE.GLOBAL});
      this.attr('globalAttributes', caObjects);
    },
    initializeDeferredSave: function () {
      this.attr('deferredSave', new DeferredTransaction(
        function (resolve, reject) {
          this.attr('instance').save().done(resolve).fail(reject);
        }.bind(this), 1000));
    },
    onStateChange: function (event) {
      let isUndo = event.undo;
      let newStatus = event.state;
      let instance = this.attr('instance');
      let status = instance.attr('status');
      let initialState = this.attr('initialState');
      let deprecatedState = this.attr('deprecatedState');
      let isArchived = instance.attr('archived');
      let previousStatus = instance.attr('previousStatus');
      let stopFn = tracker.start(instance.type,
        tracker.USER_JOURNEY_KEYS.INFO_PANE,
        tracker.USER_ACTIONS.ASSESSMENT.CHANGE_STATUS);

      if (isArchived && [initialState, deprecatedState].includes(newStatus)) {
        return $.Deferred().resolve();
      }

      this.attr('onStateChangeDfd', $.Deferred());

      if (isUndo) {
        instance.attr('previousStatus', undefined);
      } else {
        instance.attr('previousStatus', instance.attr('status'));
      }
      this.attr('isUpdatingState', true);

      return this.attr('deferredSave').execute(() => {
        if (isUndo) {
          instance.attr('status', previousStatus);
        } else {
          instance.attr('status', newStatus);
        }

        if (instance.attr('status') === 'In Review' && !isUndo) {
          $(document.body).trigger('ajax:flash',
            {hint: 'The assessment is complete. ' +
            'The verifier may revert it if further input is needed.'});
        }
      }).then(() => {
        this.attr('onStateChangeDfd').resolve();
        pubsub.dispatch({
          type: 'refetchOnce',
          modelNames: relatedAssessmentsTypes,
        });
        stopFn();
      }).fail((object, xhr) => {
        if (xhr && xhr.status === 409 && xhr.remoteObject) {
          instance.attr('status', xhr.remoteObject.status);
        } else {
          instance.attr('status', status);
          instance.attr('previousStatus', previousStatus);
          notifierXHR('error')(xhr);
        }
      }).always(() => {
        this.attr('isUpdatingState', false);
      });
    },
    saveGlobalAttributes: function (event) {
      this.attr('deferredSave').push(() => {
        const instance = this.attr('instance');
        const globalAttributes = event.globalAttributes;

        globalAttributes.each((value, caId) => {
          instance.customAttr(caId, value);
        });
      });
    },
    showRequiredInfoModal: function (e, field) {
      let scope = field || e.field;
      let errors = scope.attr('errorsMap');
      let errorsList = can.Map.keys(errors)
        .map(function (error) {
          return errors[error] ? error : null;
        })
        .filter(function (errorCode) {
          return !!errorCode;
        });
      let data = {
        options: scope.attr('options'),
        contextScope: scope,
        fields: errorsList,
        value: scope.attr('value'),
        title: scope.attr('title'),
        type: scope.attr('type'),
        saveDfd: e.saveDfd || $.Deferred().resolve(),
      };

      let title = 'Required ' + getLCAPopupTitle(errors);

      can.batch.start();
      this.attr('modal.content', data);
      this.attr('modal.modalTitle', title);
      can.batch.stop();
      this.attr('modal.state.open', true);
    },
    setVerifierRoleId: function () {
      let verifierRole = getRole('Assessment', 'Verifiers');

      let verifierRoleId = verifierRole ? verifierRole.id : null;
      this.attr('_verifierRoleId', verifierRoleId);
    },
    verifyObjects(type, countKey) {
      let objects = this.attr(type).filter((item) => !item.isNew());
      this.attr(type, objects);
      this.attr(`isUpdating${can.capitalize(type)}`, false);

      if (countKey) {
        this.refreshCounts([countKey]);
      }
    },
  },
  init: function () {
    this.viewModel.initializeFormFields();
    this.viewModel.initGlobalAttributes();
    this.viewModel.updateRelatedItems();
    this.viewModel.initializeDeferredSave();

    this.viewModel.setVerifierRoleId();
  },
  events: {
    [`{viewModel.instance} ${REFRESH_MAPPING.type}`](scope, event) {
      const viewModel = this.viewModel;
      viewModel.attr('mappedSnapshots')
        .replace(this.viewModel.loadSnapshots());
      viewModel.attr('instance').dispatch({
        ...REFRESH_RELATED,
        model: event.destinationType,
      });
    },
    '{viewModel.instance} updated'(instance) {
      const vm = this.viewModel;
      const isPending = vm.attr('deferredSave').isPending();
      instance.backup();
      if (!isPending) {
        // reinit LCA when queue is empty
        // to avoid rewriting of changed values
        vm.reinitFormFields();
      }
    },
    '{viewModel.instance} modelBeforeSave': function () {
      this.viewModel.attr('isAssessmentSaving', true);
    },
    '{viewModel.instance} modelAfterSave': function () {
      this.viewModel.attr('isAssessmentSaving', false);
    },
    '{viewModel.instance} assessment_type'() {
      const onSave = () => {
        this.viewModel.instance.dispatch({
          ...REFRESH_TAB_CONTENT,
          tabId: 'tab-related-assessments',
        });
        this.viewModel.instance.unbind('updated', onSave);
      };
      this.viewModel.instance.bind('updated', onSave);
    },
    '{viewModel} instance': function () {
      this.viewModel.initializeFormFields();
      this.viewModel.initGlobalAttributes();
      this.viewModel.updateRelatedItems();
    },
    '{pubsub} objectDeleted'(pubsub, event) {
      let instance = event.instance;
      // handle removing evidence on Evidence tab
      // evidence on Assessment tab should be updated
      if (instance instanceof Evidence) {
        this.viewModel.updateItems('files', 'urls');
      }
    },
  },
});
