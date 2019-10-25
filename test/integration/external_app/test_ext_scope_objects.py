# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for external ScopeObject models"""

from collections import OrderedDict
from itertools import product
import ddt

from ggrc.models import all_models
from ggrc.converters import errors
from ggrc.models import comment
from ggrc.models.mixins import synchronizable
from integration.ggrc import api_helper
from integration.external_app import external_api_helper
from integration.ggrc import factories
from integration.ggrc import TestCase


@ddt.ddt
class TestExternalScopeObject(TestCase):
  """Class for testing externalization for ScopeObject"""

  @ddt.data(*all_models.get_scope_models())
  def test_scoped_have_external_attrs(self, model):
    """Test that '{0.__name__}' table has external_id/slug columns"""
    self.assertTrue(issubclass(model, synchronizable.Synchronizable))
    self.assertIn('external_id', model.__table__.columns._data)
    self.assertIn('external_slug', model.__table__.columns._data)

  @ddt.data(*all_models.get_scope_models())
  def test_scoped_are_ext_commentable(self, model):
    """Test that '{0.__name__}' model are external Commentable"""
    self.assertTrue(issubclass(model, comment.ExternalCommentable))

  @ddt.data(*all_models.get_scope_models())
  def test_external_scoped_allowed(self, model):
    """
        Test POST, GET, PUT, DELETE method  for {0.__name__} are allowed
        for external API.
    """
    api = external_api_helper.ExternalApiClient()
    # Check POST request
    data = {
        model._inflector.table_singular: {
            "title": "new_{}".format(model.__name__),
            "context": None,
            "external_id": 11111,
            "external_slug": "11111",
        }}

    response = api.post(model, data=data)
    self.assert201(response)

    obj_count = model.query.count()
    self.assertEqual(1, obj_count)
    # Check GET request
    scope_obj = model.query.first()
    response = api.get(model, obj_id=scope_obj.id)

    self.assert200(response)
    self.assertEqual(response.json[model._inflector.table_singular]["title"],
                     "new_{}".format(model.__name__))
    # Check PUT request
    data = {
        "title": "TEST_{}".format(model.__name__)
    }

    response = api.put(scope_obj, obj_id=scope_obj.id, data=data)
    self.assert200(response)

    scope_obj = model.query.get(scope_obj.id)
    self.assertEqual(scope_obj.title, data["title"])
    # Check DELETE request
    api = external_api_helper.ExternalApiClient(use_ggrcq_service_account=True)
    response = api.delete(scope_obj, obj_id=scope_obj.id)
    self.assert200(response)

    scope_obj = model.query.get(scope_obj.id)
    self.assertIsNone(scope_obj)

  @ddt.data(*product(all_models.get_scope_models(),
                     (all_models.Control, all_models.Risk)))
  @ddt.unpack
  def test_external_mapping_scoped(self, model_1, model_2):
    """ Test map {0.__name__} and {1.__name__} from external service"""
    api = external_api_helper.ExternalApiClient()

    with factories.single_commit():
      dest = factories.get_model_factory(model_1.__name__)()
      dest_id = dest.id
      source = factories.get_model_factory(model_2.__name__)()
      source_id = source.id
    data = {
        "relationship": {
            "source": {"id": source_id, "type": source.type},
            "destination": {"id": dest_id, "type": dest.type},
            "is_external": True
        }
    }
    response = api.post(all_models.Relationship, data=data)
    self.assert201(response)

    rels_count = all_models.Relationship.query.filter_by(
        source_type=source.type,
        source_id=source_id,
        destination_type=dest.type,
        destination_id=dest_id
    ).count()
    self.assertEqual(rels_count, 1)

  @ddt.data(*product(all_models.get_scope_models(),
                     (all_models.Control, all_models.Risk)))
  @ddt.unpack
  def test_external_unmap_scoped(self, model_1, model_2):
    """ Test unmap {0.__name__} and {1.__name__} from external service"""
    api = external_api_helper.ExternalApiClient()

    with factories.single_commit():
      dest = factories.get_model_factory(model_1.__name__)()
      dest_id = dest.id
      source = factories.get_model_factory(model_2.__name__)()
      source_id = source.id
    data = {
        "relationship": {
            "source": {"id": source_id, "type": source.type},
            "destination": {"id": dest_id, "type": dest.type},
            "is_external": True
        }
    }
    response = api.post(all_models.Relationship, data=data)
    self.assert201(response)

    source = model_2.query.get(source_id)
    dest = model_1.query.get(dest_id)
    response = api.unmap(source, dest)

    self.assert200(response)

    rels_count = all_models.Relationship.query.count()
    self.assertEqual(rels_count, 0)

  @ddt.data(*all_models.get_scope_models())
  def test_scoped_import_deprecated(self, model):
    """Test that import of'{0.__name__}' model is deprecated"""
    excepted_resp = {
        model._inflector.title_singular: {
            "row_errors": {
                errors.EXTERNAL_MODEL_IMPORT_RESTRICTION.format(
                    line=3,
                    external_model_name=model.__name__),
            },
        },
    }
    response = self.import_data(OrderedDict([
        ("object_type", model.__name__),
        ("Code*", ""),
        ("Title", "Test title")
    ]))
    self._check_csv_response(response, excepted_resp)

  @ddt.data(*all_models.get_scope_models())
  def test_internal_scoped_deprecated(self, model):
    """
        Test POST, PUT, DELETE method  for {0.__name__} are deprecated
        GET allowed for internal API.
    """
    api = api_helper.Api()

    # Check POST request
    response = api.post(model, {"title": "new-title"})

    self.assert403(response)
    self.assertEqual(0, model.query.count())

    # Check PUT request
    scope_obj = factories.get_model_factory(model.__name__)(title="TEST")
    response = api.put(scope_obj, {"title": "new-title"})

    self.assert403(response)
    self.assertEqual("TEST", model.query.first().title)

    # Check DELETE request
    response = api.delete(scope_obj, id_=scope_obj.id)

    self.assert403(response)
    self.assertEqual(1, model.query.count())

    # Check GET request
    response = api.get(scope_obj, id_=scope_obj.id)

    self.assert200(response)
    self.assertEqual(response.json[model._inflector.table_singular]["title"],
                     "TEST")

  @ddt.data(*product(all_models.get_scope_models(),
                     all_models.get_scope_models()))
  @ddt.unpack
  def test_scoped__mapping_deprecation(self, model1, model2):
    """Test mapping between {0.__name__} and {1.__name__} is deprecated"""

    api = api_helper.Api()

    excepted_msg = ("You do not have the necessary permissions to map and "
                    "unmap scoping objects to scoping objects, risks, "
                    "controls, standards and regulations in this application."
                    "Please contact your administrator if you have any "
                    "questions.")

    scope_model_1 = factories.get_model_factory(model1.__name__)()
    scope_model_2 = factories.get_model_factory(model2.__name__)()

    response = api.post(all_models.Relationship, {
        "relationship": {
            "source": {
                "id": scope_model_1.id,
                "type": scope_model_1.type,
            },
            "destination": {
                "id": scope_model_2.id,
                "type": scope_model_2.type
            },
            "context": None
        },
    })

    self.assertStatus(response, 400)
    self.assertIn(excepted_msg, response.data)
