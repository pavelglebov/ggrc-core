# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for external ScopeObject models"""

import ddt

from ggrc import models
from ggrc.models.mixins import synchronizable
from integration.ggrc import TestCase


@ddt.ddt
class TestExternalScopeObject(TestCase):
  """Class for testing externalization for ScopeObject"""

  @ddt.data(*models.all_models.get_scope_models())
  def test_scoped_are_synchronizable(self, model):
    """Test that '{0.__name__}' model are Synchronizable"""
    self.assertTrue(issubclass(model, synchronizable.Synchronizable))
    self.assertTrue(hasattr(model, 'external_id'))
    self.assertTrue(hasattr(model, 'external_slug'))

  @ddt.data(*models.all_models.get_scope_models())
  def test_scoped_have_external_field(self, model):
    """Test that '{0.__name__}' table has external_id/slug columns"""
    self.assertIn('external_id', model.__table__.columns._data)
    self.assertIn('external_slug', model.__table__.columns._data)
