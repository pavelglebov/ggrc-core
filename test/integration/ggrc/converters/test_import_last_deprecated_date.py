# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Test Last Deprecated Date logic with imports."""

import collections
import datetime
import itertools

import ddt

from ggrc import models
from ggrc.converters import errors

from freezegun import freeze_time

from integration.ggrc import TestCase
from integration.ggrc.models import factories


@ddt.ddt
class TestImportLastDeprecatedDate(TestCase):
  """Test Last Deprecated Date logic with imports."""

  def setUp(self):
    """Set up for Last Deprecated Date import test cases."""
    super(TestImportLastDeprecatedDate, self).setUp()
    self.client.get("/login")
    self.warning_non_importable = {
        "row_warnings": {
            errors.EXPORT_ONLY_WARNING.format(
                line=3, column_name="Last Deprecated Date",
            ),
        },
    }

  @ddt.data("Audit", "Requirement", "Objective")
  def test_import_last_deprecated_date(self, model_name):
    """Last Deprecated Date on {} should be not importable."""
    with freeze_time("2017-01-25"):
      obj = factories.get_model_factory(model_name)(status="Deprecated")

    resp = self.import_data(collections.OrderedDict([
        ("object_type", model_name),
        ("code", obj.slug),
        ("Last Deprecated Date", "02/25/2017"),
    ]))
    self._check_csv_response(resp, {
        model_name: self.warning_non_importable,
    })

    updated_obj = models.inflector.get_model(model_name).query.get(obj.id)
    self.assertEqual(updated_obj.last_deprecated_date,
                     datetime.date(2017, 1, 25))

  @ddt.data("Audit", "Requirement", "Objective")
  def test_import_deprecated_status(self, model_name):
    """If import {} with Deprecated status, set Last Deprecated Date to now."""
    obj = factories.get_model_factory(model_name)()

    with freeze_time("2017-01-25"):
      resp = self.import_data(collections.OrderedDict([
          ("object_type", model_name),
          ("code", obj.slug),
          ("State", "Deprecated"),
      ]))
      self._check_csv_response(resp, {})

    updated_obj = models.inflector.get_model(model_name).query.get(obj.id)
    self.assertEqual(updated_obj.last_deprecated_date,
                     datetime.date(2017, 1, 25))

  @ddt.data("Audit", "Requirement", "Objective")
  def test_import_deprecated_status_again(self, model_name):
    """Last Deprecated Date on {} isn't changed when status not changed."""
    with freeze_time("2017-01-25"):
      obj = factories.get_model_factory(model_name)(status="Deprecated")

    resp = self.import_data(collections.OrderedDict([
        ("object_type", model_name),
        ("code", obj.slug),
        ("State", "Deprecated"),
    ]))
    self._check_csv_response(resp, {})

    updated_obj = models.inflector.get_model(model_name).query.get(obj.id)
    self.assertEqual(updated_obj.last_deprecated_date,
                     datetime.date(2017, 1, 25))

  @ddt.data("Audit", "Requirement", "Objective")
  def test_import_deprecated_date_with_state(self, model_name):
    """Last Deprecated Date on {} is set to now, not what user imports."""
    with freeze_time("2017-01-25"):
      obj = factories.get_model_factory(model_name)()

    with freeze_time("2017-01-27"):
      resp = self.import_data(collections.OrderedDict([
          ("object_type", model_name),
          ("code", obj.slug),
          ("State", "Deprecated"),
          ("Last Deprecated Date", "02/25/2017"),
      ]))
      self._check_csv_response(resp, {
          model_name: self.warning_non_importable,
      })

    updated_obj = models.inflector.get_model(model_name).query.get(obj.id)
    self.assertEqual(updated_obj.last_deprecated_date,
                     datetime.date(2017, 1, 27))

  @ddt.data(*itertools.product(
      ["Audit", "Requirement", "Objective"],
      [(True, True), (False, True), (True, False), (False, False)],
  ))
  @ddt.unpack
  def test_import_deprecated_date_warnings(self, model_name,
                                           (empty_object, empty_import)):
    """Check warnings on imported Last Deprecated Date for {}

    In this test covered next scenarios:
    1) object has empty last_deprecated_date field, user imports empty
       field - no warnings
    2) object has non-empty last_deprecated_date field, user imports empty
       field - no warnings
    3) object has empty last_deprecated_date field, user imports non-empty
       field - warning
    4) object has non-empty last_deprecated_date field, user imports non-empty
       field - warning
    """
    if empty_object:
      obj = factories.get_model_factory(model_name)()
    else:
      obj = factories.get_model_factory(model_name)(status="Deprecated")
    if empty_import:
      resp = self.import_data(collections.OrderedDict([
          ("object_type", model_name),
          ("code", obj.slug),
          ("Last Deprecated Date", ""),
      ]))
    else:
      resp = self.import_data(collections.OrderedDict([
          ("object_type", model_name),
          ("code", obj.slug),
          ("Last Deprecated Date", "02/25/2017"),
      ]))

    expected_errors = {
        model_name: self.warning_non_importable,
    }

    if empty_import:
      self._check_csv_response(resp, {})
    else:
      self._check_csv_response(resp, expected_errors)

  @ddt.data(*itertools.product(
      ["Audit", "Requirement", "Objective"],
      ["01/25/2017", "2017-01-25"],
  ))
  @ddt.unpack
  def test_import_same_deprecated_date(self, model_name, formatted_date):
    """Check case of import the same last_deprecated_date field in {0}.

    If user imports the {0} with the same last_deprecated_date field -
    imported without warnings.
    """
    with freeze_time("2017-01-25"):
      obj = factories.get_model_factory(model_name)(title="test",
                                                    status="Deprecated")

    resp = self.import_data(collections.OrderedDict([
        ("object_type", model_name),
        ("code", obj.slug),
        ("title", "New title"),
        ("Last Deprecated Date", formatted_date),
    ]))

    self._check_csv_response(resp, {})

  @ddt.data("Audit", "Requirement", "Objective")
  def test_import_invalid_date(self, model_name):
    """Invalid date in Last Deprecated Date is ignored in {} import."""
    with freeze_time("2017-01-25"):
      obj = factories.get_model_factory(model_name)(title="test",
                                                    status="Deprecated")

    resp = self.import_data(collections.OrderedDict([
        ("object_type", model_name),
        ("code", obj.slug),
        ("title", "New title"),
        ("Last Deprecated Date", "0125/2017"),
    ]))

    expected_errors = {
        model_name: self.warning_non_importable,
    }
    self._check_csv_response(resp, expected_errors)
