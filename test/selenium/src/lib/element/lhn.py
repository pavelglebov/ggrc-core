# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: jernej@reciprocitylabs.com
# Maintained By: jernej@reciprocitylabs.com
"""A modul for elements contained in LHN"""

from selenium.common import exceptions as selenium_exception
from selenium.webdriver.common import action_chains
from lib import base
from lib import exception
from lib import selenium_utils
from lib.constants import locator


class _Tab(base.Tab):
  """The tab elemnt"""

  locator_element = None

  def __init__(self, driver):
    """
    Args:
        driver (base.CustomDriver
    """
    super(_Tab, self).__init__(driver, self.locator_element)


class MyObjectsTab(_Tab):
  """In the LHN my objects tab"""

  locator_element = locator.LhnMenu.MY_OBJECTS


class AllObjectsTab(_Tab):
  """In the LHN all objects tab"""

  locator_element = locator.LhnMenu.ALL_OBJECTS


class Button(base.Button):
  """A button in LHN"""

  def __init__(self, driver, locator_element, locator_count):
    super(Button, self).__init__(driver, locator_element)
    count_element = self._driver.find_element(*locator_count)
    self.members_count = int(count_element.text)


class DropdownStatic(base.Dropdown):
  """Dropdown in LHN"""

  _locator_element = None

  def __init__(self, driver):
    super(DropdownStatic, self).__init__(driver, self._locator_element)


class AccordionGroup(base.DropdownDynamic):
  """A model for LHN's accoridon group"""

  _locator_spinny = None
  _locator_button_create_new = None
  _locator_accordeon_members = None

  # modal class which is used when creating a new object
  _create_new_modal_cls = None

  _extended_info_cls = None

  def __init__(self, driver):
    """
    Args:
        driver (base.CustomDriver)
    """
    super(AccordionGroup, self).__init__(
        driver,
        [self._locator_spinny],
        wait_until_visible=False)

    self.button_create_new = base.Button(
        self._driver, self._locator_button_create_new)

    self._update_loaded_members()
    self._set_visible_members()

  def _update_loaded_members(self):
    self.members_loaded = self._driver.find_elements(
        *self._locator_accordeon_members)

  def _set_visible_members(self):
    try:
        [selenium_utils.wait_until_stops_moving(el)
         for el in self.members_loaded]

        self.members_visible = [el for el in self.members_loaded
                                if el.is_displayed()]
    except selenium_exception.StaleElementReferenceException:
        self._update_loaded_members()
        self._set_visible_members()

  def _get_visible_member_by_title(self, member_title):
    """Hovers over a visible member with the (unique) title "member_title"

    Args:
        member_title (str or unicode): a (unique) title of a member
    Returns:
        selenium.webdriver.remote.webelement.WebElement
    """
    try:
        for el in self.members_visible:
            if el.text == member_title:
                break
        else:
            raise exception.ElementNotFound

        return el
    except selenium_exception.StaleElementReferenceException:
        # the elements can go stale, here we refresh them
        self._update_loaded_members()
        self._set_visible_members()
        return self._get_visible_member_by_title(member_title)

  def scroll_down(self):
    pass

  def scroll_up(self):
    pass

  def create_new(self):
    """Creates a new modal for the object in the LHN

    Returns:
        lib.base.Modal
    """
    self.button_create_new.click()
    return self._create_new_modal_cls(self._driver)

  def hover_over_visible_member(self, member_title):
    """Hovers over a visible member with the (unique) title "member_title"

    Args:
        member_title (str or unicode): a (unique) title of a member
    Returns:

    """
    try:
        el = self._get_visible_member_by_title(member_title)
        action_chains.ActionChains(self._driver).move_to_element(el).perform()
        selenium_utils.get_when_visible(self._driver,
                                        locator.LhnMenu.EXTENDED_INFO)
        return self._extended_info_cls(self._driver)
    except selenium_exception.StaleElementReferenceException:
        return self.hover_over_visible_member(member_title)

