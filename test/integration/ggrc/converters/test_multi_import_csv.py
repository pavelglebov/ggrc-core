# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests import of multiple objects"""
# pylint: disable=invalid-name

import collections

from ggrc.models import Policy
from ggrc.converters import errors
from integration.ggrc import TestCase
from integration.ggrc.generator import ObjectGenerator


class TestCsvImport(TestCase):
  """Tests for import of multiple objects"""

  def setUp(self):
    super(TestCsvImport, self).setUp()
    self.generator = ObjectGenerator()
    self.client.get("/login")
    self.policy_data = [
        collections.OrderedDict([
            ("object_type", "Policy"),
            ("Code*", ""),
            ("Title*", "Policy-1"),
            ("Admin*", "user@example.com"),
        ]),
        collections.OrderedDict([
            ("object_type", "Policy"),
            ("Code*", ""),
            ("Title*", "Policy-2"),
            ("Admin*", "user@example.com"),
        ]),
    ]

  def tearDown(self):
    pass

  def generate_people(self, people):
    for person in people:
      self.generator.generate_person({
          "name": person,
          "email": "{}@reciprocitylabs.com".format(person),
      }, "Administrator")

  def test_multi_basic_policy_orggroup_product(self):
    """Tests for import of multiple objects, defined correctly"""
    test_data = self.policy_data
    responses = self.import_data(*test_data)

    object_counts = {
        "Policy": (2, 0, 0),
    }

    for response in responses:
      created, updated, ignored = object_counts[response["name"]]
      self.assertEqual(created, response["created"])
      self.assertEqual(updated, response["updated"])
      self.assertEqual(ignored, response["ignored"])
      self.assertEqual(set(), set(response["row_warnings"]))

    self.assertEqual(Policy.query.count(), 2)

  def test_multi_basic_policy_orggroup_product_with_warnings(self):
    """Test multi basic policy orggroup product with warnings"""

    wrong_policy_data = self.policy_data + [collections.OrderedDict([
        ("object_type", "Policy"),
        ("Code*", ""),
        ("Title*", "Policy-1"),
        ("Admin*", "user@example.com"),
    ])]

    test_data = wrong_policy_data
    responses = self.import_data(*test_data)

    row_messages = []
    object_counts = {
        "Policy": (2, 0, 1),
    }
    for response in responses:
      created, updated, ignored = object_counts[response["name"]]
      self.assertEqual(created, response["created"])
      self.assertEqual(updated, response["updated"])
      self.assertEqual(ignored, response["ignored"])
      row_messages.extend(response["row_warnings"])
      row_messages.extend(response["row_errors"])

    expected_warnings = {
        errors.DUPLICATE_VALUE_IN_CSV.format(
            line="5", processed_line="3",
            column_name="Title", value="Policy-1",
        ),
    }

    self.assertEqual(expected_warnings, set(row_messages))
    self.assertEqual(Policy.query.count(), 2)
