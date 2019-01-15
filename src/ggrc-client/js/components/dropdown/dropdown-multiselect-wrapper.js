/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

export default can.Component.extend({
  tag: 'dropdown-multiselect-wrapper',
  leakScope: true,
  viewModel: {
    value: [],
    selected: [],
    options: [],
    define: {
      /*
        dropdown-multiselect-wrapper when data should be fetched first
        {modelConstructor}: Model definition to fetch
        {(value)}: Two-way binding parent`s target attribute
      */
      modelConstructor: {
        set(newModelConstructor) {
          if (newModelConstructor) {
            newModelConstructor.findAll()
              .done(this.prepareOptions.bind(this));

            return newModelConstructor;
          }
        },
      },
    },
    prepareOptions: function (items) {
      let options = [];
      let selected = [];

      items.forEach((item) => {
        let isSelected = !!_.find(this.attr('value'), (selectedItem) => {
          return selectedItem.id === item.id;
        });

        let option = {
          value: item.name,
          id: item.id,
          checked: isSelected,
        };

        options.push(option);

        if (isSelected) {
          selected.push(option);
        }
      });

      // options sent down to multiselect-dropdown
      this.attr('options', options);

      // selected is input models converted into multiselect-dropdown format
      this.attr('selected', selected);
    },
    selectedChanged(event) {
      let newSelected = event.selected;
      let selected = [];
      let model = this.attr('modelConstructor');

      // add all new items from Cache
      newSelected.forEach((item) => {
        selected.push(model.findInCacheById(item.id));
      });

      this.attr('value', selected);
    },
  },
});
