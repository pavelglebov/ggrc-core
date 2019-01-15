/*
 Copyright (C) 2019 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */
import {formatDate} from '../../plugins/utils/date-utils';
import {getUserRoles} from '../../plugins/utils/user-utils';
import template from './templates/tree-item-attr.mustache';

// attribute names considered "default" and representing a date
const DATE_ATTRS = Object.freeze({
  end_date: 1,
  due_date: 1,
  finished_date: 1,
  start_date: 1,
  created_at: 1,
  updated_at: 1,
  verified_date: 1,
  last_deprecated_date: 1,
  last_assessment_date: 1,
});

// attribute names considered "default" and representing rich text fields
const RICH_TEXT_ATTRS = Object.freeze({
  notes: 1,
  description: 1,
  test_plan: 1,
  risk_type: 1,
  threat_source: 1,
  threat_event: 1,
  vulnerability: 1,
});

export default can.Component.extend({
  tag: 'tree-item-attr',
  template,
  leakScope: true,
  viewModel: {
    instance: null,
    name: '',
    define: {
      defaultValue: {
        type: String,
        get() {
          return this.getDefaultValue();
        },
      },
      userRoles: {
        type: String,
        get() {
          return getUserRoles(this.attr('instance')).join(', ');
        },
      },
    },
    /**
     * Retrieve the string value of an attribute.
     *
     * The method only supports instance attributes categorized as "default",
     * and does not support (read: not work for) nested object references.
     *
     * If the attribute does not exist or is not considered
     * to be a "default" attribute, an empty string is returned.
     *
     * If the attribute represents a date information, it is returned in the
     * MM/DD/YYYY format.
     *
     * @return {String} - the retrieved attribute's value
     */
    getDefaultValue() {
      let attrName = this.attr('name');
      let instance = this.attr('instance');

      let result = instance.attr(attrName);

      const regexTags = /<[^>]*>?/g;
      const regexNewLines = /<\/p>?/g;

      if (result !== undefined && result !== null) {
        if (attrName in DATE_ATTRS) {
          return formatDate(result, true);
        }
        if (attrName in RICH_TEXT_ATTRS) {
          return result
            .replace(regexNewLines, '\n').replace(regexTags, ' ').trim();
        }
        return String(result);
      }
      return '';
    },
  },
});
