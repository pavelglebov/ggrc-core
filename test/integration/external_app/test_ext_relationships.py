# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for integration tests for Relationship."""

from ggrc.models import all_models
from integration.external_app.external_api_helper import ExternalApiClient

from integration.ggrc import TestCase
from integration.ggrc.models import factories


class TestExternalRelationshipNew(TestCase):
  """Integration test suite for External Relationship."""

  # pylint: disable=invalid-name

  def setUp(self):
    """Init API helper"""
    super(TestExternalRelationshipNew, self).setUp()
    self.ext_api = ExternalApiClient()

  def test_ext_app_delete_normal_relationship(self):
    """External app can't delete normal relationships"""

    with factories.single_commit():
      issue = factories.IssueFactory()
      objective = factories.ObjectiveFactory()

      relationship = factories.RelationshipFactory(
          source=issue, destination=objective, is_external=False
      )
      relationship_id = relationship.id
    ext_api = ExternalApiClient(use_ggrcq_service_account=True)
    resp = ext_api.delete("relationship", relationship_id)
    self.assertStatus(resp, 400)

  def test_ext_app_recreate_normal_relationship(self):
    """If ext app create already created relationship
    it has to be with is_external=False"""
    with factories.single_commit():
      obj_1 = factories.StandardFactory()
      obj_2 = factories.RegulationFactory()
      relationship = factories.RelationshipFactory(
          source=obj_1,
          destination=obj_2,
          is_external=False,
      )
      relationship_id = relationship.id
    ext_api = ExternalApiClient(use_ggrcq_service_account=False)

    response = ext_api.post(all_models.Relationship, data={
        "relationship": {
            "source": {"id": obj_1.id, "type": obj_1.type},
            "destination": {"id": obj_2.id, "type": obj_2.type},
            "is_external": True,
            "context": None,
        },
    })

    self.assert200(response)
    relationship = all_models.Relationship.query.get(relationship_id)
    self.assertFalse(relationship.is_external)

  def test_sync_service_delete_normal_relationship(self):
    """Sync service can delete normal relationships via unmap endpoint"""

    with factories.single_commit():
      issue = factories.IssueFactory()
      objective = factories.ObjectiveFactory()

      relationship = factories.RelationshipFactory(
          source=issue, destination=objective, is_external=False
      )
      relationship_id = relationship.id
    resp = self.ext_api.unmap(issue, objective)
    self.assert200(resp)
    rel = all_models.Relationship.query.get(relationship_id)
    self.assertIsNone(rel)
