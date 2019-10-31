# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module that helps to convert comments from HTML to Markdown"""


import sqlalchemy as sa


from ggrc.migrations import utils
from ggrc.migrations.utils import html_markdown_parser


REGEX_HTML = r"(<[a-zA-Z]+>)+|(<\/[a-zA-Z]+>)+"


def parse_html(value):
  """Parse html to markdown.

    Args:
      value: the raw value of rich text data

    Returns:
      rich text value with markdown styling.
  """
  parser = html_markdown_parser.HTML2MarkdownParser()
  parser.feed(value)
  return parser.get_data()


def update_comments(connection, model_name):
  """Parse comments from html to markdown.

    Args:
      connection: SQLAlchemy connection.
      model_name: string
  """
  comments_data = connection.execute(
      sa.text("""
            SELECT c.id, c.description
            FROM comments AS c
            JOIN relationships AS r
            ON r.source_type = "Comment" AND r.source_id = c.id
              AND r.destination_type = :model_name
            WHERE c.description REGEXP :reg_exp
            UNION
            SELECT c.id, c.description
            FROM comments AS c
            JOIN relationships AS r
            ON r.destination_type = "Comment" AND r.destination_id = c.id
              AND r.source_type = :model_name
            WHERE c.description REGEXP :reg_exp
        """),
      reg_exp=REGEX_HTML,
      model_name=model_name
  ).fetchall()
  comments_ids = [c_id for c_id, _ in comments_data]

  for comment_id, description in comments_data:
    connection.execute(
        sa.text("""
                    UPDATE comments SET
                    description= :description,
                    updated_at=NOW()
                    WHERE id= :comment_id  
              """),
      description=parse_html(description),
      comment_id=comment_id
    )
  utils.add_to_objects_without_revisions_bulk(
      connection, comments_ids, "Comment", "modified",
  )