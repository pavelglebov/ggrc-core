# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Custom Resource for Relationship that creates Snapshots when needed.

When Audit-Snapshottable Relationship is POSTed, a Snapshot should be created
instead.
"""
from collections import defaultdict

import sqlalchemy as sa

from werkzeug.exceptions import Forbidden

from ggrc import db
from ggrc import models
from ggrc.utils import benchmark
from ggrc.rbac import permissions
from ggrc.services import common


class AuditResource(common.ExtendedResource):
  """Resource handler for audits."""

  # method post is abstract and not used.
  # pylint: disable=abstract-method

  def get(self, *args, **kwargs):
    # This is to extend the get request for additional data.
    # pylint: disable=arguments-differ
    command_map = {
        None: super(AuditResource, self).get,
        "summary": self.summary_query,
        "snapshot_counts": self.snapshot_counts_query,
    }
    command = kwargs.pop("command", None)
    if command not in command_map:
      self.not_found_response()
    return command_map[command](*args, **kwargs)

  def summary_query(self, id):
    """Get data for audit summary page."""
    # id name is used as a kw argument and can't be changed here
    # pylint: disable=invalid-name,redefined-builtin
    with benchmark("check audit permissions"):
      audit = models.Audit.query.get(id)
      if not permissions.is_allowed_read_for(audit):
        raise Forbidden()
    with benchmark("Get audit summary data"):
      #  evidence_relationship => evidence destination
      evidence_relationship_ds = db.session.query(
          models.Relationship.source_id.label("cp_id"),
          models.Relationship.source_type.label("cp_type"),
          models.Evidence.id.label("evidence_id"),
      ).join(
          models.Evidence,
          sa.and_(
              models.Relationship.destination_id == models.Evidence.id,
              models.Relationship.destination_type == "Evidence"
          )
      ).subquery()
      #  evidence_relationship => evidence source
      evidence_relationship_sd = db.session.query(
          models.Relationship.destination_id.label("cp_id"),
          models.Relationship.destination_type.label("cp_type"),
          models.Evidence.id.label("evidence_id"),
      ).join(
          models.Evidence,
          sa.and_(
              models.Relationship.source_id == models.Evidence.id,
              models.Relationship.source_type == "Evidence"
          )
      ).subquery()

      assessment_evidences = db.session.query(
          models.Assessment.id.label("id"),
          models.Assessment.status.label("status"),
          models.Assessment.verified.label("verified"),
          evidence_relationship_ds.c.evidence_id,
      ).outerjoin(
          evidence_relationship_ds,
          sa.and_(
              evidence_relationship_ds.c.cp_id == models.Assessment.id,
              evidence_relationship_ds.c.cp_type == "Assessment",
          )
      ).filter(
          models.Assessment.audit_id == id,
      ).union_all(
          db.session.query(
              models.Assessment.id.label("id"),
              models.Assessment.status.label("status"),
              models.Assessment.verified.label("verified"),
              evidence_relationship_sd.c.evidence_id,
          ).outerjoin(
              evidence_relationship_sd,
              sa.and_(
                  evidence_relationship_sd.c.cp_id == models.Assessment.id,
                  evidence_relationship_sd.c.cp_type == "Assessment",
              )
          ).filter(models.Assessment.audit_id == id)
      )

      statuses_data = defaultdict(lambda: defaultdict(set))
      all_assessment_ids = set()
      all_evidence_ids = set()
      for id_, status, verified, evidence_id in assessment_evidences:
        if id_:
          statuses_data[(status, verified)]["assessments"].add(id_)
          all_assessment_ids.add(id_)
        if evidence_id:
          statuses_data[(status, verified)]["evidence"].add(evidence_id)
          all_evidence_ids.add(evidence_id)

    with benchmark("Make response"):
      statuses_json = []
      total = {"assessments": 0, "evidence": 0}
      for (status, verified), data in statuses_data.items():
        statuses_json.append({
            "name": status,
            "verified": verified,
            "assessments": len(data["assessments"]),
            "evidence": len(data["evidence"]),
        })
      total["assessments"] = len(all_assessment_ids)
      total["evidence"] = len(all_evidence_ids)

      statuses_json.sort(key=lambda k: (k["name"], k["verified"]))
      response_object = {"statuses": statuses_json, "total": total}
      return self.json_success_response(response_object, )
