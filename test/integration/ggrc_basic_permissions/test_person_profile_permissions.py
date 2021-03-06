# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Test access to the PersonProfile."""

import ddt

from ggrc.models import all_models
from integration.ggrc import TestCase
from integration.ggrc.api_helper import Api
from integration.ggrc.generator import Generator
from integration.ggrc.generator import ObjectGenerator
from integration.ggrc.models import factories
from integration.ggrc_basic_permissions.models \
    import factories as rbac_factories


@ddt.ddt
class TestPersonProfilePermissions(TestCase):
  """Test PersonProfile."""

  def setUp(self):
    super(TestPersonProfilePermissions, self).setUp()
    self.generator = Generator()
    self.api = Api()
    self.object_generator = ObjectGenerator()
    self.init_users()

  def init_users(self):
    """Init user with different roles."""
    users = [("reader", "Reader"),
             ("editor", "Editor"),
             ("admin", "Administrator"),
             ("creator", "Creator")]
    self.users = {}
    for (name, role) in users:
      _, user = self.object_generator.generate_person(
          data={"name": name},
          user_role=role
      )
      self.users[name] = user

  @ddt.data("reader", "editor", "admin", "creator")
  def test_permissions(self, name):
    """Test permissions for user roles."""
    user = all_models.Person.query.get(self.users[name].id)
    profile_id = user.profile.id
    self.api.set_user(self.users[name])
    response = self.api.get(all_models.PersonProfile, profile_id)
    self.assert200(response)

    new_date = "2018-05-20 22:05:17"
    response = self.api.put(user.profile, {
        "people_profiles": {
            "id": profile_id,
            "last_seen_whats_new": new_date,
        },
    })
    self.assert200(response)

    response = self.api.delete(user.profile, profile_id)
    if name == "admin":
      self.assert200(response)
    else:
      self.assert403(response)

    res = self.api.get(all_models.PersonProfile, None)
    api_profiles = res.json["people_profiles_collection"]["people_profiles"]
    api_profile_id = api_profiles[0]["id"]

    if name == "admin":
      self.assertEqual(len(api_profiles), 4)
    else:
      self.assertEqual(len(api_profiles), 1)
      self.assertEqual(profile_id, api_profile_id)

  def test_program_editor_permissions(self):
    """Test checks that PE cannot delete objects mapped to program"""
    creator = all_models.Role.query.filter(
        all_models.Role.name == 'Creator').one()
    program_editor_email = 'creator@gmail.ru'
    issue_slug = 'ISSUE-1'
    with factories.single_commit():
      issue = factories.IssueFactory(slug=issue_slug)
      issue_id = issue.id
      program_editors = factories.PersonFactory(email=program_editor_email)
      rbac_factories.UserRoleFactory(role=creator,
                                     person=program_editors)
      program = factories.ProgramFactory(title="New program")
      factories.RelationshipFactory(
          source=program,
          destination=issue,
      )
      program.add_person_with_role_name(program_editors, "Program Editors")
    self.api.set_user(program_editors)
    issue = all_models.Issue.query.get(issue_id)
    response = self.api.delete(issue)
    self.assertStatus(response, 403)
