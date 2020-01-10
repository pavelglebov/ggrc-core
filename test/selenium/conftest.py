# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""PyTest fixtures."""
# pylint: disable=invalid-name
# pylint: disable=global-variable-not-assigned
# pylint: disable=unused-argument
# pylint: disable=redefined-outer-name
# pylint: disable=broad-except
# pylint: disable=inconsistent-return-statements
import copy
import logging
import os
import urlparse

import pytest
# Workaround https://github.com/pytest-dev/pytest/issues/3775
from pytest_selenium import pytest_selenium as pt_selenium
from selenium.webdriver.remote.remote_connection import (
    LOGGER as SELENIUM_LOGGER)

from lib import dynamic_fixtures, environment, url, users, browsers
from lib.constants import element, roles, workflow_repeat_units
from lib.custom_pytest_scheduling import CustomPytestScheduling
from lib.entities import entities_factory
from lib.page import dashboard
from lib.page.widget import controls_tab
from lib.rest_facades import (
    control_rest_facade, person_rest_facade, workflow_rest_facade)
from lib.rest_services import workflow_rest_service
from lib.service import rest_facade, rest_service
from lib.service.rest import session_pool
from lib.utils import conftest_utils, help_utils, selenium_utils, app_utils, \
    assert_utils
from lib.utils.selenium_utils import get_full_screenshot_as_base64


def pytest_xdist_make_scheduler(config, log):
  """Set the test scheduler for Pytest-xdist to a custom scheduler"""
  return CustomPytestScheduling(config, log)


def pytest_runtest_setup(item):
  """Set test variables that depend on dev server used
  (`dev` or `dev_destructive`):
  * environment.app_url
  * dev_log_retriever
  """
  if CustomPytestScheduling.is_destructive_test(item.name, str(item.cls)):
    environment.app_url = os.environ["DEV_DESTRUCTIVE_URL"]
    filename = os.environ["DEV_DESTRUCTIVE_LOG"]
  else:
    environment.app_url = os.environ["DEV_URL"]
    filename = os.environ["DEV_LOG"]
  environment.app_url = urlparse.urljoin(environment.app_url, "/")
  item.dev_log_retriever = conftest_utils.DevLogRetriever(filename)


@pytest.mark.hookwrapper
def pytest_runtest_makereport(item, call):
  """Add dev server log as an extra link to HTML report"""
  outcome = yield
  report = outcome.get_result()
  extra = getattr(report, "extra", [])
  xfail = hasattr(report, "wasxfail")
  failure = (report.skipped and xfail) or (report.failed and not xfail)
  pytest_html = item.config.pluginmanager.getplugin("html")
  has_dev_log_retriever = hasattr(item, "dev_log_retriever")
  if failure and pytest_html is not None and has_dev_log_retriever:
    dev_logs = item.dev_log_retriever.get_added_logs()
    extra.append(pytest_html.extras.text(dev_logs, "Dev Server Log"))
  report.extra = extra


def patch_pytest_selenium_screenshot():
  """Patch pytest-selenium's _gather_screenshot function to make screenshot
  of the full page."""
  # pylint: disable=protected-access

  def gather_screenshot(item, report, driver, summary, extra):
    """Add link to the screenshot of the full page to HTML report"""
    try:
      # Only below line is changed
      screenshot = get_full_screenshot_as_base64(driver)
    except Exception as e:
      summary.append('WARNING: Failed to gather screenshot: {0}'.format(e))
      return
    pytest_html = item.config.pluginmanager.getplugin('html')
    if pytest_html is not None:
      extra.append(pytest_html.extras.image(screenshot, 'Screenshot'))

  pt_selenium._gather_screenshot = gather_screenshot


patch_pytest_selenium_screenshot()


def pytest_addoption(parser):
  """Add support for headless option to pytest-selenium."""
  parser.addoption('--headless',
                   action='store',
                   help='enable headless mode for supported browsers.')


# Disable selenium's remote_connection.py DEBUG statements that pollute
# test stdout.
# They aren't needed as driver logs are included into links of HTML report.
SELENIUM_LOGGER.setLevel(logging.INFO)


@pytest.fixture(autouse=True)
def reset_dict_executed_fixtures():
  """Reset dict_executed_fixtures between tests"""
  dynamic_fixtures.dict_executed_fixtures = {}


@pytest.fixture(scope="session")
def session_capabilities(session_capabilities):
  """Log browser (console log) and performance (request / response headers)
  data.
  They will appear in `Links` section of pytest-html's html report.
  """
  session_capabilities["loggingPrefs"] = {
      "browser": "ALL",
      "performance": "ALL"
  }
  return session_capabilities


@pytest.fixture(scope="function")
def selenium(selenium, pytestconfig):
  """Create Web Driver instance."""
  if not selenium_utils.is_headless_chrome(pytestconfig):
    selenium.set_window_size(
        os.environ["SCREEN_WIDTH"], os.environ["SCREEN_HEIGHT"])
  dynamic_fixtures.dict_executed_fixtures.update({"selenium": selenium})
  browsers.set_driver(selenium)
  yield selenium


@pytest.fixture(scope="function")
def create_tmp_dir(tmpdir_factory, request):
  """Create temporary directory for test and return unconditional full path to
  it according to the next rule:
  selenium/tmp/'name of test method with parameters'.
  Example:
  Test's path to run:
  selenium/src/tests/test_audit_page.py::TestAuditPage::()::
  test_asmts_generation[Assessments generation without Assessment Template]
  Test's temp directory:
  selenium/tmp/
  test_asmts_generation[Assessments generation without Assessment Template]
  """
  test_name = request.node.name
  test_tmp_dir = tmpdir_factory.mktemp(test_name, numbered=True)
  yield test_tmp_dir.strpath


@pytest.fixture
def chrome_options(chrome_options, pytestconfig):
  """Set configuration to run Chrome with specific options."""
  if selenium_utils.is_headless_chrome(pytestconfig):
    chrome_options.set_headless(True)
    chrome_options.add_argument("window-size={},{}".format(
        os.environ["SCREEN_WIDTH"], os.environ["SCREEN_HEIGHT"]))
  return chrome_options


# `PeopleFactory.superuser` uses `environment.app_url` and `current user`.
# It is used in @pytest.mark.parametrize parameters.
# Parametrize parameters are evaluated before fixtures so
# `environment.app_url` and `current user` should be already set.
environment.app_url = os.environ["DEV_URL"]
environment.app_url = urlparse.urljoin(environment.app_url, "/")
users.set_current_user(users.FAKE_SUPER_USER)


@pytest.fixture(autouse=True)
def set_superuser_as_current_user():
  """Set super user as a current user"""
  # pylint: disable=protected-access
  users._current_user = users.FAKE_SUPER_USER
  users.set_current_user(entities_factory.PeopleFactory.superuser)


@pytest.fixture(autouse=True)
def reset_state(request):
  """Reset caches of logged in users and requests sessions.
  Cache with logged in users is used to check if user has already logged in.
  Cache with sessions is used to reuse REST sessions between requests.
  """
  if "selenium" not in request.fixturenames:
    # Reset driver for non-browser tests.
    browsers.set_driver(None)
  users.reset_logged_in_users()
  session_pool.reset_sessions()


# Legacy app fixtures

def _common_fixtures(fixture):
  """Generate common fixtures and return global dictionary of executed
  common fixtures.
  """
  dynamic_fixtures.generate_common_fixtures(fixture)
  if isinstance(fixture, tuple):
    fixture, _ = fixture
  fixture = dynamic_fixtures.dict_executed_fixtures[fixture]
  return (help_utils.get_single_obj(fixture)
          if not help_utils.is_multiple_objs(fixture) else fixture)


def _snapshots_fixtures(fixturename):
  """Generate snapshot fixtures used generation of common fixtures and return
  dictionary of executed common fixtures in scope of snapshot fixtures.
  """
  return dynamic_fixtures.generate_snapshots_fixtures(fixturename)


@pytest.fixture(scope="function")
def my_work_dashboard(selenium):
  """Open My Work Dashboard URL and
  return My Work Dashboard page objects model."""
  selenium_utils.open_url(url.Urls().dashboard)
  return dashboard.Dashboard(selenium)


@pytest.fixture(scope="function")
def header_dashboard(selenium):
  """Open My Work Dashboard URL and
  return Header Dashboard page objects model."""
  selenium_utils.open_url(url.Urls().dashboard)
  return dashboard.Header(selenium)


@pytest.fixture()
def dashboard_controls_tab(selenium):
  """Open My Work Dashboard Controls Tab URL and
  return Controls Tab page objects model."""
  selenium_utils.open_url(url.Urls().dashboard_controls_tab)
  return controls_tab.ControlsTab()


@pytest.fixture(scope="function")
def new_program_rest(request):
  """Create new Program object via REST API.
  Return: lib.entities.entity.ProgramEntity
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_programs_rest(request):
  """Create new Programs objects via REST API.
  Return: [lib.entities.entity.ProgramEntity, ...]
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_control_rest(request):
  """Create new Control object via REST API.
  Return: lib.entities.entity.ControlEntity
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_controls_rest(request):
  """Create new Controls objects via REST API.
  Return: [lib.entities.entity.ControlEntity, ...]
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_controls_rest_snapshot(request):
  """Return snapshots of Controls objects via REST API.
  Return: [lib.entities.entity.ControlEntity, ...]
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_objective_rest(request):
  """Create new Objective object via REST API.
  Return: lib.entities.entity.ObjectiveEntity
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_objectives_rest(request):
  """Create new Objective objects via REST API.
  Return: [lib.entities.entity.ObjectiveEntity, ...]
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_audit_rest(request):
  """Create new Audit under Program object via REST API.
  Return: lib.entities.entity.AuditEntity
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_audits_rest(request):
  """Create new Controls objects via REST API.
  Return: [lib.entities.entity.AuditEntity, ...]
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_assessment_rest(request):
  """Create new Assessment under Audit object via REST API.
  Return: lib.entities.entity.AssessmentEntity
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_assessments_rest(request):
  """Create new Assessments objects via REST API.
   Return: [lib.entities.entity.AssessmentEntity, ...]
   """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_issue_rest(request):
  """Create new Issue under Audit object via REST API.
  Return: lib.entities.entity.IssueEntity
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_assessment_template_rest(request):
  """Create new Assessment Template under Audit object via REST API.
  Return: lib.entities.entity.AssessmentTemplateEntity
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_cas_for_assessments_rest(request):
  """New global Custom Attributes for assessments created via REST API.
  Teardown - remove created gCAs.
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def new_cas_for_controls_rest(request):
  """Create new Global Custom Attributes for Controls via REST API and
  delete GCAs as teardown section.
  """
  cas = _common_fixtures(request.fixturename)
  yield cas


@pytest.fixture(scope="function")
def create_audit_with_control(
    program, control_mapped_to_program, audit
):
  """Create Program and Control, map Control to Program, create Audit
  under Program via REST API and return dictionary of executed fixtures.
  """
  return {"program": program,
          "control": control_mapped_to_program,
          "audit": audit}


@pytest.fixture(scope="function")
def create_audit_with_control_and_update_control(
    program, control_mapped_to_program, audit
):
  """Create Program and Control, map Control to Program, create Audit
  under Program, update Control via REST API and return dictionary of executed
  fixtures.
  """
  return {"program": program,
          "control": copy.deepcopy(control_mapped_to_program),
          "audit": audit,
          "updated_control": rest_facade.update_object(
              control_mapped_to_program)}


@pytest.fixture(scope="function")
def create_audit_with_control_and_delete_control(
    program, control_mapped_to_program, audit
):
  """Create Program and Control, map Control to Program, create Audit
  under Program, delete Control via REST API and return dictionary of executed
  fixtures.
  """
  return {"program": program,
          "control": copy.deepcopy(control_mapped_to_program),
          "audit": audit,
          "deleted_control": rest_service.ControlsService().delete_objs(
              control_mapped_to_program)}


@pytest.fixture(scope="function")
def create_audit_with_control_with_cas_and_update_control_cav(
    program, gcads_for_control, control_mapped_to_program, audit
):
  """Create Program, GCAs for Control and Control, map Control to Program,
  create Audit under Program, update Control via REST API and return
  dictionary of executed fixtures.
  """
  from lib.entities.entities_factory import CustomAttributeDefinitionsFactory
  cavs = [cav.__dict__ for cav
          in CustomAttributeDefinitionsFactory.generate_cavs(
              cads=gcads_for_control)]
  return {"program": program,
          "control": copy.deepcopy(control_mapped_to_program),
          "audit": audit,
          "updated_control": rest_facade.update_object(
              control_mapped_to_program, custom_attribute_values=cavs)}


@pytest.fixture(scope="function")
def create_audit_with_control_with_cas_and_delete_cas_for_controls(
    program, gcads_for_control, control_mapped_to_program, audit
):
  """Create Program and Control, map Control to Program, create Audit
  under Program, delete Control via REST API and return dictionary of executed
  fixtures.
  """
  for gca in gcads_for_control:
    rest_service.CustomAttributeDefinitionsService().delete_objs(gca)
  return {"program": program,
          "control": copy.deepcopy(control_mapped_to_program),
          "audit": audit,
          "updated_control": rest_facade.get_obj(control_mapped_to_program)}


@pytest.fixture(scope="function")
def map_new_control_rest_to_new_objective_rest(request):
  """Map Objective to Control object via REST API return response from server.
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def map_new_control_rest_to_new_objectives_rest(request):
  """Map Objectives to Control object via REST API return response from server.
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def map_new_program_rest_to_new_objective_rest(request):
  """Map Objective to Program object via REST API return response from server.
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def map_new_program_rest_to_new_control_rest(request):
  """Map Control to Program object via REST API return response from server.
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def map_new_assessment_rest_to_new_issue_rest(request):
  """Map Objectives to Control object via REST API return response from server.
  """
  yield _common_fixtures(request.fixturename)


@pytest.fixture(scope="function")
def map_new_assessment_rest_to_new_control_rest_snapshot(
    assessment, control_mapped_to_program
):
  """Map Assessment to Control object via REST API return response from server.
  """
  return rest_facade.map_objs(assessment, control_mapped_to_program)


def _common_request_param(request):
  """Processing for common fixtures of request object which gives access to the
  requesting test context and has an optional param attribute in case the
  fixture is parametrized indirectly.
  """
  # todo implement '_snapshot_request_param'
  if hasattr(request, "param") and request.param:
    params = request.param
    return (({param: _common_fixtures(param) for param in params}
            if isinstance(params, list) else _common_fixtures(params)) if
            params else None)


@pytest.fixture(scope="function")
def dynamic_create_audit_with_control(request):
  """Create Program and Control, map Control to Program, create Audit
  under Program and dynamically make manipulations on Control (update,
  delete, ...) via REST API according to fixturename. Fixturename is indirect
  parameter that get from 'request.param' and have to be string or boolean.
  Return: lib.entities.entity.AssessmentTemplateEntity
  """
  if hasattr(request, "param") and request.param:
    yield (dynamic_fixtures.generate_snapshots_fixtures(request.param) if
           request.param else None)


@pytest.fixture(scope="function")
def dynamic_objects(request):
  """Create new object or objects via REST API or UI according to indirect
  parameter 'request.param' which can be: str, list of str, bool.
  Examples:
  - 'new_program_rest': lib.entities.entity.ProgramEntity;
  - 'new_programs_rest': [lib.entities.entity.ProgramEntity, ...];
  - ['new_program_rest', 'new_control_rest']:
    {'new_program_rest': lib.entities.entity.ProgramEntity,
     'new_control_rest': lib.entities.entity.ControlEntity};
  - True: None.
  """
  yield _common_request_param(request)


@pytest.fixture(scope="function")
def dynamic_objects_w_factory_params(request):
  """Create new object or objects via REST API or UI according to indirect
  parameter 'request.param' and w/ the same logic as 'dynamic_objects' fixture
  but using extra parameters to have option change default flow.
  """
  yield _common_request_param(request)


@pytest.fixture(scope="function")
def dynamic_relationships(request):
  """Create single or multiply relationships between source and destinations
  objects via REST API according to indirect parameter 'request.param' which
  can be: str, list of str, bool and return response or responses from server.
  Example:
  - 'map_new_program_rest_to_new_control_rest';
  - {'map_new_program_rest_to_new_control_rest': resp1,
     'map_new_control_rest_to_new_objective_rest': resp2}.
  """
  yield _common_request_param(request)


# New app fixtures

@pytest.fixture()
def creator():
  """Create user with role 'Creator'."""
  return rest_facade.create_user_with_role(roles.CREATOR)


@pytest.fixture()
def second_creator():
  """Create user with role 'Creator'."""
  return rest_facade.create_user_with_role(roles.CREATOR)


@pytest.fixture()
def third_creator():
  """Create user with role 'Creator'."""
  return rest_facade.create_user_with_role(roles.CREATOR)


@pytest.fixture()
def editor():
  """Create user with role 'Editor'."""
  return rest_facade.create_user_with_role(roles.EDITOR)


@pytest.fixture()
def login_as_creator(creator):
  """Login by user with role 'Creator'."""
  users.set_current_user(creator)


@pytest.fixture()
def login_as_second_creator(second_creator):
  """Login by user with role 'Creator'."""
  users.set_current_user(second_creator)


@pytest.fixture()
def program():
  """Create a program."""
  return rest_facade.create_program()


@pytest.fixture()
def programs():
  """Create 2 programs."""
  return [rest_facade.create_program() for _ in xrange(2)]


@pytest.fixture()
def product():
  """Creates a product."""
  return rest_facade.create_product()


@pytest.fixture()
def risk():
  """Creates a risk."""
  return rest_facade.create_risk()


@pytest.fixture()
def project():
  """Creates a project."""
  return rest_facade.create_project()


@pytest.fixture()
def mapped_programs(programs):
  """Creates 2 programs and maps the second program to the first
  one as a child"""
  rest_facade.map_objs(*programs)
  return programs


@pytest.fixture()
def programs_with_audit_and_techenv(mapped_programs, technology_environment):
  """Creates 2 programs (the second program is a child of the first one)
  and 1 technology environment objects, then creates an Audit
  in scope of program 2 and finally maps Technology Environment object
  to Audit."""
  audit = rest_facade.create_audit(mapped_programs[1])
  rest_facade.map_objs(audit, technology_environment)
  return {'programs': mapped_programs,
          'audit': audit,
          'techenv': technology_environment}


@pytest.fixture()
def issue():
  """Create an issue mapped to the program"""
  return rest_facade.create_issue(obj=None)


@pytest.fixture()
def issue_mapped_to_program(program):
  """Create an issue mapped to the program"""
  return rest_facade.create_issue(program)


@pytest.fixture()
def issue_mapped_to_audit(audit):
  """Create an issue mapped to the program"""
  return rest_facade.create_issue(audit)


@pytest.fixture()
def control():
  """Create a control."""
  return rest_facade.create_control()


@pytest.fixture()
def controls():
  """Create 2 controls."""
  return [rest_facade.create_control() for _ in xrange(2)]


@pytest.fixture()
def technology_environment():
  """Create a technology environment."""
  return rest_facade.create_technology_environment()


@pytest.fixture()
def control_mapped_to_program(program):
  """Create a control mapped to the program"""
  control = rest_facade.create_control()
  rest_facade.map_objs(program, control)
  return control


@pytest.fixture()
def controls_mapped_to_program(program):
  """Create 2 controls mapped to the program"""
  controls = [rest_facade.create_control() for _ in xrange(2)]
  for control in controls:
    rest_facade.map_objs(program, control)
  return controls


@pytest.fixture()
def objective_mapped_to_program(program):
  """Create an objective mapped to the program"""
  return rest_facade.create_objective(program)


@pytest.fixture()
def objectives_mapped_to_program(program):
  """Create 2 objectives mapped to the program"""
  return [rest_facade.create_objective(program) for _ in xrange(2)]


@pytest.fixture()
def audit(program):
  """Create an audit within program"""
  return rest_facade.create_audit(program)


@pytest.fixture()
def audit_w_auditor(program, second_creator):
  """Create an audit within program and set a user with global creator role as
  an auditor."""
  return rest_facade.create_audit(program, auditors=second_creator)


@pytest.fixture()
def audits(program):
  """Create 2 audits mapped to the program"""
  return [rest_facade.create_audit(program) for _ in xrange(2)]


@pytest.fixture()
def assessment_template_rest(audit):
  """Create asmt template with all ca types."""
  return rest_facade.create_asmt_template(
      audit, assessment_type="Control")


@pytest.fixture()
def assessment_template_with_all_cas_rest(audit):
  """Create asmt template with all ca types."""
  return rest_facade.create_asmt_template(
      audit, all_cad_types=True, assessment_type="Control")


@pytest.fixture()
def assessment_from_template(
    audit, assessment_template_with_all_cas_rest, control_mapped_to_program
):
  """Create assessment from template."""
  return rest_facade.create_asmt_from_template(
      audit, assessment_template_with_all_cas_rest,
      [control_mapped_to_program])


@pytest.fixture()
def assessments_from_template(
    audit, assessment_template_with_all_cas_rest, controls_mapped_to_program
):
  """Create 2 assessments from template."""
  return rest_facade.create_asmts_from_template(
      audit, assessment_template_with_all_cas_rest, controls_mapped_to_program)


@pytest.fixture()
def assessment(audit):
  """Creates an assessment within audit."""
  return rest_facade.create_asmt(audit)


@pytest.fixture()
def assessments(audit):
  """Creates an assessment within audit."""
  return [rest_facade.create_asmt(audit) for _ in xrange(2)]


@pytest.fixture()
def gcads_for_asmt():
  """Creates GCADs of all types for Assessment."""
  return [rest_facade.create_gcad(definition_type="assessment",
                                  attribute_type=ca_type)
          for ca_type in element.AdminWidgetCustomAttributes.ALL_GCA_TYPES]


@pytest.fixture()
def gcads_for_control():
  """Creates GCADs of all types for Control."""
  return rest_facade.create_gcads_for_control()


@pytest.fixture()
def obj(request):
  """A fixture that calls any other fixture when parametrization
  with indirect is used.
  """
  if hasattr(request, "param") and request.param:
    return request.getfixturevalue(request.param)


@pytest.fixture()
def mapped_obj(request, obj):
  """Fixture calls other fixture to create an object and map it to
  object from 'obj' fixture."""
  if hasattr(request, "param") and request.param and obj:
    obj_to_map = request.getfixturevalue(request.param)
    rest_facade.map_objs(obj_to_map, obj)
    return obj_to_map


# New fixtures

@pytest.fixture(scope="function")
def lhn_menu(selenium):
  """Open LHN menu and return LHN page objects model."""
  selenium_utils.open_url(url.Urls().dashboard)
  return dashboard.Dashboard(selenium).header.open_lhn_menu()


@pytest.fixture()
def app_workflow():
  """Creates a Workflow."""
  return workflow_rest_facade.create_workflow()


@pytest.fixture()
def activated_workflow(app_workflow):
  """Creates an activated workflow."""
  task_group = workflow_rest_facade.create_task_group(
      workflow=app_workflow)
  workflow_rest_facade.create_task_group_task(task_group=task_group)
  workflow_rest_service.WorkflowRestService().activate(app_workflow)
  return app_workflow


@pytest.fixture()
def app_repeat_on_workflow():
  """Creates a repeat on workflow."""
  return workflow_rest_facade.create_workflow(
      repeat_every=1, repeat_unit=workflow_repeat_units.WEEKDAY)


@pytest.fixture()
def activated_repeat_on_workflow(app_repeat_on_workflow):
  """Creates an activated repeat on workflow."""
  task_group = workflow_rest_facade.create_task_group(
      workflow=app_repeat_on_workflow)
  workflow_rest_facade.create_task_group_task(task_group=task_group)
  app_utils.workaround_edit_without_non_api_request()
  workflow_rest_service.WorkflowRestService().activate(app_repeat_on_workflow)
  return app_repeat_on_workflow


@pytest.fixture()
def app_task_group(app_workflow):
  """Creates a Task Group within `app_workflow`."""
  return workflow_rest_facade.create_task_group(workflow=app_workflow)


@pytest.fixture()
def app_task_group_task(app_task_group):
  """Creates a Task Group Task within `app_task_group`."""
  return workflow_rest_facade.create_task_group_task(task_group=app_task_group)


@pytest.fixture()
def app_person():
  """Creates a Person."""
  return person_rest_facade.create_person()


@pytest.fixture()
def app_control():
  """Creates a control."""
  return control_rest_facade.create_control()


@pytest.fixture()
def standard():
  """Creates a Standard."""
  return rest_facade.create_standard()


@pytest.fixture()
def soft_assert():
  """Fixture for soft assertions."""
  return assert_utils.SoftAssert()


@pytest.fixture()
def regulation_mapped_to_program(program, control_mapped_to_program):
  """Create Regulation under Program."""
  return rest_facade.create_regulation(program)


@pytest.fixture()
def requirement_mapped_to_program(program, control_mapped_to_program):
  """Create Requirement under Program."""
  return rest_facade.create_requirement(program)


@pytest.fixture()
def obj_mapped_to_control(request, control_mapped_to_program):
  """Fixture calls other fixture to create an object and map the object to
  Control."""
  obj = request.getfixturevalue(request.param)
  rest_facade.map_objs(obj, control_mapped_to_program)
  return obj


@pytest.fixture()
def audit_w_manually_mapped_control_and_obj_mapped_to_control(
    program, control_mapped_to_program, obj_mapped_to_control
):
  """"Create an audit within program and manually map it to control and
  object mapped to control."""
  audit = rest_facade.create_audit(program=program, manual_snapshots=True)
  rest_facade.map_objs(audit, control_mapped_to_program)
  rest_facade.map_objs(obj_mapped_to_control, audit)
  return audit


@pytest.fixture()
def asmt_w_control_snapshot(obj, control_mapped_to_program):
  """Creates an assessment with control snapshot."""
  asmt = rest_facade.create_asmt(obj)
  rest_facade.map_to_snapshot(asmt, obj=control_mapped_to_program,
                              parent_obj=obj)
  return asmt
