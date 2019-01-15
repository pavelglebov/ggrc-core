/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../../collapsible-panel/collapsible-panel';
import '../../object-list-item/business-object-list-item';
import '../../object-list-item/detailed-business-object-list-item';
import './mapped-control-related-objects';
import {
  prepareCustomAttributes,
  convertToFormViewField,
} from '../../../plugins/utils/ca-utils';
import {
  buildParam,
  batchRequests,
} from '../../../plugins/utils/query-api-utils';
import {
  toObject,
  transformQuery,
} from '../../../plugins/utils/snapshot-utils';
import template from './templates/mapped-controls.mustache';
import {notifier} from '../../../plugins/utils/notifiers-utils';

const tag = 'assessment-mapped-controls';

/**
 * ViewModel for Assessment Mapped Controls Popover.
 * @type {can.Map}
 */
const viewModel = {
  define: {
    /**
     * Private Attribute defining array of requested Objects, Types and Fields of Objects
     * @type {Array}
     * @private
     */
    queries: {
      type: '*',
      value: [
        {
          type: 'objectives',
          objName: 'Objective',
          fields: ['child_id', 'child_type', 'revision', 'parent'],
        },
        {
          type: 'regulations',
          objName: 'Regulation',
          fields: ['child_id', 'child_type', 'revision', 'parent'],
        },
      ],
    },
    /**
     * Attribute to indicate loading state
     * @private
     */
    mappedItems: {
      set(newArr) {
        return newArr.map((item) => {
          return {
            isSelected: false,
            instance: item,
          };
        });
      },
    },
  },
  isLoading: false,
  objectives: [],
  regulations: [],
  customAttributes: [],
  state: {},
  titleText: '@',
  mapping: '@',
  mappingType: '@',
  selectedItem: {},
  snapshot: {},
  assessmentType: '@',
  withoutDetails: false,
  /**
   * Generate params required for Query API
   * @param {Number} id - Id of Control's Snapshot
   * @return {Object} request query object
   */
  getParams(id) {
    // Right now we load only Snapshots of related Objectives and Regulations
    const relevant = {
      type: 'Snapshot',
      id: id,
      operation: 'relevant',
    };
    let params = this.attr('queries')
      .map((query) => {
        const resultingQuery =
          buildParam(query.objName, {}, relevant, query.fields);
        return {
          type: query.type,
          request: transformQuery(resultingQuery),
        };
      });
    return params;
  },
  loadItems(id) {
    let params = this.getParams(id);

    this.attr('isLoading', true);
    $.when(...params.map((param) => {
      return batchRequests(param.request).then((response) => {
        let objects = response.Snapshot.values.map((item) => toObject(item));
        this.attr(param.type, objects);
      });
    })).then(null, () => {
      notifier('error', 'Failed to fetch related objects.');
    }).always(() => this.attr('isLoading', false));
  },
  attributesToFormFields(snapshot) {
    const attributes = prepareCustomAttributes(
      snapshot.custom_attribute_definitions,
      snapshot.custom_attribute_values)
      .map(convertToFormViewField);
    return attributes;
  },
};
/**
 * Assessment specific mapped controls view component
 */
export default can.Component.extend({
  template,
  tag,
  leakScope: true,
  viewModel: viewModel,
  events: {
    '{viewModel} selectedItem.data'() {
      const item = this.viewModel.attr('selectedItem.data');
      let attributes;
      if (item) {
        if (!this.viewModel.attr('withoutDetails')) {
          let id = item.attr('id');
          this.viewModel.loadItems(id);
        }
        attributes = this.viewModel.attributesToFormFields(
          item.attr('revision.content'));
        this.viewModel.attr('customAttributes', attributes);
        this.viewModel.attr('snapshot',
          toObject(item));
        this.viewModel.attr('state.open', true);
      }
    },
  },
});
