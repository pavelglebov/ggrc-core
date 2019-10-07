# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for System model that synced from external source."""

from ggrc import db
from ggrc.models import all_models
from integration.external_app import external_api_helper
from integration.ggrc import TestCase
from integration.ggrc.models import factories


class TestSoxSystem(TestCase):
  """Tests for Sox System model."""

  def setUp(self):
    """Test setup method."""
    super(TestSoxSystem, self).setUp()
    self.external_id = factories.SynchronizableExternalId.next()
    self.external_slug = "external_slug-{}".format(self.external_id)
    self.ext_api = external_api_helper.ExternalApiClient()

  def test_system_acl_create(self):
    """Test creation of SOX system with non empty acl."""
    response = self.ext_api.post(all_models.System, data={
        "system": {
            "title": "new_system",
            "context": None,
            "external_id": self.external_id,
            "external_slug": self.external_slug,
            "access_control_list": {"Admin": [
                {
                    "email": "user1@example.com",
                    "name": "user1",
                },
            ]}
        }
    })

    self.assertEqual(201, response.status_code)

    system = all_models.System.query.get(response.json["system"]["id"])
    actual_people = system.get_persons_for_rolename("Admin")
    expected_people = all_models.Person.query.filter_by(
        email="user1@example.com"
    ).all()
    self.assertItemsEqual(actual_people, expected_people)

  def test_system_acl_update(self):
    """Test updating of SOX system with non empty acl."""
    with factories.single_commit():
      system = factories.SystemFactory()
      person = factories.PersonFactory()
      system.add_person_with_role_name(person, "Admin")

    response = self.ext_api.put(system, system.id, data={
        "access_control_list": {
            "Admin": [
                {
                    "email": "user1@example.com",
                    "name": "user1",
                },
                {
                    "email": "user2@example.com",
                    "name": "user2",
                },
            ]
        },
    })
    self.assert200(response)
    system = all_models.System.query.get(system.id)
    actual_people_ids = system.get_person_ids_for_rolename("Admin")
    expected_people_ids = db.session.query(all_models.Person.id).filter(
        all_models.Person.email.in_(("user1@example.com", "user2@example.com"))
    ).all()
    self.assertItemsEqual(
        actual_people_ids,
        [i[0] for i in expected_people_ids]
    )

  def test_system_external_put(self):
    """Test updating of System without If-Match/If-Unmodified-Since headers."""
    system = factories.SystemFactory()

    data = {
        "system": {
            "id": system.id,
            "external_id": system.external_id,
            "external_slug": system.external_slug,
            "title": "updated system",
            "test_plan": "test plan",
            "notes": "test notes",
            "description": "test description",
            "slug": "SYSTEM-{}".format(system.id),
        }
    }
    response = self.ext_api.put(system, system.id, data=data)
    self.assert200(response, response.data)
    system = all_models.System.query.get(system.id)
    self.assertEqual(system.title, "updated system")

  def test_system_external_post(self):
    """Test creation of new System by external service."""
    data = {
        "system": {
            "title": "new system",
            "external_id": self.external_id,
            "external_slug": self.external_slug,
            "test_plan": "test plan",
            "notes": "test notes",
            "description": "test description",
        }
    }
    response = self.ext_api.post(all_models.System, data=data)
    self.assertStatus(response, 201, response.data)
    system = all_models.System.query.get(response.json["system"]["id"])
    self.assertEqual(system.title, "new system")
