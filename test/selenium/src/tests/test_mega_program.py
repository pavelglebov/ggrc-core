# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Mega program tests."""
# pylint: disable=no-self-use
# pylint: disable=invalid-name
import pytest

from lib import base, users
from lib.service import rest_facade, webui_facade, webui_service
from lib.ui import mega_program_ui_facade
from lib.constants import objects, messages


class TestMegaProgram(base.Test):
  """Tests for mega program feature."""

  @pytest.mark.smoke_tests
  def test_techenv_mapped_to_programs(
      self, programs_with_audit_and_techenv, selenium, soft_assert
  ):
    """ Check if Technology Environment is mapped to
        both program 1 and 2.
        Objects structure:
          Program 1
          -> Program 2
            -> Audit
              -> Technology Environment
        Preconditions:
        - Programs, Technology Environment created via REST API.
    """
    technology_environment = programs_with_audit_and_techenv['techenv']
    for program in programs_with_audit_and_techenv['programs']:
      webui_facade.soft_assert_objects_are_mapped(
          selenium, soft_assert, src_obj=program,
          objs=[technology_environment])
    soft_assert.assert_expectations()

  @classmethod
  def is_ggrc_8062(cls, program, selenium):
    """Checks if error GGRC-8062 is exist or not.

    This issue is about mega program icon which doesn't appear after mapping
    program to program until page is reloaded."""
    info_page = webui_service.ProgramsService().open_info_page_of_obj(program)
    has_icon_before_reloading = info_page.mega_program_icon.exists
    is_error_exist = False
    if not has_icon_before_reloading:
      selenium.refresh()
      has_icon_after_reloading = info_page.mega_program_icon.exists
      is_error_exist = ((has_icon_before_reloading,
                         has_icon_after_reloading) == (False, True))
    return is_error_exist

  @pytest.mark.smoke_tests
  def test_mapping_child_program_and_automapping(
      self, programs, selenium, soft_assert
  ):
    """Checks that user can map program 2 to program 1 as child and that
    automapping to program 1 of regulation which is mapped to program 2 works.

    Preconditions:
    - Two programs created via REST API."""
    first_program, second_program = programs
    regulation = rest_facade.create_regulation(second_program)
    mega_program_ui_facade.map_programs_via_add_tab_button(
        selenium, src_program=first_program, mapped_programs=[second_program])
    soft_assert.expect(
        self.is_ggrc_8062(first_program, selenium),
        "GGRC-8062 Mega program icon doesn't appear without reloading page",
        is_expected_error=True)
    info_page = webui_service.ProgramsService().open_info_page_of_obj(
        first_program)
    webui_facade.soft_assert_tab_with_number_exists(
        info_page, soft_assert, info_page.CHILD_PROGRAMS_TAB_NAME,
        len([second_program]))
    mega_program_ui_facade.soft_assert_mapping_child_program_and_automapping(
        selenium, first_program, second_program, regulation,
        users.current_user(), soft_assert)
    soft_assert.assert_expectations()

  @pytest.mark.smoke_tests
  def test_mega_program_icon_in_unified_mapper(
      self, mapped_programs, selenium
  ):
    """Checks if a mega program has a blue flag icon in unified mapper:
    open a parent program tab -> click the Map btn ->
    assert blue flag is visible
    """
    parent_program, child_program = mapped_programs
    webui_facade.check_mega_program_icon_in_unified_mapper(
        selenium, child_program=child_program, parent_program=parent_program)

  @pytest.mark.smoke_tests
  def test_disabled_mapping_to_itself_in_unified_mapper(
      self, selenium, program
  ):
    """Checks that mapping the program to itself functionality is disabled
    in Unified Mapper.

    Preconditions:
     - Program created via REST API.
    """
    program_mapper = webui_service.ProgramsService(
        obj_name=objects.PROGRAM_CHILDS, driver=selenium).get_unified_mapper(
            src_obj=program)
    program_item = program_mapper.tree_view.get_item_by_obj_name(program.title)
    assert program_item.is_checkbox_disabled, (
        messages.AssertionMessages.ITEM_CHECKBOX_SHOULD_BE_DISABLED.format(
            obj_name=program.title))

  def test_manual_unmapping_of_regulation(
      self, programs_with_regulation, selenium, soft_assert
  ):
    """Checks that after unmapping regulation from child program and
    unmapping child program from parent program regulation remains mapped to
    parent program."""
    parent_program, child_program = programs_with_regulation['programs']
    regulation = programs_with_regulation['regulation']
    webui_service.RegulationsService(selenium).unmap_via_info_panel(
        src_obj=child_program, obj=regulation)
    webui_facade.soft_assert_objects_are_mapped(
        selenium, soft_assert, src_obj=parent_program, objs=[regulation])
    (webui_service.ProgramsService(selenium, obj_name=objects.PROGRAM_CHILDS).
     unmap_via_info_panel(src_obj=parent_program, obj=child_program))
    webui_facade.soft_assert_objects_are_mapped(
        selenium, soft_assert, src_obj=parent_program, objs=[regulation])
    soft_assert.assert_expectations()
