# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Widget bar model.
Multiple models for Widget bar since each object can have it's own rules
what is mappable to it.
"""

from lib import base, factory
from lib.base import Button
from lib.constants import locator, element
from lib.element import widget_bar
from lib.page.widget import admin_widget
from lib.utils import selenium_utils


class _WidgetBar(base.Component):
  """All widget bars."""
  # pylint: disable=too-few-public-methods

  def get_active_widget_name(self):
    """In general multiple tabs are open. Get name of active one.
    Return: str
    """
    active_widget = base.Button(self._driver, locator.WidgetBar.TAB_WIDGET)
    return active_widget.text


class _ObjectWidgetBar(_WidgetBar):
  """Model for Generic object widget bar
 (e.g. each Info Widget is object specific).
 """

  def __init__(self, driver):
    super(_ObjectWidgetBar, self).__init__(driver)
    self.tab_info = base.Tab(self._driver, locator.WidgetBar.INFO)

  def _get_widget(self, widget_name):
    """Add attribute, click on relevant tab and return relevant widget."""
    attr_name = "tab_" + widget_name
    setattr(
        self, attr_name,
        widget_bar.Tab(self._driver, factory.get_locator_widget(widget_name)))
    getattr(self, attr_name).click()
    return factory.get_cls_widget(widget_name)(self._driver, widget_name)

  def _click_button_add_widget(self):
    base.Dropdown(self._driver, locator.WidgetBar.BUTTON_ADD).click()

  def add_widget(self):
    """
    Return: lib.element.widget_bar.AddWidget
    """
    self._click_button_add_widget()
    return widget_bar.AddWidget(self._driver)

  def get_mappable_via_add_widgets_objs_aliases(self):
    """Returns the aliases of all currently available for mapping objects via
    'Add Tab' button in Horizontal Nav Bar.
    Return: list of str
    """
    # pylint: disable=invalid-name
    self._click_button_add_widget()
    add_elements = selenium_utils.get_when_all_visible(
        self._driver,
        locator.WidgetBarButtonAddDropdown.ALL_MAPPABLE_WIDGETS_OBJS)
    return [add_el.text for add_el in add_elements]

  def select_dashboard_tab(self):
    """Select 'Dashboard' tab on Object Widget Bar."""
    Button(self._driver, locator.WidgetBar.DASHBOARD_TAB).click()
    return selenium_utils.get_when_visible(
        self._driver, locator.DashboardWidget.TAB_CONTAINER_CSS)

  def is_dashboard_tab_exist(self):
    """Check is 'Dashboard' tab exist on Object Widget Bar."""
    return selenium_utils.is_element_exist(
        self._driver, locator.WidgetBar.DASHBOARD_TAB)

  def select_info(self):
    """Select Info widget/tab. Each object has different Info widget."""
    self.tab_info.click()
    return factory.get_cls_widget(
        self.__class__.__name__.lower(), is_info=True)(self._driver)

  def select_controls(self):
    """
    Return: lib.page.widget.generic_widget.Controls
    """
    return self._get_widget(element.WidgetBar.CONTROLS)

  def select_issues(self):
    """
    Return: lib.page.widget.generic_widget.Issues
    """
    return self._get_widget(element.WidgetBar.ISSUES)

  def select_processes(self):
    """
    Return: lib.page.widget.generic_widget.Processes
    """
    return self._get_widget(element.WidgetBar.PROCESSES)

  def select_data_assets(self):
    """
    Return: lib.page.widget.generic_widget.DataAssets
    """
    return self._get_widget(element.WidgetBar.DATA_ASSETS)

  def select_systems(self):
    """
    Return: lib.page.widget.generic_widget.Systems
    """
    return self._get_widget(element.WidgetBar.SYSTEMS)

  def select_products(self):
    """
    Return: lib.page.widget.generic_widget.Products
    """
    return self._get_widget(element.WidgetBar.PRODUCTS)

  def select_projects(self):
    """
    Return: lib.page.widget.generic_widget.Projects
    """
    return self._get_widget(element.WidgetBar.PROJECTS)

  def select_programs(self):
    """
    Return: lib.page.widget.generic_widget.Programs
    """
    return self._get_widget(element.WidgetBar.PROGRAMS)


class AdminDashboard(_WidgetBar):
  """Widget bar on Admin Dashboard."""

  def __init__(self, driver):
    super(AdminDashboard, self).__init__(driver)
    self.tab_people = widget_bar.Tab(
        self._driver, locator.WidgetBar.ADMIN_PEOPLE)
    self.tab_roles = widget_bar.Tab(
        self._driver, locator.WidgetBar.ADMIN_ROLES)
    self.tab_events = widget_bar.Tab(
        self._driver, locator.WidgetBar.ADMIN_EVENTS)
    self.tab_custom_attributes = widget_bar.Tab(
        self._driver, locator.WidgetBar.ADMIN_CUSTOM_ATTRIBUTE)
    self.tab_custom_roles = widget_bar.Tab(
        self._driver, locator.WidgetBar.ADMIN_CUSTOM_ATTRIBUTE)

  def select_people(self):
    """
    Return: lib.page.widget.admin_widget.People
    """
    self.tab_people.click()
    return admin_widget.People(self._driver)

  def select_roles(self):
    """
    Return: lib.page.widget.admin_widget.Roles
    """
    self.tab_roles.click()
    return admin_widget.Roles(self._driver)

  def select_events(self):
    """
    Return: lib.page.widget.admin_widget.Events
    """
    self.tab_events.click()
    return admin_widget.Events(self._driver)

  def select_custom_attributes(self):
    """
    Return: lib.page.widget.admin_widget.CustomAttributes
    """
    self.tab_custom_attributes.click()
    return admin_widget.CustomAttributes(self._driver)

  def select_custom_roles(self):
    # todo: Return: lib.page.widget.admin_widget.CustomRoles
    raise NotImplementedError


class Dashboard(_ObjectWidgetBar):
  """Widget bar on user's Dashboard."""


class Programs(_ObjectWidgetBar):
  """Widget bar of Program objects."""


class Workflows(_ObjectWidgetBar):
  """Widget bar of Workflow objects."""


class Audits(_ObjectWidgetBar):
  """Widget bar of Audit objects."""


class Assessments(_ObjectWidgetBar):
  """Widget bar of Assessment objects."""


class Issues(_ObjectWidgetBar):
  """Widget bar of Issue objects."""


class Regulations(_ObjectWidgetBar):
  """Widget bar of Regulation objects."""


class Policies(_ObjectWidgetBar):
  """Widget bar of Policy objects."""


class Standards(_ObjectWidgetBar):
  """Widget bar of Standard objects."""


class Contracts(_ObjectWidgetBar):
  """Widget bar of Contract objects."""


class Clauses(_ObjectWidgetBar):
  """Widget bar of Clause objects."""


class Reuirements(_ObjectWidgetBar):
  """Widget bar of Requirements objects."""


class Controls(_ObjectWidgetBar):
  """Widget bar of Control objects."""


class Objectives(_ObjectWidgetBar):
  """Widget bar of Objective objects."""


class People(_ObjectWidgetBar):
  """Widget bar of People objects."""


class OrgGroups(_ObjectWidgetBar):
  """Widget bar of Org Group objects."""


class Vendors(_ObjectWidgetBar):
  """Widget bar of Vendor objects."""


class AccessGroups(_ObjectWidgetBar):
  """Widget bar of Access Group objects."""


class Systems(_ObjectWidgetBar):
  """Widget bar of System objects."""


class Processes(_ObjectWidgetBar):
  """Widget bar of Process objects."""


class DataAssets(_ObjectWidgetBar):
  """Widget bar of Data Asset objects."""


class Products(_ObjectWidgetBar):
  """Widget bar of Product objects."""


class Projects(_ObjectWidgetBar):
  """Widget bar of Project objects."""


class Facilities(_ObjectWidgetBar):
  """Widget bar of Facility objects."""


class Markets(_ObjectWidgetBar):
  """Widget bar of Market objects."""


class Risks(_ObjectWidgetBar):
  """Widget bar of Risk objects."""


class Threats(_ObjectWidgetBar):
  """Widget bar of Threat objects."""
