# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for external ScopeObject models"""

from collections import OrderedDict
from itertools import product

import ddt

from ggrc.converters import errors
from ggrc.models import all_models
from ggrc.models import comment
from ggrc.models.mixins import synchronizable
from integration.external_app import external_api_helper
from integration.ggrc import api_helper
from integration.ggrc import factories
from integration.ggrc import TestCase

# pylint: disable=invalid-name


@ddt.ddt
class TestBaseExternalScopeObjects(TestCase):
  """Base class for testing externalization for ScopeObjects"""

  @staticmethod
  def _make_test_models_payload(model):
    """
        Prepare payload for {0.__name__} model
    """
    data = {
        model._inflector.table_singular: {
            "title": "new_{}".format(model.__name__),
            "description": "lorem ipsum",
            "notes": "Tests notes for scoped",
            "context": None,
            "external_id": 11111,
            "external_slug": "11111",
            "created_at": "2019-01-11",
        }}
    return data

  def _create_test_model_instance(self, model):
    """
        Create {0.__name__} instance for tests
    """
    model_factory = factories.get_model_factory(model.__name__)
    model_singular = model._inflector.table_singular
    data = self._make_test_models_payload(model)[model_singular]
    model_inst = model_factory(**data)
    return model_inst

  @ddt.data(*all_models.get_scope_models())
  def test_scoped_have_external_attrs(self, model):
    """
        Test that '{0.__name__}' table has external_id/slug columns
    """
    self.assertTrue(issubclass(model, synchronizable.Synchronizable))
    self.assertIn('external_id', model.__table__.columns._data)
    self.assertIn('external_slug', model.__table__.columns._data)

  @ddt.data(*all_models.get_scope_models())
  def test_scoped_are_ext_commentable(self, model):
    """Test that '{0.__name__}' model are external Commentable"""
    self.assertTrue(issubclass(model, comment.ExternalCommentable))


@ddt.ddt
class TestExternalAppScopeObjects(TestBaseExternalScopeObjects):
  """Class for tests ScopeObjects with external client"""

  def setUp(self):
    super(TestExternalAppScopeObjects, self).setUp()
    self.api = external_api_helper.ExternalApiClient()

  @ddt.data(*all_models.get_scope_models())
  def test_external_scoped_create_allowed(self, model):
    """
        Test POST method for {0.__name__} are allowed for external API.
    """
    data = self._make_test_models_payload(model)

    response = self.api.post(model, data=data)
    self.assert201(response)

    obj_count = model.query.count()
    self.assertEqual(1, obj_count)

  @ddt.data(*all_models.get_scope_models())
  def test_external_scoped_get_allowed(self, model):
    """
         Test GET method for {0.__name__} are allowed for external API.
    """
    scope_obj = self._create_test_model_instance(model)

    response = self.api.get(model, obj_id=scope_obj.id)

    self.assert200(response)
    self.assertEqual(response.json[model._inflector.table_singular]["title"],
                     "new_{}".format(model.__name__))

  @ddt.data(*all_models.get_scope_models())
  def test_external_scoped_put_allowed(self, model):
    """
        Test PUT method for {0.__name__} are allowed for external API.
    """

    scope_obj = self._create_test_model_instance(model)
    data = {
        "title": "TEST_{}".format(model.__name__)
    }

    response = self.api.put(scope_obj, obj_id=scope_obj.id, data=data)
    self.assert200(response)

    scope_obj = model.query.get(scope_obj.id)
    self.assertEqual(scope_obj.title, data["title"])

  @ddt.data(*product(all_models.get_scope_models(),
                     (all_models.Control, all_models.Risk)))
  @ddt.unpack
  def test_external_mapping_scoped(self, model_1, model_2):
    """
        Test map {0.__name__} and {1.__name__} from external service
    """
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
    response = self.api.post(all_models.Relationship, data=data)
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
    """
        Test unmap {0.__name__} and {1.__name__} from external service
    """
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
    response = self.api.post(all_models.Relationship, data=data)
    self.assert201(response)

    source = model_2.query.get(source_id)
    dest = model_1.query.get(dest_id)

    response = self.api.unmap(source, dest)
    self.assert200(response)

    rels_count = all_models.Relationship.query.count()
    self.assertEqual(rels_count, 0)


@ddt.ddt
class TestInternalAppScopeObjects(TestBaseExternalScopeObjects):
  """Class for tests ScopeObjects with internal client"""

  def setUp(self):
    super(TestInternalAppScopeObjects, self).setUp()
    self.api = api_helper.Api()

  @ddt.data(*all_models.get_scope_models())
  def test_scoped_import_deprecated(self, model):
    """
        Test that import of'{0.__name__}' model is deprecated
    """
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
  def test_internal_scoped_post_deprecated(self, model):
    """
        Test POST method  for {0.__name__} are deprecated for internal API.
    """
    response = self.api.post(model, {"title": "new-title"})

    self.assert403(response)
    self.assertEqual(0, model.query.count())

  @ddt.data(*all_models.get_scope_models())
  def test_internal_scoped_put_deprecated(self, model):
    """
        Test PUT method  for {0.__name__} are deprecated for internal API.
    """
    scope_obj = self._create_test_model_instance(model)
    response = self.api.put(scope_obj, {"title": "new-title"})

    self.assert403(response)
    self.assertEqual("new_{}".format(model.__name__),
                     model.query.first().title)

  @ddt.data(*all_models.get_scope_models())
  def test_internal_scoped_delete_deprecated(self, model):
    """
        Test DELETE method  for {0.__name__} are deprecated for internal API.
    """
    scope_obj = self._create_test_model_instance(model)
    response = self.api.delete(scope_obj, id_=scope_obj.id)

    self.assert403(response)
    self.assertEqual(1, model.query.count())

  @ddt.data(*all_models.get_scope_models())
  def test_internal_scoped_get_allowed(self, model):
    """
        Test GET method  for {0.__name__} are allowed for internal API.
    """
    scope_obj = self._create_test_model_instance(model)
    response = self.api.get(scope_obj, id_=scope_obj.id)

    self.assert200(response)
    self.assertEqual(response.json[model._inflector.table_singular]["title"],
                     "new_{}".format(model.__name__))

  @ddt.data(*product(all_models.get_scope_models(),
                     all_models.get_scope_models()))
  @ddt.unpack
  def test_scoped_mapping_deprecation(self, model1, model2):
    """
        Test mapping between {0.__name__} and {1.__name__} is deprecated
    """

    excepted_msg = ("You do not have the necessary permissions to map and "
                    "unmap scoping objects to scoping objects, risks, "
                    "controls, standards and regulations in this application."
                    "Please contact your administrator if you have any "
                    "questions.")

    with factories.single_commit():
      scope_model_1 = factories.get_model_factory(model1.__name__)()
      scope_model_2 = factories.get_model_factory(model2.__name__)()

    response = self.api.post(all_models.Relationship, {
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
