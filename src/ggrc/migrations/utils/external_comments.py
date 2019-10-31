# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module contains utils for external comments."""

import sqlalchemy as sa

from ggrc.migrations import utils


def _get_comments_by_object_type(connection, obj_type):
  """Returns comments by object type.

  Args:
    connection: An instance of SQLAlchemy connection.
    obj_type: String representation of object type.
  Returns:
    List of comments by object type.
  """
  result = connection.execute(
      sa.text("""
            SELECT comments.*
            FROM comments
            INNER JOIN
              relationships ON
              relationships.source_id = comments.id
            WHERE
              relationships.source_type = 'Comment' AND
              relationships.destination_type = :obj_type
            UNION
            SELECT comments.*
            FROM comments
            INNER JOIN
              relationships ON
              relationships.destination_id = comments.id
            WHERE
              relationships.destination_type = 'Comment' AND
              relationships.source_type = :obj_type
            """),
      obj_type=obj_type).fetchall()

  return result


def _get_rel_by_comment_id(connection, comment_id):
  """Returns relationship by comment id.

  Args:
    connection: An instance of SQLAlchemy connection.
    comment_id: Id of comment.
  Returns:
    Data of comment relationship.
  """
  result = connection.execute(
      sa.text("""
            SELECT * FROM relationships
            WHERE (source_id = :comment_id
                  AND source_type = 'Comment') OR
                  (destination_id = :comment_id
                  AND destination_type = 'Comment')
            """),
      comment_id=comment_id).fetchone()

  return result


def _add_ext_comment_rel_rev(connection, rel_id):
  """Adds relationships revision for external comments.

  Args:
    connection: An instance of SQLAlchemy connection.
    rel_id: Id of relationship for comment.
  Returns:
    -
  """
  utils.add_to_objects_without_revisions(
      connection,
      rel_id,
      "Relationship",
  )


def _add_ext_comment_rev(connection, comment_id):
  """Adds revision for external comment.

  Args:
    connection: An instance of SQLAlchemy connection.
    comment_id: Id of comment.
  """
  utils.add_to_objects_without_revisions(
      connection,
      comment_id,
      "ExternalComment",
  )


def _remove_comment_rel(connection, rel_id):
  """Removes comments relationship.

  Args:
    connection: An instance of SQLAlchemy connection.
    rel_id: Id of comment relationship.
  Returns:
    -
  """
  connection.execute(
      sa.text("""
              DELETE FROM relationships
              WHERE id = :rel_id
          """),
      rel_id=rel_id,
  )


def _remove_comment_rel_rev(connection, rel_id):
  """Removes relationships revision for comment.

  Args:
    connection: An instance of SQLAlchemy connection.
    rel_id: Id of comment relationship.
  Returns:
    -
  """
  utils.add_to_objects_without_revisions(
      connection,
      rel_id,
      "Relationship",
      action="deleted",
  )


def _remove_comment_rev(connection, comment_id):
  """Removes comment revision.

  Args:
    connection: An instance of SQLAlchemy connection.
    comment_id: Id of comment.
  Returns:
    -
  """
  utils.add_to_objects_without_revisions(
      connection,
      comment_id,
      "Comment",
      action="deleted",
  )


def _move_comments_to_ext_comments(connection, comments):
  """Moves comments for certain object type to external comments table.

  Args:
    connection: An instance of SQLAlchemy connection.
    comments: List of comments.
  """
  for comment in comments:
    if _is_comment_id_exists_in_ext(connection, comment.id):
      max_comment_id = _get_last_ext_comment_id(connection)
      current_id = max_comment_id + 1
    else:
      current_id = comment.id

    _add_ext_comment(connection, current_id, comment)
    _add_ext_comment_rev(connection, current_id)

    rel = _get_rel_by_comment_id(connection, comment.id)
    rel_id = _add_ext_comment_rel(connection, current_id, rel)
    _add_ext_comment_rel_rev(connection, rel_id)

    _remove_comment_rel(connection, rel.id)
    _remove_comment_rel_rev(connection, rel.id)

    _remove_comment(connection, comment.id)
    _remove_comment_rev(connection, comment.id)


def _add_ext_comment(connection, comment_id, comment):
  """Adds external comment.

  Args:
    connection: An instance of SQLAlchemy connection.
    comment_id: Id of object from Comment table.
    comment: An instance of Comment model.
  Returns:
    -
  """
  connection.execute(
      sa.text("""
            INSERT INTO external_comments (
              id,
              description,
              assignee_type,
              context_id,
              created_at,
              updated_at,
              modified_by_id)
            VALUES (
              :id,
              :description,
              :assignee_type,
              :context_id,
              :created_at,
              :updated_at,
              :modified_by_id
            )
            """),
      id=comment_id,
      description=comment.description,
      assignee_type=comment.assignee_type,
      context_id=comment.context_id,
      created_at=comment.created_at,
      updated_at=comment.updated_at,
      modified_by_id=comment.modified_by_id)


def _remove_comment(connection, comment_id):
  """Removes comment from Comment table.

  Args:
    connection: An instance of SQLAlchemy connection.
    comment_id: Id of comment in Comment table.
  Returns:
    -
  """
  connection.execute(
      sa.text("""
            DELETE FROM comments
            WHERE id = :comment_id
            """),
      comment_id=comment_id)
  utils.add_to_objects_without_revisions(
      connection,
      comment_id,
      "Comment",
      action="deleted",
  )


def _add_ext_comment_rel(connection, comment_id, rel):
  """Adds relationships for external comment.

  Args:
    connection: An instance of SQLAlchemy connection.
    comment_id: Id of comment in Comment table.
    rel: An instance of relationship object for comment.
  Returns:
    Id of last inserted relationship for comment.
  """
  connection.execute(
      sa.text("""
            INSERT INTO relationships (
              modified_by_id,
              created_at,
              updated_at,
              source_id,
              source_type,
              destination_id,
              destination_type,
              context_id,
              parent_id,
              automapping_id,
              is_external)
            VALUES (
              :modified_by_id,
              :created_at,
              :updated_at,
              :source_id,
              :source_type,
              :destination_id,
              :destination_type,
              :context_id,
              :parent_id,
              :automapping_id,
              :is_external)
            """),
      modified_by_id=rel.modified_by_id,
      created_at=rel.created_at,
      updated_at=rel.updated_at,
      source_id=comment_id if rel.source_type == 'Comment'
      else rel.source_id,
      source_type='ExternalComment' if rel.source_type == 'Comment'
      else rel.source_type,
      destination_id=comment_id if rel.destination_type == 'Comment'
      else rel.destination_id,
      destination_type='ExternalComment' if rel.destination_type == 'Comment'
      else rel.destination_type,
      context_id=rel.context_id,
      parent_id=rel.parent_id,
      automapping_id=rel.automapping_id,
      is_external=rel.is_external)

  rel_id = utils.last_insert_id(connection)
  return rel_id


def _get_last_ext_comment_id(connection):
  """Returns last external comment id.

  Args:
    connection: An instance of SQLAlchemy connection.
  Returns:
    Integer of last comment id from external model.
  """
  result = connection.execute(
      sa.text("""
            SELECT
              MAX(id)
            FROM external_comments
            """)).fetchone()[0]

  return result


def _is_comment_id_exists_in_ext(connection, comment_id):
  """Checks that comment id exists in external comment.

  Args:
    connection: An instance of SQLAlchemy connection.
    comment_id: Id of comment.
  Returns:
    Indicator that comment id exists in external comment
  """
  result = connection.execute(
      sa.text("""
            SELECT 1
            FROM external_comments
            WHERE id = :comment_id
            """),
      comment_id=comment_id).fetchone()

  return bool(result)


def move_to_external_comments(connection, obj_type):
  """Moves comments to external comments for object type.

  Args:
    connection: An instance of SQLAlchemy connection.
    obj_type: String representation of object type.
  """
  comments = _get_comments_by_object_type(connection, obj_type)
  _move_comments_to_ext_comments(connection, comments)

  return len(comments)
