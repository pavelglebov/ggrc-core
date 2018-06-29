# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Test Program Creator role
"""
import ddt

from ggrc.models import get_model
from ggrc.models import all_models

from integration.ggrc import TestCase
from integration.ggrc.access_control import acl_helper
from integration.ggrc.api_helper import Api
from integration.ggrc.generator import Generator
from integration.ggrc.generator import ObjectGenerator
from integration.ggrc.models import factories


@ddt.ddt
class TestCreator(TestCase):
  """ TestCreator """

  def setUp(self):
    super(TestCreator, self).setUp()
    self.generator = Generator()
    self.api = Api()
    self.object_generator = ObjectGenerator()
    self.init_users()

  def init_users(self):
    """ Init users needed by the test cases """

    users = [("creator", "Creator"), ("admin", "Administrator")]
    self.users = {}
    for (name, role) in users:
      _, user = self.object_generator.generate_person(
          data={"name": name}, user_role=role)
      self.users[name] = user

  def test_admin_page_access(self):
    """Permissions to admin page."""
    for role, code in (("creator", 403), ("admin", 200)):
      self.api.set_user(self.users[role])
      self.assertEqual(self.api.client.get("/admin").status_code, code)

  def test_creator_can_crud(self):
    """ Test Basic create/read,update/delete operations """
    self.api.set_user(self.users["creator"])
    creator_id = self.users["creator"].id
    audit_id = factories.AuditFactory().id
    all_errors = []
    base_models = {
        "Control", "DataAsset", "Contract",
        "Policy", "Regulation", "Standard", "Document", "Facility",
        "Market", "Objective", "OrgGroup", "Vendor", "Product",
        "Clause", "System", "Process", "Project", "AccessGroup",
        "Metric", "ProductGroup", "TechnologyEnvironment"
    }
    for model_singular in base_models:
      try:
        model = get_model(model_singular)
        table_singular = model._inflector.table_singular
        table_plural = model._inflector.table_plural
        # Test POST creation
        response = self.api.post(model, {
            table_singular: {
                "title": model_singular,
                "context": None,
                "documents_reference_url": "ref",
                "link": "https://example.com",  # ignored except for Document
                "contact": {
                    "type": "Person",
                    "id": creator_id,
                },
                "audit": {  # this is ignored on everything but Issues
                    "id": audit_id,
                    "type": "Audit",
                }
            },
        })
        if response.status_code != 201:
          all_errors.append("{} post creation failed {} {}".format(
              model_singular, response.status, response.data))
          continue

        # Test GET when not owner
        obj_id = response.json.get(table_singular).get("id")
        response = self.api.get(model, obj_id)
        if response.status_code != 403:  # we are not onwers yet
          all_errors.append(
              "{} can retrieve object if not owner".format(model_singular))
          continue
        response = self.api.get_collection(model, obj_id)
        collection = response.json.get(
            "{}_collection".format(table_plural)).get(table_plural)
        if collection:
          all_errors.append(
              "{} can retrieve object if not owner (collection)"
              .format(model_singular))
          continue

        # Test GET when owner
        acr = all_models.AccessControlRole.query.filter_by(
            object_type=model_singular,
            name="Admin"
        ).first()
        factories.AccessControlListFactory(
            object_id=obj_id,
            object_type=model_singular,
            ac_role=acr,
            person_id=creator_id
        )
        response = self.api.get(model, obj_id)
        if response.status_code != 200:
          all_errors.append("{} can't GET object {}".format(
              model_singular, response.status))
          continue

        # Test GET collection when owner
        response = self.api.get_collection(model, obj_id)
        collection = response.json.get(
            "{}_collection".format(table_plural)).get(table_plural)
        if not collection:
          all_errors.append(
              "{} cannot retrieve object even if owner (collection)"
              .format(model_singular))
          continue
      except:
        all_errors.append("{} exception thrown".format(model_singular))
        raise
    self.assertEqual(all_errors, [])

  def test_creator_search(self):
    """Test if creator can see the correct object while using the search api"""
    self.api.set_user(self.users['admin'])
    self.api.post(all_models.Regulation, {
        "regulation": {"title": "Admin regulation", "context": None},
    })
    self.api.set_user(self.users['creator'])
    acr_id = all_models.AccessControlRole.query.filter_by(
        object_type="Policy",
        name="Admin"
    ).first().id
    response = self.api.post(all_models.Policy, {
        "policy": {
            "title": "Creator Policy",
            "context": None,
            "access_control_list": [
                acl_helper.get_acl_json(acr_id, self.users["creator"].id)],
        },
    })
    response.json.get("policy").get("id")
    response, _ = self.api.search("Regulation,Policy")
    entries = response.json["results"]["entries"]
    self.assertEqual(len(entries), 1)
    self.assertEqual(entries[0]["type"], "Policy")
    response, _ = self.api.search("Regulation,Policy", counts=True)
    self.assertEqual(response.json["results"]["counts"]["Policy"], 1)
    self.assertEqual(
        response.json["results"]["counts"].get("Regulation"), None)

  def _get_count(self, obj):
    """ Return the number of counts for the given object from search """
    response, _ = self.api.search(obj, counts=True)
    return response.json["results"]["counts"].get(obj)

  def test_creator_should_see_users(self):
    """ Test if creator can see all the users in the system """
    self.api.set_user(self.users['admin'])
    admin_count = self._get_count("Person")
    self.api.set_user(self.users['creator'])
    creator_count = self._get_count("Person")
    self.assertEqual(admin_count, creator_count)

  def test_relationships_access(self):
    """Check if creator cannot access relationship objects"""
    self.api.set_user(self.users['admin'])
    _, obj_0 = self.generator.generate(all_models.Regulation, "regulation", {
        "regulation": {"title": "Test regulation", "context": None},
    })
    _, obj_1 = self.generator.generate(all_models.Regulation, "regulation", {
        "regulation": {"title": "Test regulation 2", "context": None},
    })
    response, rel = self.generator.generate(
        all_models.Relationship, "relationship", {
            "relationship": {"source": {
                "id": obj_0.id,
                "type": "Regulation"
            }, "destination": {
                "id": obj_1.id,
                "type": "Regulation"
            }, "context": None},
        }
    )
    relationship_id = rel.id
    self.assertEqual(response.status_code, 201)
    self.api.set_user(self.users['creator'])
    response = self.api.get_collection(all_models.Relationship,
                                       relationship_id)
    self.assertEqual(response.status_code, 200)
    num = len(response.json["relationships_collection"]["relationships"])
    self.assertEqual(num, 0)

  def test_revision_access(self):
    """Check if creator can access the right revision objects."""

    def gen(title, extra_data=None):
      """Generates requirement."""
      requirement_content = {"title": title, "context": None}
      if extra_data:
        requirement_content.update(**extra_data)
      return self.generator.generate(all_models.Requirement, "requirement", {
          "requirement": requirement_content
      })[1]

    def check(obj, expected):
      """Check that how many revisions of an object current user can see."""
      response = self.api.get_query(
          all_models.Revision,
          "resource_type={}&resource_id={}".format(obj.type, obj.id)
      )
      self.assertEqual(response.status_code, 200)
      self.assertEqual(
          len(response.json['revisions_collection']['revisions']),
          expected
      )

    self.api.set_user(self.users["admin"])
    obj_1 = gen("Test Requirement 1")

    self.api.set_user(self.users["creator"])
    acr_id = all_models.AccessControlRole.query.filter_by(
        object_type="Requirement",
        name="Admin"
    ).first().id
    linked_acl = {
        "access_control_list": [
            acl_helper.get_acl_json(acr_id, self.users["creator"].id)],
    }
    check(obj_1, 0)
    obj_2 = gen("Test Requirement 2", linked_acl)
    obj2_acl = obj_2.access_control_list[0]
    check(obj_2, 1)
    check(obj2_acl, 1)

  @ddt.data("creator", "admin")
  def test_count_type_in_accordion(self, glob_role):
    """Return count of Persons in DB for side accordion."""
    self.api.set_user(self.users[glob_role])
    ocordion_api_person_count_link = (
        "/search?"
        "q=&types=Program%2CWorkflow_All%2C"
        "Audit%2CAssessment%2CIssue%2CRegulation%2C"
        "Policy%2CStandard%2CContract%2CClause%2CRequirement%2CControl%2C"
        "Objective%2CPerson%2COrgGroup%2CVendor%2CAccessGroup%2CSystem%2C"
        "Process%2CDataAsset%2CProduct%2CProject%2CFacility%2C"
        "Market%2CRisk%2CThreat&counts_only=true&"
        "extra_columns=Workflow_All%3DWorkflow%2C"
        "Workflow_Active%3DWorkflow%2CWorkflow_Draft%3D"
        "Workflow%2CWorkflow_Inactive%3DWorkflow&contact_id=1&"
        "extra_params=Workflow%3Astatus%3DActive%3BWorkflow_Active"
        "%3Astatus%3DActive%3BWorkflow_Inactive%3Astatus%3D"
        "Inactive%3BWorkflow_Draft%3Astatus%3DDraft"
    )
    resp = self.api.client.get(ocordion_api_person_count_link)
    self.assertIn("Person", resp.json["results"]["counts"])
    self.assertEqual(all_models.Person.query.count(),
                     resp.json["results"]["counts"]["Person"])

  @ddt.data(
      ("/api/revisions?resource_type={}&resource_id={}", 1),
      ("/api/revisions?source_type={}&source_id={}", 0),
      ("/api/revisions?destination_type={}&destination_id={}", 1),
  )
  @ddt.unpack
  def test_changelog_access(self, link, revision_count):
    """Test accessing changelog under GC user who is assigned to object"""
    with factories.single_commit():
      audit = factories.AuditFactory()
      asmnt = factories.AssessmentFactory(audit=audit)
      asmnt_id = asmnt.id
      factories.RelationshipFactory(source=audit, destination=asmnt)
      verifier_role = all_models.AccessControlRole.query.filter_by(
          object_type="Assessment",
          name="Verifiers",
      ).first()
      factories.AccessControlListFactory(
          person=self.users["creator"],
          ac_role=verifier_role,
          object=asmnt,
      )

    self.api.set_user(self.users["creator"])
    response = self.api.client.get(link.format("Assessment", asmnt_id))
    self.assert200(response)
    self.assertEqual(
        len(response.json.get("revisions_collection", {}).get("revisions")),
        revision_count
    )

  @ddt.data(all_models.ControlCategory, all_models.ControlAssertion)
  def test_permissions_for_categories(self, category_model):
    """Test get collection for {0}."""
    self.api.set_user(self.users["creator"])
    resp = self.api.get_collection(category_model, None)
    plural_name = category_model._inflector.table_plural
    key_name = "{}_collection".format(plural_name)
    self.assertIn(key_name, resp.json)
    self.assertIn(plural_name, resp.json[key_name])
    collection = resp.json[key_name][plural_name]
    self.assertTrue(collection, "Collection shouldn't be empty")
