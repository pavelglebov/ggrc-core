# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Update acr and acl tables for requirements

Create Date: 2018-07-10 10:02:00.321824
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

from alembic import op

# revision identifiers, used by Alembic.
revision = '61f4e42f00a9'
down_revision = '786774c00050'


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  change_acr_query = """
      UPDATE access_control_roles
      SET object_type = "Requirement"
      WHERE object_type = "Section"
  """
  op.execute(change_acr_query)

  change_acl_query = """
      UPDATE access_control_list
      SET object_type = "Requirement"
      WHERE object_type = "Section"
  """
  op.execute(change_acl_query)


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  change_acr_query = """
      UPDATE access_control_roles
      SET object_type = "Section"
      WHERE object_type = "Requirement"
  """
  op.execute(change_acr_query)

  change_acl_query = """
      UPDATE access_control_list
      SET object_type = "Section"
      WHERE object_type = "Requirement"
  """
  op.execute(change_acl_query)
