# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Integration test for TestWithReadOnlyAccess mixin"""

# pylint: disable=invalid-name,too-many-arguments,too-many-lines

import ddt

from ggrc.models import get_model
from integration.ggrc import TestCase
from integration.ggrc.generator import ObjectGenerator
from integration.ggrc import factories


_NOT_SPECIFIED = '<NOT_SPECIFIED>'


@ddt.ddt
class TestWithExtCustomAttrsSetter(TestCase):
  """Test WithReadOnlyAccess mixin"""

  def setUp(self):
    super(TestWithExtCustomAttrsSetter, self).setUp()
    self.object_generator = ObjectGenerator()
    self.object_generator.api.login_as_normal()

  @staticmethod
  def _create_cads(obj_type, names=('ATTR1', 'ATTR2', 'ATTR3')):
    """Create custom attribute definitions"""

    ret = dict()

    with factories.single_commit():
      for name in names:
        obj = factories.CustomAttributeDefinitionFactory(
            title=name,
            definition_type=obj_type.lower(),
            attribute_type="Text",
        )
        ret[name] = obj.id

    return ret

  @staticmethod
  def _create_model(obj_type, cad_map, cavs):
    """Create model and assign CAVs"""

    with factories.single_commit():
      obj = factories.get_model_factory(obj_type)()

      for name, value in cavs.iteritems():
        cad = get_model('CustomAttributeDefinition').query.get(cad_map[name])
        factories.CustomAttributeValueFactory(
            custom_attribute=cad,
            attributable=obj,
            attribute_value=value,
        )

      return obj.id

  @staticmethod
  def _get_orig_cav_list(cad_map, name_to_val):
    """Return list of original cav in request json"""
    return list(
        {
            'custom_attribute_id': cad_map[name],
            'attribute_value': val,
            'attribute_object': None,
        } for name, val in name_to_val.iteritems()
    )

  @staticmethod
  def _get_external_cav_list(name_to_val):
    """Return list of external cav in request json"""
    return list(
        {
            'name': name,
            'value': val,
        } for name, val in name_to_val.iteritems()
    )

  @ddt.data('Standard')
  def test_post_orig_cavs(self, obj_type):
    """Test POST orig cav for {0!r} for normal user"""

    cad_map = self._create_cads(obj_type)

    vals = dict((name, name) for name in cad_map)
    resp, obj = self.object_generator.generate_object(
        get_model(obj_type),
        data={
            'custom_attribute_values': self._get_orig_cav_list(cad_map, vals),
        }
    )

    self.assertStatus(resp, 201)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)

    self.assertDictEqual(cav, exp)

  @ddt.data('Standard')
  def test_post_orig_cavs_external(self, obj_type):
    """Test POST orig cav for {0!r} for external user"""

    cad_map = self._create_cads(obj_type)

    self.object_generator.api.login_as_external()

    vals = dict((name, name) for name in cad_map)
    resp, obj = self.object_generator.generate_object(
        get_model(obj_type),
        data={
            'custom_attribute_values': self._get_orig_cav_list(cad_map, vals),
        }
    )

    self.assertStatus(resp, 201)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)

    self.assertDictEqual(cav, exp)

  @ddt.data('Standard')
  def test_post_ext_cavs(self, obj_type):
    """Test POST external cav for {0!r} for normal user"""

    cad_map = self._create_cads(obj_type)

    vals = dict((name, name) for name in cad_map)
    resp, obj = self.object_generator.generate_object(
        get_model(obj_type),
        data={
            'external_custom_attributes': self._get_external_cav_list(vals),
        }
    )

    self.assertStatus(resp, 201)

    exp = dict()
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('Standard')
  def test_post_ext_cavs_external(self, obj_type):
    """Test POST external cav for {0!r} for external user"""

    cad_map = self._create_cads(obj_type)

    self.object_generator.api.login_as_external()

    vals = dict((name, name) for name in cad_map)
    resp, obj = self.object_generator.generate_object(
        get_model(obj_type),
        data={
            'external_custom_attributes': self._get_external_cav_list(vals),
        }
    )

    self.assertStatus(resp, 201)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('Threat')
  def test_post_ext_and_orig_cavs_external(self, obj_type):
    """Test POST external and orig cav for {0!r} are specified for ext user"""

    cad_map = self._create_cads(obj_type)

    self.object_generator.api.login_as_external()

    orig_vals = dict((name, '{}-1'.format(name)) for name in cad_map)
    ext_vals = dict((name, name) for name in cad_map)
    resp, obj = self.object_generator.generate_object(
        get_model(obj_type),
        data={
            'custom_attribute_values': self._get_orig_cav_list(
                cad_map, orig_vals),
            'external_custom_attributes': self._get_external_cav_list(
                ext_vals),
        }
    )

    self.assertStatus(resp, 201)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('Standard')
  def test_post_not_existing_cavs_external(self, obj_type):
    """Test POST missing cav for {0!r} are specified for external user"""

    cad_map = self._create_cads(obj_type)

    self.object_generator.api.login_as_external()

    vals = dict((name, name) for name in cad_map)
    vals['NEW'] = 'NEWVAL'
    resp, obj = self.object_generator.generate_object(
        get_model(obj_type),
        data={
            'external_custom_attributes': self._get_external_cav_list(vals),
        }
    )

    self.assertStatus(resp, 201)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('Standard')
  def test_post_not_all_cavs_external(self, obj_type):
    """Test POST not all cavs for {0!r} are specified for external user"""

    cad_map = self._create_cads(obj_type)

    self.object_generator.api.login_as_external()

    vals = dict((name, name) for name in cad_map if name != "ATTR1")
    resp, obj = self.object_generator.generate_object(
        get_model(obj_type),
        data={
            'external_custom_attributes': self._get_external_cav_list(vals),
        }
    )

    self.assertStatus(resp, 201)

    exp = dict((cad_map[name], name) for name in cad_map if name != "ATTR1")
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('Standard')
  def test_post_not_all_mandatory_cavs_external(self, obj_type):
    """Test POST not all cavs for {0!r} are specified for external user"""

    cad_map = self._create_cads(obj_type)
    factories.CustomAttributeDefinitionFactory(
        title="M-ATTR1",
        definition_type=obj_type.lower(),
        attribute_type="Text",
        mandatory=True
    )

    self.object_generator.api.login_as_external()

    vals = dict((name, name) for name in cad_map)
    resp, obj = self.object_generator.generate_object(
        get_model(obj_type),
        data={
            'external_custom_attributes': self._get_external_cav_list(vals),
        }
    )

    self.assertStatus(resp, 201)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('Standard')
  def test_put_orig_cavs(self, obj_type):
    """Test PUT orig cav for {0!r} for normal user"""

    cad_map = self._create_cads(obj_type)
    orig_cavs = dict(
        (name, '{}-orig'.format(name)) for name in cad_map
    )
    obj_id = self._create_model(obj_type, cad_map, orig_cavs)

    vals = dict((name, name) for name in cad_map)
    obj = get_model(obj_type).query.get(obj_id)
    resp, obj = self.object_generator.modify(
        obj,
        obj_type.lower(),
        data={
            'custom_attribute_values': self._get_orig_cav_list(cad_map, vals),
        }
    )

    self.assert200(resp)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)

    self.assertDictEqual(cav, exp)

  @ddt.data('System')
  def test_put_orig_cavs_external(self, obj_type):
    """Test PUT orig cav for {0!r} for external user"""

    cad_map = self._create_cads(obj_type)
    orig_cavs = dict(
        (name, '{}-orig'.format(name)) for name in cad_map
    )
    obj_id = self._create_model(obj_type, cad_map, orig_cavs)

    self.object_generator.api.login_as_external()

    vals = dict((name, name) for name in cad_map)
    obj = get_model(obj_type).query.get(obj_id)
    resp, obj = self.object_generator.modify(
        obj,
        obj_type.lower(),
        data={
            'custom_attribute_values': self._get_orig_cav_list(cad_map, vals),
        }
    )

    self.assert200(resp)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)

    self.assertDictEqual(cav, exp)

  @ddt.data('System')
  def test_put_ext_cavs(self, obj_type):
    """Test PUT external cav for {0!r} for normal user"""

    cad_map = self._create_cads(obj_type)
    orig_cavs = dict(
        (name, '{}-orig'.format(name)) for name in cad_map
    )
    obj_id = self._create_model(obj_type, cad_map, orig_cavs)

    vals = dict((name, name) for name in cad_map)
    obj = get_model(obj_type).query.get(obj_id)
    resp, obj = self.object_generator.modify(
        obj,
        obj_type.lower(),
        data={
            'external_custom_attributes': self._get_external_cav_list(vals),
        }
    )

    self.assert200(resp)

    exp = dict((cad_map[name], orig_cavs[name]) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('System')
  def test_put_ext_cavs_external(self, obj_type):
    """Test PUT external cav for {0!r} for external user"""

    cad_map = self._create_cads(obj_type)
    orig_cavs = dict(
        (name, '{}-orig'.format(name)) for name in cad_map
    )
    obj_id = self._create_model(obj_type, cad_map, orig_cavs)

    self.object_generator.api.login_as_external()

    vals = dict((name, name) for name in cad_map)
    obj = get_model(obj_type).query.get(obj_id)
    resp, obj = self.object_generator.modify(
        obj,
        obj_type.lower(),
        data={
            'external_custom_attributes': self._get_external_cav_list(vals),
        }
    )

    self.assert200(resp)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('System')
  def test_put_ext_and_orig_cavs_external(self, obj_type):
    """Test PUT external and orig cav for {0!r} are specified for ext user"""

    cad_map = self._create_cads(obj_type)
    orig_cavs = dict(
        (name, '{}-orig'.format(name)) for name in cad_map
    )
    obj_id = self._create_model(obj_type, cad_map, orig_cavs)

    self.object_generator.api.login_as_external()

    orig_vals = dict((name, '{}-1'.format(name)) for name in cad_map)
    ext_vals = dict((name, name) for name in cad_map)
    obj = get_model(obj_type).query.get(obj_id)
    resp, obj = self.object_generator.modify(
        obj,
        obj_type.lower(),
        data={
            'custom_attribute_values': self._get_orig_cav_list(
                cad_map, orig_vals),
            'external_custom_attributes': self._get_external_cav_list(
                ext_vals),
        }
    )

    self.assert200(resp)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('System')
  def test_put_not_existing_cavs_external(self, obj_type):
    """Test PUT missing cav for {0!r} are specified for external user"""

    cad_map = self._create_cads(obj_type)
    orig_cavs = dict(
        (name, '{}-orig'.format(name)) for name in cad_map
    )
    obj_id = self._create_model(obj_type, cad_map, orig_cavs)

    self.object_generator.api.login_as_external()

    vals = dict((name, name) for name in cad_map)
    vals['NEW'] = 'NEWVAL'
    obj = get_model(obj_type).query.get(obj_id)
    resp, obj = self.object_generator.modify(
        obj,
        obj_type.lower(),
        data={
            'external_custom_attributes': self._get_external_cav_list(vals),
        }
    )

    self.assert200(resp)

    exp = dict((cad_map[name], name) for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)

  @ddt.data('System')
  def test_put_not_all_cavs_external(self, obj_type):
    """Test PUT not all cavs for {0!r} are specified for external user"""

    cad_map = self._create_cads(obj_type)
    orig_cavs = dict(
        (name, '{}-orig'.format(name)) for name in cad_map
    )
    obj_id = self._create_model(obj_type, cad_map, orig_cavs)

    self.object_generator.api.login_as_external()

    vals = dict((name, name) for name in cad_map if name != 'ATTR1')
    obj = get_model(obj_type).query.get(obj_id)
    resp, obj = self.object_generator.modify(
        obj,
        obj_type.lower(),
        data={
            'external_custom_attributes': self._get_external_cav_list(vals),
        }
    )

    self.assert200(resp)

    exp = dict((cad_map[name], name if name != 'ATTR1' else orig_cavs['ATTR1'])
               for name in cad_map)
    cav = dict((i.custom_attribute_id, i.attribute_value)
               for i in obj.custom_attribute_values)
    self.assertDictEqual(cav, exp)
