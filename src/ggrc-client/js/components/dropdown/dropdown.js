/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import template from './dropdown.mustache';

/*
  Component abstracts <select> dropdown in HTML.

  It receives `name` of the attribute that should be set and `optionsList`
  with titles and values
*/
export default can.Component.extend({
  tag: 'dropdown',
  template,
  leakScope: true,
  viewModel: {
    define: {
      options: {
        get: function () {
          let isGroupedDropdown = this.attr('isGroupedDropdown');
          let optionsGroups = this.attr('optionsGroups');
          let noneValue = this.attr('noValueLabel') || '--';
          let none = isGroupedDropdown ?
            [{
              group: noneValue,
              subitems: [{title: noneValue, value: ''}],
            }] :
            [{
              title: noneValue,
              value: '',
            }];
          let list = [];
          if (!isGroupedDropdown) {
            list = can.map(this.attr('optionsList') || [], function (option) {
              if (_.isString(option)) {
                return {
                  value: option,
                  title: option,
                };
              }
              return option;
            });
          } else {
            list = can.Map.keys(optionsGroups).map(function (key) {
              let group = optionsGroups.attr(key);
              return {
                group: group.attr('name'),
                subitems: group.attr('items').map(function (item) {
                  return {
                    value: item.value,
                    title: item.name,
                  };
                }),
              };
            });
          }
          if (this.attr('noValue')) {
            return none.concat(list);
          }
          return list;
        },
      },
    },
    name: '@',
    className: '@',
    onChange: $.noop,
    noValue: '@',
    noValueLabel: '@',
    controlId: '@',
    isGroupedDropdown: false,
    tabIndex: 0,
    /*
      Options list should be an `array` of object containing `title` and `value`
      [{
        title: `title`
        value: `value`
      }]
      */
    optionsList: [],
    optionsGroups: {},
    isDisabled: false,
  },
  init: function (element, options) {
    let $el = $(element);
    let attrVal = $el.attr('is-disabled');
    let disable;
    let viewModel = this.viewModel;

    // By default CanJS evaluates the component element's attribute values in
    // the current context, but we want to support passing in literal values
    // as well. We thus inspect some of the directly and override what CanJS
    // initializes in viewModel.
    if (attrVal === '' || attrVal === 'false') {
      disable = false;
    } else if (attrVal === 'true') {
      disable = true;
    } else {
      disable = Boolean(viewModel.attr('isDisabled'));
    }

    viewModel.attr('isDisabled', disable);
  },
});
