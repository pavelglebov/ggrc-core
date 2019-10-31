# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Migration of Scope Objects comments to external comments

Create Date: 2019-10-24 07:08:32.698042
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name


from alembic import op

from ggrc.migrations.utils import external_comments
from ggrc.models import all_models

# revision identifiers, used by Alembic.
revision = 'e91e309a7b27'
down_revision = '42c06faa767e'


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  conn = op.get_bind()
  scope_models_names = all_models.get_scope_model_names()
  for model_name in scope_models_names:
    data = external_comments.move_to_external_comments(conn, model_name)
    print ("Processing -> %s: %s comments migrated" % (model_name, data))


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  raise NotImplementedError("Downgrade is not supported")
