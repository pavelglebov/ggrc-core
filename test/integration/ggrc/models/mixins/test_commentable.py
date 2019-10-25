# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Integration tests for Commentable mixin."""

import ddt

from ggrc.models import all_models

from integration.ggrc import api_helper
from integration.ggrc import TestCase
from integration.ggrc.models import factories


@ddt.ddt
class TestCommentableMixin(TestCase):
  """Test cases for Commentable mixin."""

  def setUp(self):
    super(TestCommentableMixin, self).setUp()
    self.client.get("/login")
    self.api = api_helper.Api()

  def test_asmnt_comments(self):
    """Test if assessment has proper comments."""
    # This test check bug which is reproduced when ids of Audit, Assessment
    # and Comment are the same
    with factories.single_commit():
      audit = factories.AuditFactory()
      for i in range(3):
        assessment = factories.AssessmentFactory(id=audit.id + i, audit=audit)
        factories.RelationshipFactory(source=assessment, destination=audit)
        comment = factories.CommentFactory(
            id=audit.id + i,
            description="test{0}".format(i)
        )
        factories.RelationshipFactory(source=assessment, destination=comment)

    asmnt_comments = all_models.Assessment.query.first().comments

    self.assertEquals(1, len(asmnt_comments))
    self.assertEquals("test0", "".join(c.description for c in asmnt_comments))

  @ddt.data(factories.AssessmentFactory,
            factories.ProgramFactory,
            factories.DocumentFactory,
            factories.IssueFactory)
  def test_comments_delete(self, object_factory):
    """Test if {} deleted along with comments."""
    obj = object_factory()
    comment_first = factories.CommentFactory()
    comment_second = factories.CommentFactory()
    comment_ids = (comment_first.id, comment_second.id)
    relationship_first = factories.RelationshipFactory(
        source=comment_first, destination=obj)
    relationship_second = factories.RelationshipFactory(
        source=obj, destination=comment_second)
    rel_ids = (relationship_first.id, relationship_second.id)

    result = self.api.delete(obj)
    self.assertEqual(result.status_code, 200)
    for rel_id in rel_ids:
      relationship = all_models.Relationship.query.get(rel_id)
      self.assertEqual(relationship, None)

    for comment_id in comment_ids:
      comment = all_models.Comment.query.get(comment_id)
      self.assertEqual(comment, None)

      delete_revision = all_models.Revision.query.filter(
          all_models.Revision.resource_id == comment_id,
          all_models.Revision.resource_type == "Comment",
          all_models.Revision.action == "deleted"
      ).first()
      self.assertNotEqual(delete_revision, None)
