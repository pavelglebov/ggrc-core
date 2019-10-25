# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Test import and export of objects with custom attributes."""

import collections
import ddt
from flask.json import dumps

from integration.ggrc import TestCase
from integration.ggrc.generator import ObjectGenerator
from ggrc import db
from ggrc.models import Standard
from ggrc.models import Regulation
from ggrc.converters import errors


@ddt.ddt
class TestCustomAttributeImportExport(TestCase):
  """Test import and export with custom attributes."""

  @classmethod
  def setUpClass(cls):
    """Generate all required objects and custom attributes for
    import of objects containing custom attributes.
    """
    TestCase.clear_data()
    cls.generator = ObjectGenerator()
    cls.create_custom_attributes()

  @classmethod
  def tearDownClass(cls):
    """Clears the data in db"""
    TestCase.clear_data()

  def setUp(self):
    """Setup stage for each test.

    Initializes a http client that is used
    for sending import/export requests.
    """
    self.client.get("/login")
    self.headers = ObjectGenerator.get_header()

  @classmethod
  def create_custom_attributes(cls):
    """Generate custom attributes needed for csv import

    This function generates all custom attributes on Regulation and Standard,
    that are used in test cases defined in this class
    """
    gen = cls.generator.generate_custom_attribute
    gen("regulation", attribute_type="Text", title="ca_text")
    gen("regulation", attribute_type="Text", title="man_ca_text",
        mandatory=True)
    gen("regulation", attribute_type="Rich Text", title="ca_rich_text")
    gen("regulation", attribute_type="Rich Text", title="man_ca_rich_text",
        mandatory=True)
    gen("regulation", attribute_type="Date", title="ca_date")
    gen("regulation", attribute_type="Date", title="man_ca_date",
        mandatory=True, helptext="Birthday")
    gen("regulation", attribute_type="Checkbox", title="ca_checkbox")
    gen("regulation", attribute_type="Checkbox", title="man_ca_checkbox",
        mandatory=True)
    gen("regulation", attribute_type="Multiselect", title="ca_multiselect",
        multi_choice_options="one,two,three,four,five")
    gen("regulation", attribute_type="Multiselect", title="man_ca_multiselect",
        multi_choice_options="one,two,three,four,five", mandatory=True)
    gen("regulation", attribute_type="Dropdown", title="ca_dropdown",
        options="one,two,three,four,five", helptext="Your favorite number.")
    gen("regulation", attribute_type="Dropdown", title="man_ca_dropdown",
        options="one,two,three,four,five", mandatory=True)

    gen("standard", attribute_type="Text",
        title="standard_ca_text", mandatory=True)

  @ddt.data(
      ("Text", "Optional text", "Mandatory text", {}),
      ("Text", "", "Mandatory text", {}),
      ("Text", "Optional text", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_text")
              }
          }
      }),
      ("Text", "", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_text")
              }
          }
      }),
      ("Rich Text", "Optional <br> rich <br> text",
       "Mandatory <br> rich <br> text", {}),
      ("Rich Text", "", "Mandatory <br> rich <br> text", {}),
      ("Rich Text", "Optional <br> rich <br> text", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_rich_text")
              }
          }
      }),
      ("Rich Text", "", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_rich_text")
              }
          }
      }),
      ("Date", "5/7/2015", "9/15/2015", {}),
      ("Date", "", "9/15/2015", {}),
      ("Date", "5/7/2015", "", {}),
      ("Date", "", "", {}),
      ("Date", "5/7/2015", "hello world", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_date")
              },
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="man_ca_date")
              }
          }
      }),
      ("Date", "hello world", "9/15/2015", {
          "Regulation": {
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="ca_date")
              }
          }
      }),
      ("Checkbox", "no", "yes", {}),
      ("Checkbox", "", "yes", {}),
      ("Checkbox", "no", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_checkbox")
              },
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="man_ca_checkbox")
              }
          }
      }),
      ("Checkbox", "", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_checkbox")
              },
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="man_ca_checkbox")
              }
          }
      }),
      ("Checkbox", "hello", "yes", {
          "Regulation": {
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="ca_checkbox")
              }
          }
      }),
      ("Checkbox", "", "hello", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_checkbox")
              },
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="man_ca_checkbox")
              }
          }
      }),
      ("Dropdown", "one", "two", {}),
      ("Dropdown", "", "two", {}),
      ("Dropdown", "one", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_dropdown")
              }
          }
      }),
      ("Dropdown", "", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_dropdown")
              }
          }
      }),
      ("Dropdown", "six", "two", {
          "Regulation": {
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="ca_dropdown")
              }
          }
      }),
      ("Dropdown", "one", "six", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_dropdown")
              },
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="man_ca_dropdown")
              }
          }
      }),
      ("Multiselect", "one,three", "two,four,five", {}),
      ("Multiselect", "", "two,four,five", {}),
      ("Multiselect", "one,three", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_multiselect")
              }
          }
      }),
      ("Multiselect", "", "", {
          "Regulation": {
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_multiselect")
              }
          }
      }),
      ("Multiselect", "one,six", "", {
          "Regulation": {
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="ca_multiselect")
              },
              "row_errors": {
                  errors.MISSING_VALUE_ERROR.format(
                      line=3,
                      column_name="man_ca_multiselect")
              }
          }
      }),
      ("Multiselect", "one,three", "two,four,six", {
          "Regulation": {
              "row_warnings": {
                  errors.WRONG_VALUE.format(
                      line=3,
                      column_name="man_ca_multiselect")
              }
          }
      }),
  )
  @ddt.unpack
  def test_regulation_ca_import(self, ca_type, ca_value,
                                man_ca_value, expected_response):
    """Test import of regulation with all custom attributes.

    This tests covers all possible custom attributes with mandatory flag turned
    off and on, and checks for all warnings that should be present.
    """

    regulation_data = collections.OrderedDict([
        ("object_type", "Regulation"),
        ("Code*", ""),
        ("Admin", "user@example.com"),
    ])

    ca_attr = 'ca_' + ca_type.replace(' ', '_').lower()
    man_ca_attr = 'man_' + ca_attr

    regulation_data[ca_attr] = ca_value
    regulation_data[man_ca_attr] = man_ca_value
    regulation_data["Title"] = "Regulation Title - {}: {},{}".format(
        ca_type,
        ca_value,
        man_ca_value)

    response = self.import_data(regulation_data)
    self._check_csv_response(response, expected_response)

    row_errors = expected_response["Regulation"]["row_errors"]
    row_warnings = expected_response["Regulation"]["row_warnings"]
    if not (row_errors or row_warnings):
      regulation_data["Admin"] = "unknown@example.com"
      regulation_data["Title"] = regulation_data["Title"] + '_new'
      response = self.import_data(regulation_data)
      expected_response["Regulation"]["row_warnings"] = {
          errors.OWNER_MISSING.format(
              line=3,
              column_name="Admin"),
          errors.UNKNOWN_USER_WARNING.format(
              line=3,
              email="unknown@example.com"),
      }
      self._check_csv_response(response, expected_response)

  # pylint: disable=invalid-name
  def test_regulation_ca_import_update(self):
    """Test updating of regulation with all custom attributes.

    This tests covers updates for all possible custom attributes
    """
    # TODO: check response data explicitly

    regulation_data = collections.OrderedDict([
        ("object_type", "Regulation"),
        ("Code*", ""),
        ("Title", "Regulation title"),
        ("Admin", "user@example.com"),
        ("ca_text", "normal text"),
        ("man_ca_text", "mandatory text"),
        ("ca_rich_text", "normal <br> rich <br> text"),
        ("man_ca_rich_text", "mandatory <br> rich <br> text"),
        ("ca_date", "5/7/2015"),
        ("man_ca_date", "9/15/2015"),
        ("ca_checkbox", "no"),
        ("man_ca_checkbox", "yes"),
        ("ca_multiselect", "one,two"),
        ("man_ca_multiselect", "three,four"),
        ("ca_dropdown", "three"),
        ("man_ca_dropdown", "five"),
    ])

    self.import_data(regulation_data)

    regulation = Regulation.query.filter(
        Regulation.title == "Regulation title").first()
    regulation_slug = regulation.slug

    regulation_data = collections.OrderedDict([
        ("object_type", "Regulation"),
        ("Code*", regulation_slug),
        ("ca_text", "edited normal text"),
        ("man_ca_text", "edited mandatory text"),
        ("ca_rich_text", "normal <br> edited rich <br> text"),
        ("man_ca_rich_text", "mandatory <br> edited rich <br> text"),
        ("ca_date", "9/14/2017"),
        ("man_ca_date", "1/17/2018"),
        ("ca_checkbox", "yes"),
        ("man_ca_checkbox", "no"),
        ("ca_multiselect", "three,four"),
        ("man_ca_multiselect", "two,four,five"),
        ("ca_dropdown", "one"),
        ("man_ca_dropdown", "two"),
    ])

    self.import_data(regulation_data)

    reg_0_expected = {
        u"ca_text": u"edited normal text",
        u"man_ca_text": u"edited mandatory text",
        u"ca_rich_text": u"normal <br> edited rich <br> text",
        u"man_ca_rich_text": u"mandatory <br> edited rich <br> text",
        u"ca_date": u"2017-09-14",
        u"man_ca_date": u"2018-01-17",
        u"ca_checkbox": u"1",
        u"man_ca_checkbox": u"0",
        u"ca_multiselect": u"three,four",
        u"man_ca_multiselect": u"two,four,five",
        u"ca_dropdown": u"one",
        u"man_ca_dropdown": u"two"
    }

    updated_regulation = Regulation.query.filter(
        Regulation.slug == regulation_slug).first()
    reg_0_new = {c.custom_attribute.title: c.attribute_value
                 for c in updated_regulation.custom_attribute_values}

    self.assertEqual(reg_0_expected, reg_0_new)

  def tests_ca_export(self):
    """Test exporting regulations with custom attributes

    This test checks that we get a proper response when exporting objects with
    custom attributes and that the response data actually contains more lines
    than an empty template would.
    This tests relys on the import tests to work. If those fail they need to be
    fixied before this one.
    """
    db.session.query(Regulation).delete()
    db.session.commit()

    regulation_data = [
        collections.OrderedDict([
            ("object_type", "Regulation"),
            ("Code*", ""),
            ("Title", "Regulation title1"),
            ("Admin", "user@example.com"),
            ("ca_text", "normal text"),
            ("man_ca_text", "mandatory text"),
            ("ca_rich_text", "normal <br> rich <br> text"),
            ("man_ca_rich_text", "mandatory <br> rich <br> text"),
            ("ca_date", "5/7/2015"),
            ("man_ca_date", "9/15/2015"),
            ("ca_checkbox", "no"),
            ("man_ca_checkbox", "yes"),
            ("ca_multiselect", "one,two"),
            ("man_ca_multiselect", "three,four"),
            ("ca_dropdown", "three"),
            ("man_ca_dropdown", "five"),
        ]),
        collections.OrderedDict([
            ("object_type", "Regulation"),
            ("Code*", ""),
            ("Title", "Regulation title2"),
            ("Admin", "user@example.com"),
            ("ca_text", "normal text2"),
            ("man_ca_text", ""),
            ("ca_rich_text", "normal <br> rich <br> text2"),
            ("man_ca_rich_text", "mandatory <br> rich <br> text2"),
            ("ca_date", "5/7/2015"),
            ("man_ca_date", "9/15/2015"),
            ("ca_checkbox", "no"),
            ("man_ca_checkbox", "yes"),
            ("ca_multiselect", "one,two"),
            ("man_ca_multiselect", "three,four"),
            ("ca_dropdown", "three"),
            ("man_ca_dropdown", "five"),
        ]),
        collections.OrderedDict([
            ("object_type", "Regulation"),
            ("Code*", ""),
            ("Title", "Regulation title3"),
            ("Admin", "user@example.com"),
            ("Assignee", "user@example.com"),
            ("Verifier", "user@example.com"),
            ("ca_text", "normal text3"),
            ("man_ca_text", "mandatory text3"),
            ("man_ca_rich_text", "mandatory <br> rich <br> text3"),
            ("man_ca_date", "9/15/2015"),
            ("man_ca_checkbox", "yes"),
            ("man_ca_multiselect", "three,four"),
            ("man_ca_dropdown", "five"),
        ]),
    ]

    self.import_data(*regulation_data)

    data = [{
        "object_name": "Regulation",
        "fields": "all",
        "filters": {
            "expression": {}
        }
    }]
    expected_custom_attributes = {
        "ca_text",
        "man_ca_text*",
        "ca_rich_text",
        "man_ca_rich_text*",
        "ca_date",
        "man_ca_date*",
        "ca_checkbox",
        "man_ca_checkbox*",
        "ca_dropdown",
        "man_ca_dropdown*",
    }
    result = self.export_parsed_csv(data)["Regulation"]

    self.assertEqual(len(result), 2)
    for res in result:
      self.assertTrue(
          expected_custom_attributes.issubset(set(res.iterkeys()))
      )

  def tests_ca_export_filters(self):
    """Test filtering on custom attribute values."""

    # TODO: check response data explicitly
    regulation_data = [
        collections.OrderedDict([
            ("object_type", "Regulation"),
            ("Code*", ""),
            ("Title", "Regulation title1"),
            ("Admin", "user@example.com"),
            ("ca_text", "normal text"),
            ("man_ca_text", "mandatory text"),
            ("ca_rich_text", "normal <br> rich <br> text"),
            ("man_ca_rich_text", "mandatory <br> rich <br> text"),
            ("ca_date", "5/7/2015"),
            ("man_ca_date", "9/15/2015"),
            ("ca_checkbox", "no"),
            ("man_ca_checkbox", "yes"),
            ("ca_multiselect", "one,two"),
            ("man_ca_multiselect", "three,four"),
            ("ca_dropdown", "three"),
            ("man_ca_dropdown", "five"),
        ]),
        collections.OrderedDict([
            ("object_type", "Regulation"),
            ("Code*", ""),
            ("Title", "Regulation title2"),
            ("Admin", "user@example.com"),
            ("Assignee", "user@example.com"),
            ("Verifier", "user@example.com"),
            ("ca_text", "normal text"),
            ("man_ca_text", "mandatory text2"),
            ("man_ca_rich_text", "mandatory <br> rich <br> text2"),
            ("man_ca_date", "9/15/2015"),
            ("man_ca_checkbox", "yes"),
            ("man_ca_multiselect", "three,four"),
            ("man_ca_dropdown", "five"),
        ]),
    ]

    self.import_data(*regulation_data)

    data = {
        "export_to": "csv",
        "objects": [{
            "object_name": "Regulation",
            "filters": {
                "expression": {
                    "left": "ca_text",
                    "op": {"name": "="},
                    "right": "normal text",
                },
            },
            "fields": "all",
        }]
    }
    response = self.client.post("/_service/export_csv", data=dumps(data),
                                headers=self.headers)
    self.assert200(response)
    self.assertIn(",normal text,", response.data)

  def test_multi_word_object_with_ca(self):
    """Test multi-word (e.g. Standard) object import"""

    response = self.import_data(collections.OrderedDict([
        ("object_type", "Standard"),
        ("Code*", ""),
        ("Title", "std-1"),
        ("Admin", "user@example.com"),
        ("Assignee", "user@example.com"),
        ("Verifier", "user@example.com"),
        ("standard_ca_text", "Multi word text"),
    ]))

    self.assertEqual([], response[0]["row_warnings"])
    self.assertEqual([], response[0]["row_errors"])
    self.assertEqual(1, response[0]["created"])
    self.assertEqual(0, response[0]["ignored"])
    self.assertEqual(0, response[0]["updated"])
    self.assertEqual(1, Standard.query.count())

    standard = Standard.query.filter(
        Standard.title == "std-1").first()

    filtered = [val for val in standard.custom_attribute_values if
                val.attribute_value == "Multi word text"]
    self.assertEqual(len(filtered), 1)
