/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import SummaryWidgetController from '../controllers/summary_widget_controller';
import DashboardWidget from '../controllers/dashboard_widget_controller';
import InfoWidget from '../controllers/info_widget_controller';
import {getWidgetConfig} from '../plugins/utils/widgets-utils';
import Program from '../models/business-models/program';

const widgetDescriptors = {};
// A widget descriptor has the minimum five properties:
// widget_id:  the unique ID string for the widget
// widget_name: the display title for the widget in the UI
// widget_icon: the CSS class for the widget in the UI
// content_controller: The controller class for the widget's content section
// content_controller_options: options passed directly to the content controller; the
//   precise options depend on the controller itself.  They usually require instance
//   and/or model and some view.
export default can.Construct.extend({
  /*
    make an info widget descriptor for a GGRC object
    You must provide:
    instance - an instance that is a subclass of Cacheable
    widgetView [optional] - a template for rendering the info.
  */
  make_info_widget: function (instance, widgetView) {
    let defaultInfoWidgetView = GGRC.templates_path +
                                    '/base_objects/info.stache';
    return new this(
      instance.constructor.model_singular + ':info', {
        widget_id: 'info',
        widget_name: function () {
          if (instance.constructor.title_singular === 'Person') {
            return 'Info';
          }
          return instance.constructor.title_singular + ' Info';
        },
        widget_icon: 'info-circle',
        content_controller: InfoWidget,
        content_controller_options: {
          instance: instance,
          model: instance.constructor,
          widget_view: widgetView || defaultInfoWidgetView,
        },
        order: 5,
        uncountable: true,
      });
  },
  /*
    make an summary widget descriptor for a GGRC object
    You must provide:
    instance - an instance that is a subclass of Cacheable
    widgetView [optional] - a template for rendering the info.
  */
  make_summary_widget: function (instance, widgetView) {
    let defaultView = GGRC.templates_path +
      '/base_objects/summary.stache';
    return new this(
      instance.constructor.model_singular + ':summary', {
        widget_id: 'summary',
        widget_name: function () {
          return instance.constructor.title_singular + ' Summary';
        },
        widget_icon: 'pie-chart',
        content_controller: SummaryWidgetController,
        content_controller_options: {
          instance: instance,
          model: instance.constructor,
          widget_view: widgetView || defaultView,
        },
        order: 3,
        uncountable: true,
      });
  },
  make_dashboard_widget: function (instance, widgetView) {
    let defaultView = GGRC.templates_path +
      '/base_objects/dashboard.stache';
    return new this(
      instance.constructor.model_singular + ':dashboard', {
        widget_id: 'dashboard',
        widget_name: function () {
          if (instance.constructor.title_singular === 'Person') {
            return 'Dashboard';
          }
          return instance.constructor.title_singular + ' Dashboard';
        },
        widget_icon: 'tachometer',
        content_controller: DashboardWidget,
        content_controller_options: {
          instance: instance,
          model: instance.constructor,
          widget_view: widgetView || defaultView,
        },
        order: 6,
        uncountable: true,
      });
  },
  /*
    make a tree view widget descriptor with mostly default-for-GGRC settings.
    You must provide:
    instance - an instance that is a subclass of Cacheable
    farModel - a Cacheable class
    extenders [optional] - an array of objects that will extend the default widget config.
  */
  make_tree_view: function (instance, farModel, extenders, id) {
    let descriptor;
    let objectConfig = getWidgetConfig(id);

    // Should not even try to create descriptor if configuration options are missing
    if (!instance || !farModel) {
      console.warn(
        `Arguments are missing or have incorrect format ${arguments}`);
      return null;
    }

    let widgetId = objectConfig.isObjectVersion ?
      farModel.table_singular + '_version' :
      (objectConfig.isMegaObject ?
        farModel.table_singular + '_' + objectConfig.relation :
        farModel.table_singular);

    descriptor = {
      widgetType: 'treeview',
      treeViewDepth: 2,
      widget_id: widgetId,
      widget_guard: function () {
        if (
          farModel.title_plural === 'Audits' &&
          instance instanceof Program
        ) {
          return 'context' in instance && !!(instance.context.id);
        }
        return true;
      },
      widget_name: function () {
        let farModelName =
          objectConfig.isObjectVersion || objectConfig.isMegaObject ?
            objectConfig.widgetName :
            farModel.title_plural;

        return farModelName;
      },
      widget_icon: farModel.table_singular,
      object_category: farModel.category || 'default',
      model: farModel,
      objectVersion: objectConfig.isObjectVersion,
      content_controller_options: {
        parent_instance: instance,
        model: farModel,
        objectVersion: objectConfig.isObjectVersion,
        megaRelated: objectConfig.isMegaObject,
        countsName: objectConfig.countsName,
        widgetId,
      },
    };

    $.extend(...([true, descriptor].concat(extenders || [])));

    return new this(
      instance.constructor.model_singular + ':' +
      id || instance.constructor.model_singular,
      descriptor
    );
  },
  newInstance: function (id, opts) {
    let ret;
    if (!opts && typeof id === 'object') {
      opts = id;
      id = opts.widget_id;
    }

    if (widgetDescriptors[id]) {
      if (widgetDescriptors[id] instanceof this) {
        $.extend(widgetDescriptors[id], opts);
      } else {
        ret = this._super.apply(this);
        $.extend(ret, widgetDescriptors[id], opts);
        widgetDescriptors[id] = ret;
      }
      return widgetDescriptors[id];
    }

    ret = this._super(...arguments);
    $.extend(ret, opts);
    widgetDescriptors[id] = ret;
    return ret;
  },
}, {});
