# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

# pylint: disable=maybe-no-member, invalid-name

"""Test import of commentable fields."""
from collections import OrderedDict

from ggrc.models import inflector
from ggrc.models.mixins import Described
from ggrc.models.mixins.audit_relationship import AuditRelationship
from integration.ggrc import TestCase
from integration.ggrc.models import factories

COMMENTABLE_MODELS = [
    "AccessGroup",
    "Clause",
    "Control",
    "DataAsset",
    "Facility",
    "Market",
    "Objective",
    "OrgGroup",
    "System",
    "Process",
    "Product",
    "Requirement",
    "Vendor",
    "Issue",
    "Policy",
    "Regulation",
    "Standard",
    "Contract",
    "Risk",
    "Threat",
]
RECIPIENTS = ["Admin", "Primary Contacts", "Secondary Contacts"]


class TestCommentableImport(TestCase):
  """Class with tests of importing fields of Commentable mixin"""
  def setUp(self):
    """Set up for Assessment test cases."""
    super(TestCommentableImport, self).setUp()
    self.client.get("/login")

    # Audit should be in db when data will be imported
    audit = factories.AuditFactory().slug
    with factories.single_commit():
      for model in COMMENTABLE_MODELS:
        self.import_model(model, audit, ",".join(RECIPIENTS), True)

  def import_model(self, model_name, audit, recipients, send_by_default):
    """Import model data with commentable fields"""
    # pylint: disable=protected-access
    import_data = [
        ("object_type", model_name),
        ("Code", "{}-1".format(model_name)),
        ("Title", "{}-Title".format(model_name)),
        ("Admin", "user@example.com"),
        ("Recipients", recipients),
        ("Send by default", send_by_default),
    ]
    model_cls = inflector.get_model(model_name)
    if issubclass(model_cls, AuditRelationship):
      import_data.append(("Map:Audit", audit))
    if (issubclass(model_cls, Described) and
       "description" not in model_cls._aliases) or model_name == "Risk":
      import_data.append(("description", "{}-Description".format(model_name)))
    response = self.import_data(OrderedDict(import_data))
    self._check_csv_response(response, {})

  def test_commentable_import(self):
    """Test import of recipients and send_by_default fields"""
    for model_name in COMMENTABLE_MODELS:
      model_cls = inflector.get_model(model_name)
      obj = model_cls.query.first()
      self.assertEqual(obj.recipients, ",".join(RECIPIENTS))
      self.assertEqual(obj.send_by_default, True)
