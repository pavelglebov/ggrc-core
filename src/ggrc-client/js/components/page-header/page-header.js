/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import '../assessment/people/lhn-popup-people';
import '../tasks-counter/tasks-counter';
import '../tooltip-content/tooltip-content';
import '../feedback-link/feedback-link';
import '../release-notes-menu-item/release-notes-menu-item';
import logo from '../../../images/ggrc-logo.svg';
import oneColorLogo from '../../../images/ggrc-one-color.svg';
import {
  isMyWork,
  isAllObjects,
  isAdmin,
  getPageType,
  isObjectContextPage,
  isMyAssessments,
} from '../../plugins/utils/current-page-utils';
import template from './page-header.mustache';

(function (GGRC, can) {
  'use strict';
  let colorsMap = {
    OrgGroup: 'header-style-1',
    System: 'header-style-1',
    Process: 'header-style-1',
    DataAsset: 'header-style-1',
    Product: 'header-style-1',
    ProductGroup: 'header-style-1',
    Project: 'header-style-1',
    Facility: 'header-style-1',
    Market: 'header-style-1',
    Metric: 'header-style-1',
    Audit: 'header-style-2',
    Assessment: 'header-style-2',
    Issue: 'header-style-3',
    Risk: 'header-style-3',
    TechnologyEnvironment: 'header-style-1',
    Threat: 'header-style-3',
    Regulation: 'header-style-4',
    Policy: 'header-style-4',
    Standard: 'header-style-4',
    Contract: 'header-style-4',
    Clause: 'header-style-4',
    Requirement: 'header-style-4',
    Control: 'header-style-4',
    Objective: 'header-style-4',
    Program: 'header-style-5',
  };

  let viewModel = can.Map.extend({
    define: {
      showTitles: {
        type: Boolean,
        value: true,
      },
      isMyWorkPage: {
        get() {
          return isMyWork();
        },
      },
      isAllObjectsPage: {
        get() {
          return isAllObjects();
        },
      },
      isAdminPage: {
        get() {
          return isAdmin();
        },
      },
      isPersonPage: {
        get() {
          return getPageType() === 'Person';
        },
      },
      isObjectPage: {
        get() {
          return isObjectContextPage();
        },
      },
      isMyAssessmentsPage: {
        get() {
          return isMyAssessments();
        },
      },
      model: {
        get() {
          return this.attr('instance').class;
        },
      },
      instance: {
        get: function () {
          return GGRC.page_instance();
        },
      },
      current_user: {
        get: function () {
          return GGRC.current_user;
        },
      },
      headerStyle: {
        type: 'string',
        get: function () {
          return colorsMap[this.attr('instance.type')] || '';
        },
      },
      logo: {
        type: 'string',
        get: function () {
          return this.attr('headerStyle') ? oneColorLogo : logo;
        },
      },
      helpUrl: {
        type: 'string',
        value: GGRC.config.external_help_url,
      },
      showReleaseNotes: {
        type: Boolean,
        value: GGRC.config.enable_release_notes,
      },
    },
    showHideTitles: function (element) {
      let elWidth = element.width();
      let $menu = element.find('.menu');
      let $title = element.find('h1');

      this.attr('showTitles', true);

      if (elWidth < ($menu.width() + $title.width())) {
        this.attr('showTitles', false);
      } else {
        this.attr('showTitles', true);
      }
    },
  });

  GGRC.Components('pageHeader', {
    tag: 'page-header',
    template: template,
    viewModel: viewModel,
    events: {
      '{window} resize': _.debounce(function () {
        this.viewModel.showHideTitles(this.element);
      }, 100),
      inserted: function () {
        this.viewModel.showHideTitles(this.element);
      },
    },
  });
})(window.GGRC, window.can);
