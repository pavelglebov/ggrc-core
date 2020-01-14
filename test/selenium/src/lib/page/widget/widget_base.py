# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Base widget models."""
# pylint: disable=not-callable
# pylint: disable=not-an-iterable
# pylint: disable=too-few-public-methods

from lib import base
from lib.constants import locator, objects
from lib.element import info_widget_three_bbs
from lib.entities import entities_factory
from lib.utils import selenium_utils
from lib.utils.string_utils import StringMethods
from lib.page.modal import person_modal
from lib.page.widget import object_modal


class CustomAttributesItemContent(base.Component):
  """Model for 2-tier of custom attributes Tree View item."""
  _locators = locator.CustomAttributesItemContent

  def __init__(self, driver, item_text):
    super(CustomAttributesItemContent, self).__init__(driver)
    self.item_el = selenium_utils.get_when_visible(
        self._driver, self._locators.TREE_ITEM_EL_OPENED_CSS)
    self.add_btn = base.Button(self.item_el, self._locators.ADD_BTN_CSS)
    self.custom_attributes_list = []
    self._item_name = item_text

  def _set_custom_attributes_list(self):
    """Set custom attributes list with Custom Attribute objects from
    current opened content item.
    """
    for row in selenium_utils.get_when_all_visible(self._driver,
                                                   self._locators.ROW_CSS):
      attrs = [i.text for i in row.find_elements(
          *self._locators.CELL_IN_ROW_CSS)]
      # todo: add PO and getting 'multi_choice_options' via 'Edit' btn
      self.custom_attributes_list.append(
          entities_factory.CustomAttributeDefinitionsFactory().create(
              title=attrs[0], attribute_type=attrs[1],
              mandatory=(StringMethods.get_bool_value_from_arg(attrs[2])
                         if self._item_name != objects.ASSESSMENTS.title()
                         else None),
              definition_type=self._item_name, multi_choice_options=None))

  def get_ca_list_from_group(self):
    """Return list of Custom Attribute objects."""
    self._set_custom_attributes_list()
    return self.custom_attributes_list

  def open_add_new_ca_modal(self):
    """Open Add Attribute modal and return Custom Attribute Modal."""
    selenium_utils.wait_until_stops_moving(self.add_btn.element)
    selenium_utils.scroll_into_view(self._driver, self.item_el)
    selenium_utils.get_when_clickable(self._driver, self._locators.ADD_BTN_CSS)
    selenium_utils.wait_until_not_present(
        self._driver, self._locators.TREE_SPINNER_CSS)
    self.add_btn.click()
    return AddCustomAttributeModal(self._driver)

  def open_edit_ca_modal(self, index):
    """Click 'Edit' button to open edit modal for Custom Attribute from list
    with specified index (start from 0).

    Args:
      index (int)
    Returns:
      lib.page.widget.widget_base.CustomAttributeModal
    """
    self._browser.links(text="Edit")[index].click()
    selenium_utils.wait_for_js_to_load(self._driver)
    return EditCustomAttributeModal()


class EditCustomAttributeModal(object_modal.BaseFormModal):
  """Custom attribute edit modal."""

  def __init__(self, driver=None):
    super(EditCustomAttributeModal, self).__init__(driver)
    self.title_field = self._root.text_field(name="title")
    self.attribute_type_field = self._root.element(
        tag_name="dropdown-component").select()
    self.multi_choice_options_field = self._root.text_field(
        name="multi_choice_options")
    self._fields = ["mandatory", "helptext", "placeholder"]

  def set_helptext(self, value):
    """Sets helptext field with value."""
    self._root.text_field(name="helptext").set(value)

  def set_placeholder(self, value):
    """Sets placeholder field with value."""
    self._root.text_field(name="placeholder").set(value)

  def set_mandatory(self, value):
    """Sets mandatory checkbox according to the value."""
    self._root.checkbox(name="mandatory").set(bool(value))

  def get_custom_attribute_dict(self):
    """Return dict with custom attribute parameters according to visible fields
    in modal window."""
    data = {i.name: i.value for i in self._root.inputs()}
    data.update({"attribute_type": self._root.select().value,
                 "mandatory": self._root.checkbox().is_set})
    return data


class AddCustomAttributeModal(EditCustomAttributeModal):
  """Custom attribute creation modal."""

  def __init__(self, driver=None):
    super(AddCustomAttributeModal, self).__init__(driver)
    self._fields = ["title", "attribute_type", "mandatory", "helptext",
                    "placeholder", "multi_choice_options"]

  def set_attribute_type(self, value):
    """Sets attribute type dropdown with value."""
    self.attribute_type_field.select(value)

  def set_title(self, title):
    """Sets title field with value."""
    self.title_field.set(title)

  def set_multi_choice_options(self, value):
    """Sets multi choice options field with value."""
    self.multi_choice_options_field.set(value)


class DynamicTreeToggle(base.Toggle):
  """Tree item in Admin custom attribute widget."""
  def __init__(self, driver, el_locator):
    super(DynamicTreeToggle, self).__init__(driver, el_locator)
    self.element = driver.find_element(*el_locator)
    self.is_activated = selenium_utils.is_value_in_attr(self.element)


class PeopleItemContent(base.Component):
  """Model for 2-tier of People Tree View item."""

  def __init__(self, driver=None):
    super(PeopleItemContent, self).__init__(driver)
    self._root = self._browser.element(class_name="info")
    self._3bbs_menu = info_widget_three_bbs.PersonTreeItemThreeBbbs(self._root)

  def get_person(self):
    """Get person from people tree item."""
    fields = self._root.elements(class_name="span12")
    filled_fields = [i.text.splitlines() for i in fields
                     if not i.span(class_name="empty-message").exists]
    person_data = {k.lower(): v for (k, v) in filled_fields}
    return entities_factory.PeopleFactory().create(
        system_wide_role=person_data["system authorizations"], **person_data)

  def open_edit_modal(self):
    """Click "Edit Person" in dropdown menu."""
    self._3bbs_menu.select_edit()
    return person_modal.BasePersonModal(self._driver)

  def open_edit_authorizations_modal(self):
    """Click "Edit Authorizations" in dropdown menu."""
    self._3bbs_menu.select_edit_authorizations()
    return person_modal.UserRoleAssignmentsModal()
