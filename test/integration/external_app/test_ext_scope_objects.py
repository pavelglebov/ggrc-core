# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for external ScopeObject models"""


from ggrc import models
from ggrc.models.mixins import synchronizable
from integration.ggrc import TestCase


class TestExternalScopeObject(TestCase):
  """class for testing externalization for ScopeObject"""

  def setUp(self):
    super(TestExternalScopeObject, self).setUp()

  scoped_classes = models.all_models.get_scope_models()

  def test_scoped_are_synchronizable(self):
    """test that all scope objects  are Synchronizable"""
    self.assertEqual(15, len(self.scoped_classes))
    for model in self.scoped_classes:
      self.assertTrue(issubclass(model, synchronizable.Synchronizable))
