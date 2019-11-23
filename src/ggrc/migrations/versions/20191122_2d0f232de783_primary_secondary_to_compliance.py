# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
migrate primary/secondary contacts to compliance for scope objects

Create Date: 2019-11-22 13:18:31.798045
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

from sqlalchemy.sql import text

from alembic import op

from ggrc.models.all_models import get_scope_model_names


# revision identifiers, used by Alembic.
revision = '2d0f232de783'
down_revision = '007ee00ff963'

PRIMARY_CONTACTS = "Primary Contacts"
SECONDARY_CONTACTS = "Secondary Contacts"
COMPLIANCE_CONTACTS = "Compliance Contacts"

SCOPE_CONTACT_TYPES = (PRIMARY_CONTACTS,
                       SECONDARY_CONTACTS,
                       COMPLIANCE_CONTACTS,)


def _get_object_ids_with_contact_types(connection, object_type):
  """Gets object ids with scope contacts by object type.

  Args:
    connection: Database connection.
    object_type: A string value of scope object type.
  Returns:
    List of object ids.
  """
  objects = connection.execute(
      text("""
        SELECT
          DISTINCT(`access_control_list`.`object_id`)
        FROM `access_control_list`
        INNER JOIN `access_control_roles`
          ON `access_control_list`.`ac_role_id` = `access_control_roles`.`id`
        WHERE
          `access_control_roles`.`name` IN :scope_contact_types AND
          `access_control_list`.`object_type` = :object_type
      """),
      scope_contact_types=SCOPE_CONTACT_TYPES,
      object_type=object_type).fetchall()

  return [obj.object_id for obj in objects]


def _get_scope_contacts_by_object_id(connection, object_id,
                                     object_type, scope_contact_type):
  """Gets scope contacts by object id.

  Args:
    connection: Database connection.
    object_id: An integer value of scope object id.
    object_type: A string value of scope object type.
    scope_contact_type: A string value of scope contact.
  Returns:
    Set of emails by scope contacts.
  """
  scope_contacts = connection.execute(
      text("""
        SELECT
          `people`.`email`
        FROM `access_control_people`
        INNER JOIN `people`
          ON `access_control_people`.`person_id` = `people`.`id`
        INNER JOIN `access_control_list`
          ON `access_control_people`.`ac_list_id` = `access_control_list`.`id`
        INNER JOIN `access_control_roles`
          ON `access_control_list`.`ac_role_id` = `access_control_roles`.`id`
        WHERE
          `access_control_roles`.`name` = :scope_contact_type AND
          `access_control_list`.`object_id` = :object_id AND
          `access_control_list`.`object_type` = :object_type
      """),
      scope_contact_type=scope_contact_type,
      object_id=object_id,
      object_type=object_type).fetchall()

  return {scope_contact.email for scope_contact in scope_contacts}


def _get_people_by_emails(connection, emails):
  """Gets people ids by emails.

  Args:
    connection: Database connection.
    emails: List of emails.
  Returns:
    List of people id by emails.
  """
  contacts = connection.execute(
      text("""
        SELECT `people`.`id`
        FROM `people`
        WHERE `people`.`email` IN :emails
      """), emails=list(emails) if emails else ['']).fetchall()

  return [contact.id for contact in contacts]


def _get_compliance_role_by_type(connection, object_type):
  """Gets compliance role by object type.

  Args:
    connection: Database connection.
    object_type: A string value of scope object type.
  Returns:
    An integer value of role id.
  """
  role = connection.execute(
      text("""
        SELECT `access_control_roles`.`id`
        FROM `access_control_roles`
        WHERE
          `access_control_roles`.`name` = :compliance_contact AND
          `access_control_roles`.`object_type` = :object_type
      """),
      compliance_contact=COMPLIANCE_CONTACTS,
      object_type=object_type).fetchone()

  return role.id


def _get_access_control_list(connection, compliance_role_id,
                             object_id, object_type):
  """Gets access control list by compliance role id.

  Args:
    connection: Database connection.
    compliance_role_id: An integer value of compliance role id.
    object_id: An integer value of scope object id.
    object_type: A string value of scope object type.

  Returns:
     An integer value of access control list id.
  """
  acl = connection.execute(
      text("""
        SELECT `id`
        FROM `access_control_list`
        WHERE
          `access_control_list`.`ac_role_id` = :role_id AND
          `access_control_list`.`object_id` = :object_id AND
          `access_control_list`.`object_type` = :object_type
      """),
      role_id=compliance_role_id,
      object_id=object_id,
      object_type=object_type).fetchone()

  return acl.id


def _add_people(connection, person_id, acl_id):
  """Adds access control people record.

  Args:
    connection: Database connection.
    person_id: An integer value of people id.
    acl_id: An integer value of access control list id.
  """
  connection.execute(
      text("""
        INSERT INTO `access_control_people`
        (`person_id`, `ac_list_id`, `updated_at`,  `created_at`)
        VALUES
        (:person_id, :acl_id, NOW(), NOW())
      """),
      person_id=person_id,
      acl_id=acl_id)


def _add_compliance_contact(connection, acl_id, compliance_contacts):
  """Adds compliance contact.

  Args:
    connection: Database connection.
    acl_id: An integer value of access control list id.
    compliance_contacts: List of compliance contact emails.
  """
  person_ids = _get_people_by_emails(connection, compliance_contacts)

  for person_id in person_ids:
    _add_people(connection, person_id, acl_id)


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  connection = op.get_bind()
  object_types = get_scope_model_names()

  for object_type in object_types:
    object_ids = _get_object_ids_with_contact_types(connection, object_type)
    compliance_role_id = _get_compliance_role_by_type(connection, object_type)

    for object_id in object_ids:
      primary_contacts = _get_scope_contacts_by_object_id(
          connection,
          object_id,
          object_type,
          PRIMARY_CONTACTS
      )
      secondary_contacts = _get_scope_contacts_by_object_id(
          connection,
          object_id,
          object_type,
          SECONDARY_CONTACTS
      )
      compliance_contacts = _get_scope_contacts_by_object_id(
          connection,
          object_id,
          object_type,
          COMPLIANCE_CONTACTS
      )
      acl_id = _get_access_control_list(connection, compliance_role_id,
                                        object_id, object_type)
      compliance_contacts = primary_contacts.union(
          secondary_contacts).difference(
          compliance_contacts)

      _add_compliance_contact(connection, acl_id,
                              compliance_contacts)


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  raise NotImplementedError("Downgrade is not supported")
