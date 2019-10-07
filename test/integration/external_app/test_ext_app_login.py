# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for app 2 app login functionality"""
import json

import ddt
from mock import mock

from ggrc.models import all_models
from integration.external_app import external_api_helper
from integration.ggrc import TestCase


@ddt.ddt
class TestLogin(TestCase):
  """Tests for app to app login scenarios"""
  # pylint: disable=invalid-name

  @mock.patch(
      "ggrc.settings.SYNC_SERVICE_USER", new="sync_service <ss@example.com>"
  )
  def test_login_by_sync_service(self):
    """Test login app to app login (sync service)"""
    ext_api = external_api_helper.ExternalApiClient()
    response = ext_api.post(
        all_models.System,
        data={"system": {
            "title": "new_system",
            "context": None,
            "external_id": 11111,
            "external_slug": "11111",
        }}
    )

    self.assertEqual(201, response.status_code)
    system_id = response.json["system"]["id"]
    system = all_models.System.query.get(system_id)
    self.assertEqual(system.modified_by.email, "ss@example.com")
    self.assertEqual(system.modified_by.name, "sync_service")

    system_revision = all_models.Revision.query.filter_by(
        resource_type="System", resource_id=system_id
    ).one()
    self.assertEqual(system_revision.modified_by.email, "ss@example.com")
    self.assertEqual(system_revision.modified_by.name, "sync_service")

  @mock.patch(
      "ggrc.settings.SYNC_SERVICE_USER", new="sync_service <ss@example.com>"
  )
  @mock.patch("ggrc.settings.INTEGRATION_SERVICE_URL", new="mock")
  def test_login_by_sync_service_with_on_behalf(self):
    """Test login app to app login with on behalf user header"""
    ext_api = external_api_helper.ExternalApiClient()
    ext_api.user_headers = {
        "X-external-user":
        json.dumps({
            "email": "reg_user@example.com",
            "user": "John Doe",
        })
    }

    response = ext_api.post(
        all_models.System,
        data={"system": {
            "title": "new_system",
            "context": None,
            "external_id": 11111,
            "external_slug": "11111",
        }}
    )

    self.assertEqual(201, response.status_code)
    system_id = response.json["system"]["id"]
    system = all_models.System.query.get(system_id)
    self.assertEqual(system.modified_by.email, "reg_user@example.com")

    # because of INTEGRATION_SERVICE_URL=mock, we do not have real username
    self.assertEqual(system.modified_by.name, "reg_user@example.com")

    service_user = all_models.Person.query.filter_by(
        email="ss@example.com"
    ).one()
    self.assertIsNone(service_user.modified_by)

    created_person = all_models.Person.query.filter_by(
        email="reg_user@example.com"
    ).one()
    self.assertEquals(service_user.id, created_person.modified_by_id)

    system_revision = all_models.Revision.query.filter_by(
        resource_type="System", resource_id=system_id
    ).one()
    self.assertEqual(system_revision.modified_by.email, "reg_user@example.com")
    self.assertEqual(system_revision.modified_by.name, "reg_user@example.com")

  @mock.patch(
      "ggrc.settings.EXTERNAL_APP_USER", new="ext_app <ext@example.com>"
  )
  def test_login_by_external_app(self):
    """Test login app to app login (external app)"""
    ext_api = external_api_helper.ExternalApiClient(
        use_ggrcq_service_account=True
    )
    response = ext_api.post(
        all_models.System,
        data={"system": {
            "title": "new_system",
            "context": None,
            "external_id": 11111,
            "external_slug": "11111",
        }}
    )

    self.assertEqual(201, response.status_code)
    system_id = response.json["system"]["id"]
    system_revision = all_models.Revision.query.filter_by(
        resource_type="System", resource_id=system_id
    ).one()
    self.assertEqual(system_revision.modified_by.email, "ext@example.com")
    self.assertEqual(system_revision.modified_by.name, "ext_app")

  @mock.patch(
      "ggrc.settings.SYNC_SERVICE_USER", new="sync_service <ss@example.com>"
  )
  @mock.patch("ggrc.settings.INTEGRATION_SERVICE_URL", new="mock")
  @ddt.data("not_valid_json", "{}", "[]", "12")
  def test_login_with_wrong_ext_user(self, bad_header):
    """Test 'X-external-user' header validation"""
    ext_api = external_api_helper.ExternalApiClient()
    ext_api.user_headers = {
        "X-external-user": bad_header
    }

    response = ext_api.post(
        all_models.System,
        data={"system": {
            "title": "new_system",
            "context": None,
            "external_id": 11111,
            "external_slug": "11111",
        }}
    )
    self.assertEqual(400, response.status_code)

  @mock.patch(
      "ggrc.settings.SYNC_SERVICE_USER", new="sync_service <ss@example.com>"
  )
  @mock.patch("ggrc.settings.INTEGRATION_SERVICE_URL", new="mock")
  @ddt.data("not_valid_json", "{}", "[]", "12")
  def test_login_with_wrong_ggrc_user(self, bad_header):
    """Test 'X-ggrc-user' header validation"""
    ext_api = external_api_helper.ExternalApiClient()
    ext_api.user_headers = {
        "X-ggrc-user": bad_header
    }

    response = ext_api.post(
        all_models.System,
        data={"system": {
            "title": "new_system",
            "context": None,
            "external_id": 11111,
            "external_slug": "11111",
        }}
    )
    self.assertEqual(400, response.status_code)
