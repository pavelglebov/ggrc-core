# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Base module for convert attributes from html to markdown."""

import datetime

import sqlalchemy as sa

from alembic import op

from ggrc.migrations import utils
from ggrc.migrations.utils import html_markdown_parser


class BaseConverter(object):
  """Base class for convert attributes from html to markdown."""

  REGEX_HTML = r"(<[a-zA-Z]+>)+|(<\/[a-zA-Z]+>)+"
  DEFINITION_TYPE = 'base'
  OBJECT_TYPE = 'Base'
  TABLE_NAME = 'bases'

  def update_comments(self, connection):
    """Parse comments from html to markdown.

      Args:
        connection: SQLAlchemy connection.
    """
    comments_data = self._get_comments(connection)
    comments_ids = [c_id for c_id, _ in comments_data]
    if comments_ids:
      self._processing_comments(comments_data)
      utils.add_to_objects_without_revisions_bulk(
          connection, comments_ids, "Comment", "modified",
      )

  def update_custom_values(self, connection):
    """Updates custom values from html to markdown.

    Args:
      connection: SQLAlchemy connection.
    """
    cavs_data = self._get_custom_values(connection)
    obj_ids = {data[2] for data in cavs_data}
    cav_ids = {data[0] for data in cavs_data}
    if cav_ids:
      self._processing_custom_values(cavs_data)
      utils.add_to_objects_without_revisions_bulk(
          connection, cav_ids, "CustomAttributeValue", "modified",
      )

    return obj_ids

  def update_attributes(self, connection):
    """Updates object attributes from html to markdown.

    Args:
      connection: SQLAlchemy connection.
    """
    raise NotImplementedError("Should be implemented in the inheritors")

  def convert_to_markdown(self, connection):
    """Converts objects and relationships from html to markdown.

    Args:
      connection: SQLAlchemy connection.
    """
    self.update_comments(connection)
    object_ids_by_cavs = self.update_custom_values(connection)
    object_ids_by_attributes = self.update_attributes(connection)
    object_ids = object_ids_by_cavs.union(object_ids_by_attributes)
    if object_ids:
      utils.add_to_objects_without_revisions_bulk(
          connection, object_ids, self.OBJECT_TYPE, "modified",
      )

  @staticmethod
  def _parse_html(value):
    """Parse html to markdown.

      Args:
        value: the raw value of rich text data

      Returns:
        rich text value with markdown styling.
    """
    parser = html_markdown_parser.HTML2MarkdownParser()
    parser.feed(value)

    return parser.get_data()

  def _get_comments(self, connection):
    """Gets comments for processing.

    Args:
      connection: SQLAlchemy connection.
    Returns:
      List of comment information.
    """
    comment_data = connection.execute(
        sa.text("""
                SELECT c.id, c.description
                FROM comments AS c
                JOIN relationships AS r
                ON r.source_type = "Comment" AND r.source_id = c.id
                  AND r.destination_type = :object_type
                WHERE c.description REGEXP :reg_exp
                UNION
                SELECT c.id, c.description
                FROM comments AS c
                JOIN relationships AS r
                ON r.destination_type = "Comment" AND r.destination_id = c.id
                  AND r.source_type = :object_type
                WHERE c.description REGEXP :reg_exp
            """),
        reg_exp=self.REGEX_HTML,
        object_type=self.OBJECT_TYPE
    ).fetchall()

    return comment_data

  def _processing_comments(self, comments_data):
    """Updates comments from html to markdown.

    Args:
      comments_data: List of comment information.
    """
    comments_table = sa.sql.table(
        'comments',
        sa.Column('id', sa.Integer()),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    for comment_id, description in comments_data:
      op.execute(comments_table.update().values(
          description=self._parse_html(description),
          updated_at=datetime.datetime.utcnow(),
      ).where(comments_table.c.id == comment_id))

  def _get_custom_values(self, connection):
    """Gets custom values records.

    Args:
      connection: SQLAlchemy connection.
    Returns:
      List of custom attribute records.
    """
    cavs_data = connection.execute(
        sa.text("""
                SELECT cav.id, cav.attribute_value, cav.attributable_id
                FROM custom_attribute_values AS cav
                JOIN custom_attribute_definitions AS cad
                  ON cad.id = cav.custom_attribute_id
                WHERE cad.definition_type = :object_type
                  AND attribute_value REGEXP :reg_exp
            """),
        reg_exp=self.REGEX_HTML,
        object_type=self.DEFINITION_TYPE
    ).fetchall()

    return cavs_data

  def _processing_custom_values(self, cavs_data):
    """Updates custom values from html to markdown.

    Args:
      cavs_data: List of custom values.
    """
    cavs_table = sa.sql.table(
        'custom_attribute_values',
        sa.Column('id', sa.Integer()),
        sa.Column('attribute_value', sa.Text, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    for cav_id, attribute_value, _ in cavs_data:
      op.execute(cavs_table.update().values(
          attribute_value=self._parse_html(attribute_value),
          updated_at=datetime.datetime.utcnow(),
      ).where(cavs_table.c.id == cav_id))
