# Copyright (C) 2018 Google Inc.

# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Unittests for Revision model """

import datetime
import unittest

import ddt
import mock

from ggrc.models import all_models


@ddt.ddt
class TestCheckPopulatedContent(unittest.TestCase):
  """Unittest checks populated content."""
  # pylint: disable=invalid-name

  LIST_OF_REQUIRED_ROLES = [
      "Principal Assignees",
      "Secondary Assignees",
      "Primary Contacts",
      "Secondary Contacts",
  ]

  def setUp(self):
    super(TestCheckPopulatedContent, self).setUp()
    self.object_type = "Control"
    self.object_id = 1
    self.user_id = 123

  @ddt.data(
      # content, expected
      (None, None),
      ('principal_assessor', ("Principal Assignees", 1)),
      ('secondary_assessor', ("Secondary Assignees", 2)),
      ('contact', ("Primary Contacts", 3)),
      ('secondary_contact', ("Secondary Contacts", 4)),
      ('owners', ("Admin", 5)),
  )
  @ddt.unpack
  def test_check_populated_content(self, key, role):
    """Test populated content for revision if ACL doesn't exists."""
    content = {}
    if key:
      content[key] = {"id": self.user_id}
    expected = {"access_control_list": []}
    role_dict = {}
    if role:
      role_name, role_id = role
      expected["access_control_list"].append({
          "display_name": role_name,
          "ac_role_id": role_id,
          "context_id": None,
          "created_at": None,
          "object_type": self.object_type,
          "updated_at": None,
          "object_id": self.object_id,
          "modified_by_id": None,
          "person_id": self.user_id,
          # Frontend require data in such format
          "person": {
              "id": self.user_id,
              "type": "Person",
              "href": "/api/people/{}".format(self.user_id)
          },
          "modified_by": None,
          "id": None,
      })
      role_dict[role_id] = role_name
    obj = mock.Mock()
    obj.id = self.object_id
    obj.__class__.__name__ = self.object_type
    revision = all_models.Revision(obj, mock.Mock(), mock.Mock(), content)

    with mock.patch("ggrc.access_control.role.get_custom_roles_for",
                    return_value=role_dict) as get_roles:
      self.assertEqual(revision.populate_acl(), expected)
      get_roles.assert_called_once_with(self.object_type)

  @ddt.data(None, {}, {"id": None})
  def test_populated_content_no_user(self, user_dict):
    """Test populated content for revision without user id."""
    content = {"principal_assessor": user_dict}
    role_dict = {1: "Principal Assignees"}
    expected = {"access_control_list": []}
    obj = mock.Mock()
    obj.id = self.object_id
    obj.__class__.__name__ = self.object_type
    revision = all_models.Revision(obj, mock.Mock(), mock.Mock(), content)
    with mock.patch("ggrc.access_control.role.get_custom_roles_for",
                    return_value=role_dict) as get_roles:
      self.assertEqual(revision.populate_acl(), expected)
      get_roles.assert_called_once_with(self.object_type)

  @ddt.data(
      'principal_assessor',
      'secondary_assessor',
      'contact',
      'secondary_contact',
  )
  def test_populated_content_no_role(self, key):
    """Test populated content for revision without roles."""
    content = {key: {"id": self.user_id}}
    expected = {"access_control_list": []}
    obj = mock.Mock()
    obj.id = self.object_id
    obj.__class__.__name__ = self.object_type
    revision = all_models.Revision(obj, mock.Mock(), mock.Mock(), content)
    with mock.patch("ggrc.access_control.role.get_custom_roles_for",
                    return_value={}) as get_roles:
      self.assertEqual(revision.populate_acl(), expected)
      get_roles.assert_called_once_with(self.object_type)

  @ddt.data({
      "url": "www.url-foo.com",
      "reference_url": "www.refurl-bar.com",
      "created_at": "2017-07-15T15:49:14",
      "updated_at": "2017-08-20T13:32:42",
  }, {
      "url": "www.url-foo.com",
      "reference_url": "www.refurl-bar.com",
  })
  def test_populated_content_urls(self, content):
    """Test populated content for revision with urls."""
    dates_in_content = "created_at" in content

    if dates_in_content:
      expected_created_at = "2017-07-15T15:49:14"
      expected_updated_at = "2017-08-20T13:32:42"
    else:
      # Revision's own dates should be used as a fallback
      expected_created_at = "2017-11-12T13:14:15"
      expected_updated_at = "2018-11-12T13:14:15"

    expected = [{'display_name': 'www.url-foo.com',
                 'kind': 'REFERENCE_URL',
                 'id': None,
                 'link': 'www.url-foo.com',
                 'title': 'www.url-foo.com',
                 'created_at': expected_created_at,
                 'updated_at': expected_updated_at, },
                {'display_name': 'www.refurl-bar.com',
                 'kind': 'REFERENCE_URL',
                 'id': None,
                 'link': 'www.refurl-bar.com',
                 'title': 'www.refurl-bar.com',
                 'created_at': expected_created_at,
                 'updated_at': expected_updated_at, }]

    obj = mock.Mock()
    obj.id = self.object_id
    obj.__class__.__name__ = self.object_type
    revision = all_models.Revision(obj, mock.Mock(), mock.Mock(), content)
    revision.created_at = datetime.datetime(2017, 11, 12, 13, 14, 15)
    revision.updated_at = datetime.datetime(2018, 11, 12, 13, 14, 15)

    with mock.patch("ggrc.access_control.role.get_custom_roles_for",
                    return_value={}):
      self.assertEqual(revision.populate_reference_url()["reference_url"],
                       expected)

  @ddt.data([{"label": "label"}, [{"id": None, "name": "label"}]],
            [{"label": ""}, []],
            [{"label": None}, []])
  @ddt.unpack
  def test_populated_content_labels(self, content, expected):
    """Test populated content for old revision with label."""
    obj = mock.Mock()
    obj.id = self.object_id
    obj.__class__.__name__ = self.object_type

    revision = all_models.Revision(obj, mock.Mock(), mock.Mock(), content)

    with mock.patch("ggrc.access_control.role.get_custom_roles_for",
                    return_value={},):
      self.assertEqual(revision.populate_labels()["labels"],
                       expected)

  @ddt.data([{"status": "Active"}, {"status": "Active"}, "AccessGroup"],
            [{"status": "Deprecated"}, {"status": "Deprecated"}, "Clause"],
            [{"status": "Draft"}, {"status": "Draft"}, "Control"],
            [{"status": "Effective"}, {"status": "Active"}, "DataAsset"],
            [{"status": "Final"}, {"status": "Active"}, "Directive"],
            [{"status": "In Scope"}, {"status": "Active"}, "Facility"],
            [{"status": "Ineffective"}, {"status": "Active"}, "Issue"],
            [{"status": "Launched"}, {"status": "Active"}, "Market"],
            [{"status": "Not in Scope"}, {"status": "Draft"}, "Objective"],
            [{"status": "Not Launched"}, {"status": "Draft"}, "OrgGroup"],
            [{"status": "Not Launched"}, {"status": "Draft"}, "Product"],
            [{"status": "Not Launched"}, {"status": "Draft"}, "Program"],
            [{"status": "Not Launched"}, {"status": "Draft"}, "Project"],
            [{"status": "Not Launched"}, {"status": "Draft"}, "Requirement"],
            [{"status": "Not Launched"}, {"status": "Draft"}, "System"],
            [{"status": "Not Launched"}, {"status": "Draft"}, "Vendor"],
            [{"status": "Not Launched"}, {"status": "Draft"}, "Risk"],
            [{"status": "Not Launched"}, {"status": "Draft"}, "Threat"],
            [{"status": "Not Launched"}, {}, "Regulation"])
  @ddt.unpack
  def test_populated_status(self, content, expected_content, resource_type):
    """Test populated content with status '{0}' to '{1}' in Model '{2}'."""
    obj = mock.Mock()
    obj.id = self.object_id
    obj.__class__.__name__ = resource_type

    revision = all_models.Revision(obj, mock.Mock(), mock.Mock(), content)
    self.assertEqual(revision.populate_status(), expected_content)

  @ddt.data(
      ({}, {}),
      ({"document_evidence": []}, {"documents_file": []}),
      (
          {"document_evidence": [
              {"link": u"aa", "title": u"bb", "display_name": u"bb"},
          ]},
          {"documents_file": [
              {"link": u"aa", "title": u"bb", "display_name": u"aa bb"},
          ]}
      ),
      (
          {"document_evidence": [
              {"link": u"aa", "title": u"bb", "display_name": u"bb"},
              {"link": u"aa\u5555", "title": u"", "display_name": u""},
          ]},
          {"documents_file": [
              {"link": u"aa", "title": u"bb", "display_name": u"aa bb"},
              {"link": u"aa\u5555", "title": u"", "display_name": u"aa\u5555"},
          ]}
      ),
  )
  @ddt.unpack
  def test_populated_content_evidence(self, content, expected_evidence):
    """Test display names for document evidence in revision content.

    The display name should contain link and title, like we used to have in
    slugs.
    Document epic: 'document_evidence' renamed to 'documents_file'
    """
    obj = mock.Mock()
    obj.id = self.object_id
    obj.__class__.__name__ = self.object_type

    revision = all_models.Revision(obj, mock.Mock(), mock.Mock(), content)

    self.assertEqual(
        # pylint: disable=protected-access
        revision._document_evidence_hack(),
        expected_evidence,
    )

  @ddt.data(
      [],
      [{}],
      [{"parent_id": None}],
      [{"parent_id": 5}],
      [{"parent_id": 0}],
      [{"parent_id": None}, {}],
      [{"parent_id": None}, {"parent_id": 1}, {}],
      [{"parent_id": None}, {"parent_id": 1}, {"parent_id": 2}],
  )
  def test_internal_acl_filter(self, acl_entries):
    """Test filtering of internal roles for {}."""
    obj = mock.Mock()
    obj.id = self.object_id
    obj.__class__.__name__ = self.object_type
    for acl_entry in acl_entries:
      acl_entry.update({"person_id": 1, "ac_role_id": 1})

    content = {"access_control_list": acl_entries}

    role_dict = mock.MagicMock()
    with mock.patch("ggrc.models.custom_attribute_definition.get_cads_counts",
                    return_value={}):
      with mock.patch("ggrc.access_control.role.get_custom_roles_for",
                      return_value=role_dict):
        revision = all_models.Revision(obj, mock.Mock(), mock.Mock(), content)

        for acl in revision.content["access_control_list"]:
          self.assertIsNone(acl.get("parent_id"))
