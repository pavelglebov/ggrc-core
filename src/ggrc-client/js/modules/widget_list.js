/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import SummaryWidgetController from '../controllers/summary_widget_controller';
import DashboardWidget from '../controllers/dashboard_widget_controller';
import InfoWidget from '../controllers/info_widget_controller';
import WidgetDescriptor from './widget_descriptor';
import {getPageInstance} from '../plugins/utils/current-page-utils';
import * as businessModels from '../models/business-models';
import {getRelatedModelNames} from '../plugins/utils/mega-object-utils';

/*
  WidgetList - an extensions-ready repository for widget descriptor configs.
  Create a new widget list with new WidgetList(list_name, widget_descriptions)
    where widget_descriptions is an object with the structure:
    { <page_name> :
      { <widget_id> :
        { <widget descriptor-ready properties> },
      ...},
    ...}

  See the comments for WidgetDescriptor for details in what is necessary to define
  a widget descriptor.
*/
export default can.Construct.extend({
  modules: {},
  /*
    get_widget_list_for: return a keyed object of widget descriptors for the specified page type.

    pageType - one of a GGRC object model's shortName, or "admin"

    The widget descriptors are built on the first call of this function; subsequently they are retrieved from the
      widget descriptor cache.
  */
  get_widget_list_for: function (pageType) {
    let widgets = {};
    let descriptors = {};

    _.forEach(this.modules, function (module) {
      _.forEach(module[pageType], function (descriptor, id) {
        if (!widgets[id]) {
          widgets[id] = descriptor;
        } else {
          _.merge(widgets[id], descriptor);
        }
      });
    });

    _.forEach(widgets, function (widget, widgetId) {
      let ctrl = widget.content_controller;
      let options = widget.content_controller_options;

      if (ctrl && ctrl === InfoWidget) {
        descriptors[widgetId] = WidgetDescriptor.make_info_widget(
          options && options.instance ||
            widget.instance,
          options && options.widget_view || widget.widget_view
        );
      } else if (ctrl && ctrl === SummaryWidgetController) {
        descriptors[widgetId] = WidgetDescriptor.make_summary_widget(
          options && options.instance ||
            widget.instance,
          options && options.widget_view || widget.widget_view
        );
      } else if (ctrl && ctrl === DashboardWidget) {
        descriptors[widgetId] = WidgetDescriptor.make_dashboard_widget(
          options && options.instance ||
            widget.instance,
          options && options.widget_view || widget.widget_view
        );
      } else if (widget.widgetType === 'treeview') {
        descriptors[widgetId] = WidgetDescriptor.make_tree_view(
          options && (options.instance || options.parent_instance) ||
            widget.instance,
          options && options.model || widget.far_model ||
            widget.model,
          widget,
          widgetId
        );
      } else {
        descriptors[widgetId] = new WidgetDescriptor(
          pageType + ':' + widgetId, widget);
      }
    });

    if (businessModels[pageType] && businessModels[pageType].isMegaObject) {
      const modelNames = getRelatedModelNames(pageType);
      let baseWidget;
      let options;

      modelNames.forEach((name) => {
        baseWidget = widgets[name];
        options = baseWidget.content_controller_options;

        descriptors[name] = WidgetDescriptor.make_tree_view(
          options && (options.instance || options.parent_instance) ||
            baseWidget.instance,
          options && options.model || baseWidget.far_model ||
            baseWidget.model,
          baseWidget,
          name
        );
      });
    }

    _.forEach(descriptors, function (descriptor, id) {
      if (!descriptor || descriptor.suppressed) {
        delete descriptors[id];
      }
    });

    return descriptors;
  },
  /*
    returns a keyed object of widget descriptors that represents the current page.
  */
  get_current_page_widgets: function () {
    return this.get_widget_list_for(
      getPageInstance().constructor.model_singular);
  },
}, {
  init: function (name, opts) {
    this.constructor.modules[name] = this;
    Object.assign(this, opts);
  },
  /*
    Here instead of using the object format described in the class comments, you may instead
    add widgets to the WidgetList by using add_widget.

    pageType - the shortName of a GGRC object class, or "admin"
    id - the desired widget's id.
    descriptor - a widget descriptor appropriate for the widget type. FIXME - the descriptor's
      widget_id value must match the value passed as "id"
  */
  add_widget: function (pageType, id, descriptor) {
    this[pageType] = this[pageType] || {};
    if (this[pageType][id]) {
      _.merge(this[pageType][id], descriptor);
    } else {
      this[pageType][id] = descriptor;
    }
  },
});
