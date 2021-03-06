# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Integration tests for WithSimilarityScore logic."""

import json

import ddt

from ggrc import db
from ggrc import models
from ggrc.snapshotter.rules import Types

from integration.ggrc import TestCase
import integration.ggrc.generator
from integration.ggrc.models import factories
from integration.ggrc.models.factories import get_model_factory


@ddt.ddt
class TestWithSimilarityScore(TestCase):
  """Integration test suite for WithSimilarityScore functionality."""

  def setUp(self):
    super(TestWithSimilarityScore, self).setUp()
    self.obj_gen = integration.ggrc.generator.ObjectGenerator()
    self.client.get("/login")

  @staticmethod
  def make_relationships(source, destinations):
    for destination in destinations:
      factories.RelationshipFactory(
          source=source,
          destination=destination,
      )

  @staticmethod
  def get_object_snapshot(scope_parent, object_):
    # pylint: disable=protected-access
    return db.session.query(models.Snapshot).filter(
        models.Snapshot.parent_type == scope_parent._inflector.table_singular,
        models.Snapshot.parent_id == scope_parent.id,
        models.Snapshot.child_type == object_._inflector.table_singular,
        models.Snapshot.child_id == object_.id
    ).one()

  def make_scope_relationships(self, source, scope_parent, objects):
    """Create relationships between object and snapshots of provided object"""
    snapshots = []
    for object_ in objects:
      snapshot = self.get_object_snapshot(scope_parent, object_)
      snapshots += [snapshot]
    self.make_relationships(source, snapshots)

  def make_assessments(self, assessment_mappings, with_types=False):
    """Create six assessments and map them to audit, control, objective.

    Each of the created assessments is mapped to its own subset of {audit,
    control, objective} so each of them has different similarity weight.

    Returns: the six generated assessments and their weights in a dict.
    """

    assessments = []
    for all_mappings in assessment_mappings:
      audit = [x for x in all_mappings
               if hasattr(x, "type") and x.type == "Audit"][0]
      if with_types:
        assessment_type = all_mappings[1]
        mappings_bound = 2
      else:
        assessment_type = "Control"
        mappings_bound = 1
      assessment = factories.AssessmentFactory(
          audit=audit, assessment_type=assessment_type
      )
      mappings = all_mappings[mappings_bound:]
      ordinary_mappings = [x for x in mappings if x.type not in Types.all]
      snapshot_mappings = [x for x in mappings if x.type in Types.all]
      self.make_relationships(assessment, [audit] + ordinary_mappings)
      self.make_scope_relationships(assessment, audit,
                                    snapshot_mappings)
      assessments.append(assessment)

    return assessments

  @ddt.data(
      ("Risk", "Risk", "Risk"),
      ("Risk", "Control", "Risk"),
      ("Control", "Control", "Risk"),
      ("Control", "Control", "Control"),
  )
  def test_get_similar_basic(self, asmnt_types):
    """Basic check of similar objects manually and via Query API.

    We create three programs, map them to the same risk, create thress audits
    and verify that we get the same result manually and via Query API.
    """
    # pylint: disable=too-many-locals
    with factories.single_commit():
      program_1 = factories.ProgramFactory(title="Program 1")
      program_2 = factories.ProgramFactory(title="Program 2")
      program_3 = factories.ProgramFactory(title="Program 3")

      risk_program_1 = factories.RiskFactory(title="Risk 1")

    self.make_relationships(
        program_1, [
            risk_program_1,
        ],
    )
    self.make_relationships(
        program_2, [
            risk_program_1,
        ],
    )
    self.make_relationships(
        program_3, [
            risk_program_1,
        ],
    )

    program_1 = models.Program.query.filter_by(title="Program 1").one()
    program_2 = models.Program.query.filter_by(title="Program 2").one()
    program_3 = models.Program.query.filter_by(title="Program 3").one()
    risk_program_1 = models.Risk.query.get(risk_program_1.id)

    audit_1 = self.obj_gen.generate_object(models.Audit, {
        "title": "Audit 1",
        "program": {"id": program_1.id},
        "status": "Planned"
    })[1]
    audit_2 = self.obj_gen.generate_object(models.Audit, {
        "title": "Audit 2",
        "program": {"id": program_2.id},
        "status": "Planned"
    })[1]
    audit_3 = self.obj_gen.generate_object(models.Audit, {
        "title": "Audit 3",
        "program": {"id": program_3.id},
        "status": "Planned"
    })[1]

    assessment_mappings = [
        [audit_1, asmnt_types[0], risk_program_1],
        [audit_2, asmnt_types[1], risk_program_1],
        [audit_3, asmnt_types[2], risk_program_1],
    ]
    assessments = self.make_assessments(assessment_mappings, with_types=True)

    risk_asmnt_ids = {asmnt.id for asmnt in assessments
                      if asmnt.assessment_type == "Risk"}
    for asmnt_id in {asmnt.id for asmnt in assessments}:
      similar_objects = models.Assessment.get_similar_objects_query(
          id_=asmnt_id,
          type_="Assessment",
      ).all()

      # Current assessment is not similar to itself
      if risk_asmnt_ids and asmnt_id in risk_asmnt_ids:
        expected_ids = risk_asmnt_ids - {asmnt_id}
      else:
        expected_ids = set()

      self.assertSetEqual(
          {obj[0] for obj in similar_objects},
          expected_ids,
      )

      query = [{
          "object_name": "Assessment",
          "type": "ids",
          "filters": {
              "expression": {
                  "op": {"name": "similar"},
                  "object_name": "Assessment",
                  "ids": [str(asmnt_id)],
              },
          },
      }]
      response = self.client.post(
          "/query",
          data=json.dumps(query),
          headers={"Content-Type": "application/json"},
      )
      self.assertSetEqual(
          set(json.loads(response.data)[0]["Assessment"]["ids"]),
          expected_ids,
      )

  def test_similar_partially_matching(self):
    """Basic check of similar objects manually and via Query API.

    We create three programs, map one them to the two objectives, create two
    audits and verify that we get the same result manually and via Query API.

    We also ensure that for only single matching objective we do not
    fetch that assessment is as related.
    """

    # pylint: disable=too-many-locals
    with factories.single_commit():
      program_1 = factories.ProgramFactory(title="Program 1")
      program_2 = factories.ProgramFactory(title="Program 2")
      program_3 = factories.ProgramFactory(title="Program 3")

      objective_1_program_1 = factories.ObjectiveFactory(title="Objective 1")
      objective_2_program_1 = factories.ObjectiveFactory(title="Objective 2")

    self.make_relationships(
        program_1, [
            objective_1_program_1,
            objective_2_program_1,
        ],
    )

    self.make_relationships(
        program_2, [
            objective_1_program_1,
            objective_2_program_1,
        ],
    )

    self.make_relationships(
        program_3, [
            objective_1_program_1,
        ],
    )

    program_1 = models.Program.query.filter_by(title="Program 1").one()
    program_2 = models.Program.query.filter_by(title="Program 2").one()
    program_3 = models.Program.query.filter_by(title="Program 3").one()

    objective_1_program_1 = models.Objective.query.filter_by(
        title="Objective 1").one()
    objective_2_program_1 = models.Objective.query.filter_by(
        title="Objective 2").one()

    _, audit_1 = self.obj_gen.generate_object(models.Audit, {
        "title": "Audit 1",
        "program": {"id": program_1.id},
        "status": "Planned",
    })

    _, audit_2 = self.obj_gen.generate_object(models.Audit, {
        "title": "Audit 2",
        "program": {"id": program_2.id},
        "status": "Planned",
    })

    _, audit_3 = self.obj_gen.generate_object(models.Audit, {
        "title": "Audit 3",
        "program": {"id": program_3.id},
        "status": "Planned",
    })

    assessment_mappings = [
        [audit_1, "Objective", objective_1_program_1, objective_2_program_1],
        [audit_2, "Objective", objective_1_program_1, objective_2_program_1],
        [audit_3, "Objective"],
    ]

    assessments = self.make_assessments(assessment_mappings, with_types=True)

    similar_objects = models.Assessment.get_similar_objects_query(
        id_=assessments[0].id,
        type_="Assessment",
    ).all()

    expected_ids = {assessments[1].id}

    self.assertSetEqual(
        {obj[0] for obj in similar_objects},
        expected_ids,
    )
    self.assertNotIn(assessments[2].id, similar_objects)

    query = [{
        "object_name": "Assessment",
        "type": "ids",
        "filters": {
            "expression": {
                "op": {"name": "similar"},
                "object_name": "Assessment",
                "ids": [str(assessments[0].id)],
            },
        },
    }]
    response = self.client.post(
        "/query",
        data=json.dumps(query),
        headers={"Content-Type": "application/json"},
    )
    self.assertSetEqual(
        set(json.loads(response.data)[0]["Assessment"]["ids"]),
        expected_ids,
    )

  def test_empty_similar_results(self):
    """Check empty similarity result."""
    query = [{
        "object_name": "Assessment",
        "type": "ids",
        "filters": {
            "expression": {
                "op": {"name": "similar"},
                "object_name": "Assessment",
                "ids": ["-1"],
            },
        },
    }]
    response = self.client.post(
        "/query",
        data=json.dumps(query),
        headers={"Content-Type": "application/json"},
    )

    self.assertListEqual(
        response.json[0]["Assessment"]["ids"],
        [],
    )

  @ddt.data(
      ("Control", factories.ControlFactory, True),
      ("Objective", factories.ControlFactory, False),
      ("Control", factories.ObjectiveFactory, False),
      ("Objective", factories.ObjectiveFactory, True),
  )
  @ddt.unpack
  def test_asmt_issue_similarity(self, asmnt_type, obj_factory, issue_exists):
    """Test Issues related to assessments with 'similar' operation."""
    # Test object has to be created before others to produce revision
    obj = obj_factory()

    with factories.single_commit():
      audit = factories.AuditFactory()
      assessment1 = factories.AssessmentFactory(
          audit=audit, assessment_type=asmnt_type
      )
      assessment2 = factories.AssessmentFactory(audit=audit)
      issue = factories.IssueFactory()

      snapshot = factories.SnapshotFactory(
          parent=audit,
          child_id=obj.id,
          child_type=obj.type,
          revision_id=models.Revision.query.filter_by(
              resource_type=obj.type).one().id
      )

      factories.RelationshipFactory(source=audit, destination=assessment1)
      factories.RelationshipFactory(source=audit, destination=assessment2)
      factories.RelationshipFactory(source=audit, destination=issue)
      factories.RelationshipFactory(source=snapshot, destination=assessment1)
      factories.RelationshipFactory(source=snapshot, destination=issue)

    query = [{
        "object_name": "Issue",
        "type": "ids",
        "filters": {
            "expression": {
                "op": {"name": "similar"},
                "object_name": "Assessment",
                "ids": [assessment1.id],
            },
        },
    }]
    expected_ids = [issue.id]

    response = self.client.post(
        "/query",
        data=json.dumps(query),
        headers={"Content-Type": "application/json"},
    )
    if issue_exists:
      self.assertListEqual(
          response.json[0]["Issue"]["ids"],
          expected_ids
      )
    else:
      self.assertListEqual(
          response.json[0]["Issue"]["ids"],
          []
      )

  @ddt.data(
      (("Risk", "Risk"), False, (True, True)),
      (("Risk", "Risk"), True, (True, True)),
      (("Risk", "Control"), False, (True, False)),
      (("Risk", "Control"), True, (True, True)),
      (("Control", "Risk"), False, (False, True)),
      (("Control", "Risk"), True, (False, True)),
      (("Control", "Control"), False, (False, False)),
      (("Control", "Control"), True, (False, True)),
  )
  @ddt.unpack
  def test_asmt_issue_related(self, asmnt_types, asmnt_related, issues_exist):
    """Test Issues related to assessments."""
    # pylint: disable=too-many-locals

    # Test object has to be created before others to produce revision
    obj = factories.RiskFactory()

    with factories.single_commit():
      assessments = []
      for asmnt_type in asmnt_types:
        audit = factories.AuditFactory()
        assessment = factories.AssessmentFactory(
            audit=audit, assessment_type=asmnt_type
        )
        assessments.append(assessment)
        snapshot = factories.SnapshotFactory(
            parent=audit,
            child_id=obj.id,
            child_type=obj.type,
            revision_id=models.Revision.query.filter_by(
                resource_type=obj.type).one().id
        )
        factories.RelationshipFactory(source=audit, destination=assessment)
        factories.RelationshipFactory(source=snapshot, destination=assessment)

      # Create one issue in the last audit linked to snapshot/assessment
      issue = factories.IssueFactory()
      factories.RelationshipFactory(source=audit, destination=issue)
      factories.RelationshipFactory(source=snapshot, destination=issue)
      if asmnt_related:
        factories.RelationshipFactory(source=issue, destination=assessment)

    query = []
    for assessment in assessments:
      query.append({
          "object_name": "Issue",
          "type": "ids",
          "filters": {
              "expression": {
                  "left": {
                      "object_name": "Assessment",
                      "op": {"name": "relevant"},
                      "ids": [assessment.id],
                  },
                  "op": {"name": "OR"},
                  "right": {
                      "object_name": "Assessment",
                      "op": {"name": "similar"},
                      "ids": [assessment.id],
                  },
              },
          },
      })

    expected_ids = [issue.id]
    response = self.client.post(
        "/query",
        data=json.dumps(query),
        headers={"Content-Type": "application/json"},
    )
    for num, data in enumerate(response.json):
      if issues_exist[num]:
        self.assertListEqual(
            data["Issue"]["ids"],
            expected_ids
        )
      else:
        self.assertListEqual(
            data["Issue"]["ids"],
            []
        )

  @ddt.data(
      (("Control", "Control"), "Control", (True, True)),
      (("Control", "Objective"), "Control", (True, False)),
      (("Objective", "Objective"), "Control", (False, False)),
      (("Control", "Control"), "Objective", (False, False)),
      (("Control", "Objective"), "Objective", (False, True)),
      (("Objective", "Objective"), "Objective", (True, True)),
  )
  @ddt.unpack
  def test_obj_asmnt_related(self, asmnt_types, object_type, expect_asmnt):
    """Test related assessments for objects in different audits."""
    assessment_ids = []
    with factories.single_commit():
      obj = get_model_factory(object_type)()
      for asmnt_type in asmnt_types:
        audit = factories.AuditFactory()
        assessment = factories.AssessmentFactory(
            audit=audit, assessment_type=asmnt_type
        )
        assessment_ids.append(assessment.id)
        snapshot = self._create_snapshots(audit, [obj])[0]
        factories.RelationshipFactory(source=audit, destination=assessment)
        factories.RelationshipFactory(source=snapshot, destination=assessment)

    query = [{
        "object_name": "Assessment",
        "type": "ids",
        "filters": {
            "expression": {
                "op": {"name": "similar"},
                "object_name": obj.type,
                "ids": [obj.id],
            },
        },
    }]

    response = self.client.post(
        "/query",
        data=json.dumps(query),
        headers={"Content-Type": "application/json"},
    )
    self.assertStatus(response, 200)
    self.assertListEqual(
        response.json[0]["Assessment"]["ids"],
        [id_ for num, id_ in enumerate(assessment_ids) if expect_asmnt[num]]
    )

  @ddt.data(
      (("Control", "Control", "Control"), "Control", (True, True)),
      (("Control", "Objective", "Control"), "Control", (False, True)),
      (("Control", "Objective", "Objective"), "Control", (False, False)),
      (("Control", "Objective", "Objective"), "Objective", (False, False)),
      (("Control", "Objective", "Control"), "Objective", (False, False)),
      (("Objective", "Objective", "Objective"), "Objective", (True, True)),
      (("Objective", "Objective", "Objective"), "Control", (False, False)),
  )
  @ddt.unpack
  def test_asmnt_asmnt_related(self, asmnt_types, object_type, expect_asmnt):
    """Test related assessments for assessment in different audits."""
    assessment_ids = []
    with factories.single_commit():
      obj = get_model_factory(object_type)()
      for asmnt_type in asmnt_types:
        audit = factories.AuditFactory()
        assessment = factories.AssessmentFactory(
            audit=audit, assessment_type=asmnt_type
        )
        assessment_ids.append(assessment.id)
        snapshot = self._create_snapshots(audit, [obj])[0]
        factories.RelationshipFactory(source=audit, destination=assessment)
        factories.RelationshipFactory(source=snapshot, destination=assessment)

    # Check related assessments for first assessment
    query = [{
        "object_name": "Assessment",
        "type": "ids",
        "filters": {
            "expression": {
                "op": {"name": "similar"},
                "object_name": "Assessment",
                "ids": [assessment_ids[0]],
            },
        },
    }]
    response = self.client.post(
        "/query",
        data=json.dumps(query),
        headers={"Content-Type": "application/json"},
    )
    self.assertStatus(response, 200)

    expected_ids = [
        assessment_ids[num] for num, id_expected in enumerate(expect_asmnt, 1)
        if id_expected
    ]
    self.assertListEqual(response.json[0]["Assessment"]["ids"], expected_ids)

  @ddt.data(
      (("Control", "Control"), ("Control", "Control"), True),
      (("Control", "Objective"), ("Control", "Control"), False),
      (("Objective", "Control"), ("Control", "Control"), False),
      (("Objective", "Objective"), ("Control", "Control"), False),
      (("Objective", "Objective"), ("Objective", "Control"), False),
      (("Objective", "Objective"), ("Objective", "Objective"), True),
  )
  @ddt.unpack
  def test_asmnt_mapped_similar(self, obj_types, asmnt_types, similar):
    """Test similar assessments for assessments linked through mapped objs."""
    with factories.single_commit():
      obj1 = get_model_factory(obj_types[0])()
      obj2 = get_model_factory(obj_types[1])()
      factories.RelationshipFactory(source=obj1, destination=obj2)

      audit = factories.AuditFactory()
      assessment1 = factories.AssessmentFactory(
          audit=audit, assessment_type=asmnt_types[0]
      )
      assessment2 = factories.AssessmentFactory(
          audit=audit, assessment_type=asmnt_types[1]
      )
      snapshots = self._create_snapshots(audit, [obj1, obj2])

      factories.RelationshipFactory(source=audit, destination=assessment1)
      factories.RelationshipFactory(source=audit, destination=assessment2)
      factories.RelationshipFactory(source=audit, destination=snapshots[0])
      factories.RelationshipFactory(source=audit, destination=snapshots[1])
      factories.RelationshipFactory(
          source=snapshots[0], destination=assessment1
      )
      factories.RelationshipFactory(
          source=snapshots[1], destination=assessment2
      )

    expected_ids = [assessment2.id] if similar else []
    # Check related assessments for first assessment
    query = [{
        "object_name": "Assessment",
        "type": "ids",
        "filters": {
            "expression": {
                "op": {"name": "similar"},
                "object_name": "Assessment",
                "ids": [assessment1.id],
            },
        },
    }]
    response = self.client.post(
        "/query",
        data=json.dumps(query),
        headers={"Content-Type": "application/json"},
    )
    self.assertStatus(response, 200)
    self.assertListEqual(response.json[0]["Assessment"]["ids"], expected_ids)

  @ddt.data(
      (("Control", "Control"), ("Control", "Control"), (True, True)),
      (("Control", "Control"), ("Control", "Objective"), (True, False)),
      (("Control", "Control"), ("Objective", "Objective"), (False, False)),
      (("Control", "Objective"), ("Objective", "Objective"), (False, False)),
      (("Control", "Objective"), ("Control", "Objective"), (True, False)),
      (("Objective", "Objective"), ("Control", "Objective"), (False, True)),
  )
  @ddt.unpack
  def test_obj_mapped_similar(self, obj_types, asmnt_types, similar):
    """Test similar assessments for mapped objects of same type."""
    with factories.single_commit():
      obj1 = get_model_factory(obj_types[0])()
      obj2 = get_model_factory(obj_types[1])()
      factories.RelationshipFactory(source=obj1, destination=obj2)

      audit = factories.AuditFactory()
      assessment1 = factories.AssessmentFactory(
          audit=audit, assessment_type=asmnt_types[0]
      )
      assessment2 = factories.AssessmentFactory(
          audit=audit, assessment_type=asmnt_types[1]
      )
      assessment_ids = [assessment1.id, assessment2.id]
      snapshots = self._create_snapshots(audit, [obj1, obj2])

      factories.RelationshipFactory(source=audit, destination=assessment1)
      factories.RelationshipFactory(source=audit, destination=assessment2)
      factories.RelationshipFactory(source=audit, destination=snapshots[0])
      factories.RelationshipFactory(source=audit, destination=snapshots[1])
      factories.RelationshipFactory(
          source=snapshots[0], destination=assessment1
      )
      factories.RelationshipFactory(
          source=snapshots[1], destination=assessment2
      )

    # Check related assessments for first object
    query = [{
        "object_name": "Assessment",
        "type": "ids",
        "filters": {
            "expression": {
                "op": {"name": "similar"},
                "object_name": obj_types[0],
                "ids": [obj1.id],
            },
        },
    }]
    response = self.client.post(
        "/query",
        data=json.dumps(query),
        headers={"Content-Type": "application/json"},
    )
    self.assertStatus(response, 200)

    expected_ids = [
        assessment_ids[num]
        for num, _ in enumerate(assessment_ids) if similar[num]
    ]
    self.assertListEqual(response.json[0]["Assessment"]["ids"], expected_ids)

  @ddt.data(
      ("Control", "Control", True),
      ("Control", "Objective", False),
      ("Risk", "Risk", True),
  )
  @ddt.unpack
  def test_issue_obj_similar(self, obj_type, asmnt_type, similar):
    """Test similar assessments for mapped objects of same type."""
    with factories.single_commit():
      obj = get_model_factory(obj_type)()
      audit = factories.AuditFactory()
      assessment = factories.AssessmentFactory(
          audit=audit, assessment_type=asmnt_type
      )
      snapshot = self._create_snapshots(audit, [obj])[0]

      issue = factories.IssueFactory()
      factories.RelationshipFactory(source=audit, destination=assessment)
      factories.RelationshipFactory(source=audit, destination=snapshot)
      factories.RelationshipFactory(source=snapshot, destination=assessment)
      factories.RelationshipFactory(source=obj, destination=issue)

    expected_ids = [issue.id] if similar else []

    query = [{
        "object_name": "Issue",
        "type": "ids",
        "filters": {
            "expression": {
                "op": {"name": "similar"},
                "object_name": "Assessment",
                "ids": [assessment.id],
            },
        },
    }]
    response = self.client.post(
        "/query",
        data=json.dumps(query),
        headers={"Content-Type": "application/json"},
    )
    self.assertStatus(response, 200)
    self.assertListEqual(response.json[0]["Issue"]["ids"], expected_ids)
