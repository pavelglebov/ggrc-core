/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './add-template-field.mustache';

export default can.Component.extend({
  tag: 'add-template-field',
  template,
  leakScope: true,
  viewModel: {
    selected: [],
    fields: [],
    types: [],
    // the field types that require a list of possible values to be defined
    valueAttrs: ['Dropdown'],
    /*
     * Create a new field.
     *
     * Field must contain value title, type, values.
     * Opts are populated, once we start changing checkbox values
     *
     * @param {can.Map} viewModel - the current (add-template-field) viewModel
     * @param {jQuery.Object} el - the clicked DOM element
     * @param {Object} ev - the event object
     */
    addField() {
      let fields = this.attr('fields');
      let selected = this.attr('selected');
      let title = _.trim(selected.title);
      let type = _.trim(selected.type);
      let values = _.splitTrim(selected.values, {
        unique: true,
      }).join(',');
      this.attr('selected.invalidValues', false);
      this.attr('selected.invalidTitleError', '');

      let validators = this.getValidators(title, fields);
      this.validateTitle(validators);
      this.validateValues(type, values);

      if (
        this.attr('selected.invalidValues') ||
        this.attr('selected.invalidTitleError')
      ) {
        return;
      }

      fields.push({
        id: this.attr('id'),
        title: title,
        attribute_type: type,
        multi_choice_options: values,
      });
      _.forEach(['title', 'values', 'multi_choice_options'],
        (type) => {
          selected.attr(type, '');
        });
    },
    validateValues(type, values) {
      let invalidValues = _.includes(this.valueAttrs, type) && !values;
      this.attr('selected.invalidValues', invalidValues);
    },
    validateTitle(validators) {
      const errorMessage = validators.reduce((prev, next) => {
        if (prev) {
          return prev;
        }

        return next();
      }, '');

      this.attr('selected.invalidTitleError', errorMessage);
    },
    getValidators(title, fields) {
      return [
        isEmptyTitle.bind(null, title),
        isDublicateTitle.bind(null, fields, title),
        isReservedByCustomAttr.bind(null, title),
        isReservedByModelAttr.bind(null, title),
      ];
    },
  },
  events: {
    /*
     * Set default dropdown type on init
     */
    init() {
      let types = this.viewModel.attr('types');
      if (!this.viewModel.attr('selected.type')) {
        this.viewModel.attr('selected.type', _.head(types).attr('type'));
      }
    },
  },
  helpers: {
    /*
     * Get input placeholder value depended on type
     *
     * @param {Object} options - Mustache options
     */
    placeholder(options) {
      let types = this.attr('types');
      let item = _.find(types, {
        type: this.attr('selected.type'),
      });
      if (item) {
        return item.text;
      }
    },
  },
});

const isEqualTitle = (title, attr) => {
  return attr && attr.toLowerCase() === title.toLowerCase();
};

const isDublicateTitle = (fields, selectedTitle) => {
  let duplicateField = _.some(fields, (item) => {
    return item.title.toLowerCase() === selectedTitle.toLowerCase() &&
      !item._pending_delete;
  });
  return fields.length && duplicateField ?
    'A custom attribute with this title already exists' :
    '';
};

const isEmptyTitle = (selectedTitle) => {
  return !selectedTitle ?
    'A custom attribute title can not be blank' :
    '';
};

const isReservedByCustomAttr = (title) => {
  const customAttrs = GGRC.custom_attr_defs
    .filter((attr) =>
      attr.definition_type && attr.definition_type === 'assessment'
    ).filter((attr) =>
      isEqualTitle(title, attr.title)
    );

  return customAttrs.length ?
    'Custom attribute with such name already exists' :
    '';
};

const isReservedByModelAttr = (title) => {
  const modelAttrs = GGRC.model_attr_defs.Assessment.filter(
    (attr) => isEqualTitle(title, attr.display_name)
  );

  return modelAttrs.length ?
    'Attribute with such name already exists' :
    '';
};

export {
  isDublicateTitle,
  isEmptyTitle,
  isReservedByCustomAttr,
  isReservedByModelAttr,
};
