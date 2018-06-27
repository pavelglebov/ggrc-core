# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Update data for Requirements

Create Date: 2018-07-10 15:42:20.137252
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

from alembic import op

# revision identifiers, used by Alembic.
revision = '5eae0c070070'
down_revision = 'fb1241a031f9'


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  change_task_group_obj_query = """
        UPDATE task_group_objects
        SET object_type = "Requirement"
        WHERE object_type = "Section"
    """
  op.execute(change_task_group_obj_query)


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  change_task_group_obj_query = """
        UPDATE task_group_objects
        SET object_type = "Section"
        WHERE object_type = "Requirement"
    """
  op.execute(change_task_group_obj_query)
