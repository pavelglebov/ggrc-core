# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Update data via migration Section-Requirement

Create Date: 2018-07-06 05:41:46.398369
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name


from alembic import op

# revision identifiers, used by Alembic.
revision = '20ca15a10d12'
down_revision = '8b8bf3f67224'

SQL_RENAME_FIELD = """
    UPDATE `{table}`
    SET `{column}` = "Requirement"
    WHERE `{column}` = "Section"
"""

SQL_REVERT_RENAMING = """
    UPDATE `{table}`
    SET `{column}` = "Section"
    WHERE `{column}` = "Requirement"
"""


def rename_model(table_name, column_name):
  op.execute(SQL_RENAME_FIELD.format(table=table_name, column=column_name))


def revert_rename_model(table_name, column_name):
  op.execute(SQL_REVERT_RENAMING.format(table=table_name, column=column_name))


MODELS_FIELDS = [
    ("access_control_list", "object_type"),
    ("access_control_roles", "object_type"),
    ("acl_copy", "object_type"),
    ("acr_copy", "object_type"),
    ("assessments", "assessment_type"),
    ("assessment_templates", "template_object_type"),
    ("automappings", "source_type"),
    ("automappings", "destination_type"),
    ("custom_attribute_values", "attributable_type"),
    ("events", "resource_type"),
    ("fulltext_record_properties", "type"),
    ("object_people", "personable_type"),
    ("relationships", "source_type"),
    ("relationships", "destination_type"),
    ("revisions", "resource_type"),
    ("labels", "object_type"),
    ("contexts", "related_object_type"),
    ("issuetracker_issues", "object_type"),
    ("object_labels", "object_type"),
    ("object_templates", "name"),
    ("object_templates", "display_name"),
    ("proposals", "instance_type"),
    ("snapshots", "child_type"),
    ("snapshots", "parent_type"),
]


def upgrade():
  """Upgrade database data, creating a new revision."""
  op.execute("INSERT INTO `requirements` SELECT * FROM `sections`")
  for table, column in MODELS_FIELDS:
    rename_model(table, column)

  update_cad_query = """
      UPDATE `custom_attribute_definitions`
      SET `definition_type` = "requirement"
      WHERE `definition_type` = "section"
  """
  op.execute(update_cad_query)


def downgrade():
  """Downgrade database  data back to the previous revision."""
  op.execute("""
      INSERT INTO `sections`
      SELECT requirements.* FROM `requirements` LEFT JOIN `sections`
          ON requirements.id = sections.id WHERE sections.id is NULL
  """)
  for table, column in MODELS_FIELDS:
    revert_rename_model(table, column)

  update_cad_query = """
      UPDATE `custom_attribute_definitions`
      SET `definition_type` = "section"
      WHERE `definition_type` = "requirement"
  """
  op.execute(update_cad_query)
