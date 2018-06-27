# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Create requirement table

Create Date: 2018-07-06 14:33:43.313755
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = '8b8bf3f67224'
down_revision = '054d15be7a29'


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  op.create_table(
      'requirements',
      sa.Column('id', sa.Integer(), nullable=False),
      sa.Column('recipients', sa.String(length=250), nullable=True),
      sa.Column('send_by_default', sa.Boolean(), nullable=True),
      sa.Column('notes', sa.Text(), nullable=False),
      sa.Column('os_state', sa.String(length=250), nullable=False),
      sa.Column('start_date', sa.Date(), nullable=True),
      sa.Column('last_deprecated_date', sa.Date(), nullable=True),
      sa.Column('test_plan', sa.Text(), nullable=False),
      sa.Column('context_id', sa.Integer(), nullable=True),
      sa.Column('status', sa.String(length=250), nullable=False),
      sa.Column('description', sa.Text(), nullable=False),
      sa.Column('title', sa.String(length=250), nullable=False),
      sa.Column('slug', sa.String(length=250), nullable=False),
      sa.Column('updated_at', sa.DateTime(), nullable=False),
      sa.Column('modified_by_id', sa.Integer(), nullable=True),
      sa.Column('created_at', sa.DateTime(), nullable=False),
      sa.ForeignKeyConstraint(['context_id'], ['contexts.id'], ),
      sa.PrimaryKeyConstraint('id'),
      sa.UniqueConstraint('slug', name='uq_requirements'),
      sa.UniqueConstraint('title', name='uq_t_requirements')
  )
  op.create_index(
      'fk_requirements_contexts',
      'requirements',
      ['context_id'],
      unique=False
  )
  op.create_index(
      'ix_requirements_updated_at',
      'requirements',
      ['updated_at'],
      unique=False
  )


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  op.drop_table('requirements')
