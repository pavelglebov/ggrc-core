# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for /api/assessments endpoints."""

import ddt

from ggrc.models import all_models
from integration.ggrc import api_helper
from integration.ggrc.models import factories
from integration.ggrc.services import TestCase


@ddt.ddt
class TestAuditResource(TestCase):
  """Tests for special api endpoints."""

  def setUp(self):
    super(TestAuditResource, self).setUp()
    self.client.get("/login")
    self.api = api_helper.Api()

  def _get_snapshot_counts(self, audit):
    url = "/api/audits/{}/snapshot_counts".format(audit.id)
    return self.client.get(url).json

  def test_snapshot_counts_query(self):
    """Test snapshot_counts endpoint"""

    with factories.single_commit():
      audit_1 = factories.AuditFactory()
      control = factories.ControlFactory()
      factories.RelationshipFactory(
          source=audit_1,
          destination=control
      )
      audit_2 = factories.AuditFactory()

    with factories.single_commit():
      revision = all_models.Revision.query.filter(
          all_models.Revision.resource_type == "Audit",
          all_models.Revision.resource_id == audit_1.id
      ).first()
      snapshot = factories.SnapshotFactory(
          parent=audit_1,
          child_type=control.type,
          child_id=control.id,
          revision=revision
      )
      factories.RelationshipFactory(
          source=audit_1,
          destination=snapshot,
      )

    audits = [audit_1, audit_2]
    expected_snapshot_counts = {
        audit_1.id: {"Control": 1},
        audit_2.id: {}
    }

    for audit in audits:
      snapshot_counts = self._get_snapshot_counts(audit)
      self.assertEqual(snapshot_counts, expected_snapshot_counts[audit.id])
