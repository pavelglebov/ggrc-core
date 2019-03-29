/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import SummaryWidgetController from '../controllers/summary_widget_controller';
import DashboardWidget from '../controllers/dashboard_widget_controller';
import InfoWidget from '../controllers/info_widget_controller';
import WidgetList from '../modules/widget_list';
import {isDashboardEnabled} from '../plugins/utils/dashboards-utils';
import {getWidgetConfig} from '../plugins/utils/widgets-utils';
import {widgetModules} from '../plugins/utils/widgets-utils';
import {
  getPageInstance,
  getPageModel,
  isAllObjects,
} from '../plugins/utils/current-page-utils';
import * as businessModels from '../models/business-models/index';
import TreeViewConfig from '../apps/base_widgets';
import {
  getRelatedModelNames,
  isMegaObjectRelated,
  getMegaObjectConfig,
} from '../plugins/utils/mega-object-utils';

const summaryWidgetViews = Object.freeze({
  audits: GGRC.templates_path + '/audits/summary.stache',
});

const infoWidgetViews = Object.freeze({
  programs: GGRC.templates_path + '/programs/info.stache',
  audits: GGRC.templates_path + '/audits/info.stache',
  people: GGRC.templates_path + '/people/info.stache',
  policies: GGRC.templates_path + '/policies/info.stache',
  controls: GGRC.templates_path + '/controls/info.stache',
  systems: GGRC.templates_path + '/systems/info.stache',
  processes: GGRC.templates_path + '/processes/info.stache',
  products: GGRC.templates_path + '/products/info.stache',
  assessments: GGRC.templates_path + '/assessments/info.stache',
  assessment_templates:
    GGRC.templates_path + '/assessment_templates/info.stache',
  issues: GGRC.templates_path + '/issues/info.stache',
  evidence: GGRC.templates_path + '/evidence/info.stache',
  documents: GGRC.templates_path + '/documents/info.stache',
  risks: GGRC.templates_path + '/risks/info.stache',
});

let CoreExtension = {};

CoreExtension.name = 'core"';
widgetModules.push(CoreExtension);
_.assign(CoreExtension, {
  init_widgets: function () {
    let baseWidgetsByType = TreeViewConfig.attr('base_widgets_by_type');
    let widgetList = new WidgetList('ggrc_core');
    let objectClass = getPageModel();
    let objectTable = objectClass && objectClass.table_plural;
    let object = getPageInstance();
    let path = GGRC.templates_path;
    let modelNames;
    let possibleModelType;
    let farModels;
    let extraDescriptorOptions;

    // Info and summary widgets display the object information instead of listing
    // connected objects.
    if (summaryWidgetViews[objectTable]) {
      widgetList.add_widget(object.constructor.model_singular, 'summary', {
        content_controller: SummaryWidgetController,
        instance: object,
        widget_view: summaryWidgetViews[objectTable],
      });
    }
    if (isDashboardEnabled(object)) {
      widgetList.add_widget(object.constructor.model_singular, 'dashboard', {
        content_controller: DashboardWidget,
        instance: object,
        widget_view: path + '/base_objects/dashboard_widget.stache',
      });
    }
    widgetList.add_widget(object.constructor.model_singular, 'info', {
      content_controller: InfoWidget,
      instance: object,
      widget_view: infoWidgetViews[objectTable],
    });
    modelNames = can.Map.keys(baseWidgetsByType);
    modelNames.sort();
    possibleModelType = modelNames.slice();
    modelNames.forEach(function (name) {
      let wList;
      let childModelList = [];
      let widgetConfig = getWidgetConfig(name);
      name = widgetConfig.name;
      TreeViewConfig.attr('basic_model_list').push({
        model_name: name,
        display_name: widgetConfig.widgetName,
      });

      // Initialize child_model_list, and child_display_list each model_type
      wList = baseWidgetsByType[name];

      _.forEach(wList, function (item) {
        let childConfig;
        if (possibleModelType.indexOf(item) !== -1) {
          childConfig = getWidgetConfig(name);
          childModelList.push({
            model_name: childConfig.name,
            display_name: childConfig.widgetName,
          });
        }
      });
      TreeViewConfig.attr('sub_tree_for').attr(name, {
        model_list: childModelList,
        display_list: businessModels[name]
          .tree_view_options.child_tree_display_list || wList,
      });
    });

    // the assessments_view only needs the Assessments widget
    if (/^\/assessments_view/.test(window.location.pathname)) {
      farModels = ['Assessment'];
    } else {
      farModels = baseWidgetsByType[object.constructor.model_singular];
    }

    // add additional widgets for mega objects
    if (businessModels[objectClass.model_singular].isMegaObject) {
      farModels = farModels.concat(
        getRelatedModelNames(objectClass.model_singular)
      );
    }

    // here we are going to define extra descriptor options, meaning that
    //  these will be used as extra options to create widgets on top of

    extraDescriptorOptions = {
      all: (function () {
        let all = {
          Evidence: {
            treeViewDepth: 0,
          },
          AssessmentTemplate: {
            treeViewDepth: 0,
          },
          Workflow: {
            treeViewDepth: 0,
          },
          CycleTaskGroupObjectTask: {
            widget_id: 'task',
            widget_name: () => {
              if (object instanceof businessModels.Person) {
                return 'Tasks';
              }
              return 'Workflow Tasks';
            },
            treeViewDepth: 1,
            content_controller_options: {
              showBulkUpdate: !isAllObjects(),
            },
          },
        };

        let defOrder = TreeViewConfig.attr('defaultOrderTypes');
        Object.keys(defOrder).forEach(function (type) {
          if (!all[type]) {
            all[type] = {};
          }
          all[type].order = defOrder[type];
        });

        return all;
      })(),

      // An Audit has a different set of object that are more relevant to it,
      // thus these objects have a customized priority. On the other hand,
      // the object otherwise prioritized by default (e.g. Regulation) have
      // their priority lowered so that they fit nicely into the alphabetical
      // order among the non-prioritized object types.
      Audit: {
        Assessment: {
          order: 7,
        },
        Issue: {
          order: 8,
        },
        Evidence: {
          order: 9,
        },
      },
    };

    _.forEach(farModels, function (modelName) {
      const megaRelated = isMegaObjectRelated(modelName);

      let widgetConfig = megaRelated ?
        getMegaObjectConfig(modelName) :
        getWidgetConfig(modelName);

      modelName = widgetConfig.name;

      let farModel;
      let descriptor = {};
      let widgetId;

      farModel = businessModels[modelName];
      if (farModel) {
        widgetId = widgetConfig.widgetId;
        descriptor = {
          instance: object,
          far_model: farModel,
        };
      } else {
        widgetId = modelName;
      }

      // Custom overrides
      if (extraDescriptorOptions.all &&
          extraDescriptorOptions.all[modelName]) {
        $.extend(descriptor, extraDescriptorOptions.all[modelName]);
      }

      if (extraDescriptorOptions[object.constructor.model_singular] &&
          extraDescriptorOptions[
            object.constructor.model_singular][modelName]) {
        $.extend(descriptor,
          extraDescriptorOptions[object.constructor.model_singular][modelName]);
      }

      descriptor.widgetType = 'treeview';
      widgetList.add_widget(
        object.constructor.model_singular, widgetId, descriptor);
    });
  },
});
