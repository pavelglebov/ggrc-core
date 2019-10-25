# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Migration Scoping models comments from HTML to Markdown

Create Date: 2019-10-30 12:14:47.391000
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name


from alembic import op

from ggrc.models import all_models
from ggrc.migrations.utils import migrate_comments_to_markdown


# revision identifiers, used by Alembic.
revision = '42c06faa767e'
down_revision = '9a38b1d92f3e'


scop_names = all_models.get_scope_model_names()


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  conn = op.get_bind()
  for model in scop_names:
    migrate_comments_to_markdown.update_comments(conn, model)


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  raise NotImplementedError("Downgrade is not supported")
