# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""A facade for RestService.
Reasons for a facade:
* It is not very convenient to use
* More high level functions are often needed
"""
import re

from lib import factory, decorator, users
from lib.constants import roles, objects, element, value_aliases
from lib.entities import entities_factory
from lib.entities.entity import Representation
from lib.service import rest_service
from lib.utils import date_utils


def create_program(**attrs):
  """Create a program"""
  return rest_service.ProgramsService().create_obj(factory_params=attrs)


def create_requirement(program=None, **attrs):
  """Create a requirement."""
  return _create_obj_in_program_scope(objects.REQUIREMENTS, program, **attrs)


def create_regulation(program=None, **attrs):
  """Create a regulation."""
  return _create_obj_in_program_scope(objects.REGULATIONS, program, **attrs)


def create_objective(program=None, **attrs):
  """Create an objective (optionally map to a `program`)."""
  return _create_obj_in_program_scope("Objectives", program, **attrs)


def create_standard(program=None, **attrs):
  """Creates a standard (optionally map to a `program`)."""
  return _create_obj_in_program_scope(objects.STANDARDS, program, **attrs)


def create_control(**attrs):
  """Create an control."""
  return _create_obj_in_program_scope("Controls", None, **attrs)


def create_technology_environment(**attrs):
  """Create a technology environment."""
  return _create_obj_in_program_scope("TechnologyEnvironments", None, **attrs)


def create_product(**attrs):
  """Create a product."""
  return _create_obj_in_program_scope("Products", None, **attrs)


def create_control_mapped_to_program(program, **attrs):
  """Create a control (optionally map to a `program`)"""
  # pylint: disable=invalid-name
  control = create_control(**attrs)
  map_objs(program, control)
  return control


def create_audit(program, **attrs):
  """Create an audit within a `program`"""
  return rest_service.AuditsService().create_obj(
      program=program.__dict__,
      factory_params=attrs)


def create_asmt(audit, **attrs):
  """Create an assessment within an audit `audit`"""
  attrs["audit"] = audit.__dict__
  return rest_service.AssessmentsService().create_obj(factory_params=attrs)


def create_asmt_template(audit, all_cad_types=False, **attrs):
  """Create assessment template."""
  from lib.constants.element import AdminWidgetCustomAttributes
  obj_attrs, cad_attrs = _split_attrs(
      attrs, ["cad_type", "dropdown_types_list"])
  cads = []
  if all_cad_types:
    for cad_type in AdminWidgetCustomAttributes.ALL_CA_TYPES:
      cads.append(entities_factory.AssessmentTemplatesFactory.generate_cad(
          cad_type=cad_type))
  if "cad_type" in cad_attrs:
    cads = [entities_factory.AssessmentTemplatesFactory.generate_cad(
        **cad_attrs)]
  obj_attrs["custom_attribute_definitions"] = cads
  obj_attrs["audit"] = audit.__dict__
  return rest_service.AssessmentTemplatesService().create_obj(
      factory_params=obj_attrs)


def convert_obj_to_snapshot(audit, obj):
  """Convert object to snapshot."""
  return Representation.convert_repr_to_snapshot(
      obj=obj, parent_obj=audit)


def create_asmt_from_template(audit, asmt_template, objs_to_map):
  """Create an assessment from template."""
  return create_asmts_from_template(audit, asmt_template, objs_to_map)[0]


def create_asmts_from_template(audit, asmt_template, objs_to_map):
  """Create assessments from template."""
  snapshots = [convert_obj_to_snapshot(audit, obj_to_map) for obj_to_map
               in objs_to_map]
  return rest_service.AssessmentsFromTemplateService().create_assessments(
      audit=audit, template=asmt_template, snapshots=snapshots)


def create_gcad(**attrs):
  """Creates global CADs for all types."""
  return rest_service.CustomAttributeDefinitionsService(
      is_external=True if (objects.get_plural(attrs["definition_type"])
                           in objects.DISABLED_OBJECTS) else False).create_obj(
      factory_params=attrs)


def create_gcads_for_control():
  """Creates global CADs for all types."""
  return [create_gcad(definition_type="control",
                      attribute_type=ca_type)
          for ca_type
          in element.AdminWidgetCustomAttributes.ALL_EXTERNAL_GCA_TYPES]


def create_issue(obj=None):
  """Create a issue (optionally map to a `obj`)"""
  issue = rest_service.IssuesService().create_obj()
  if obj:
    map_objs(obj, issue)
  return issue


def create_risk(**attrs):
  """Create an risk."""
  return _create_obj_in_program_scope("Risks", None, **attrs)


def create_project(**attrs):
  """Create an project."""
  return _create_obj_in_program_scope("Projects", None, **attrs)


@decorator.check_that_obj_is_created
def create_user():
  """Create a user"""
  return rest_service.PeopleService().create_obj()


@decorator.check_that_obj_is_created
def create_user_with_role(role_name):
  """Create user a role `role_name`"""
  user = create_user()
  role = next(role for role in roles.global_roles()
              if role["name"] == role_name)
  rest_service.UserRolesService().create_obj(person=user.__dict__, role=role)
  user.system_wide_role = role["name"]
  return user


def create_access_control_role(**attrs):
  """Create a ACL role."""
  return rest_service.AccessControlRolesService().create_acl_role(**attrs)


def map_objs(src_obj, dest_obj):
  """Map two objects to each other"""

  def _is_external(src_obj, dest_obj):
    """Check if one of objects to map is external."""
    singular_title_external_objs = [
        objects.get_singular(x, title=True) for x in objects.DISABLED_OBJECTS]
    objects_list = [src_obj, ]
    dest_ojbect_list = dest_obj if isinstance(dest_obj,
                                              (tuple, list)) else [dest_obj, ]
    objects_list.extend(dest_ojbect_list)
    if [x for x in objects_list if x.type in singular_title_external_objs]:
      return True
    return False

  return rest_service.RelationshipsService().map_objs(
      src_obj=src_obj, dest_objs=dest_obj,
      is_external=_is_external(src_obj, dest_obj))


def get_obj(obj):
  """Get an object"""
  return rest_service.ObjectsInfoService().get_obj(obj)


def get_snapshot(obj, parent_obj):
  """Get (or create) a snapshot of `obj` in `parent_obj`"""
  return rest_service.ObjectsInfoService().get_snapshoted_obj(
      origin_obj=obj, paren_obj=parent_obj)


def map_to_snapshot(src_obj, obj, parent_obj):
  """Create a snapshot of `obj` in `parent_obj`.
  Then map `src_obj` to this snapshot.
  """
  snapshot = get_snapshot(obj, parent_obj)
  map_objs(src_obj, snapshot)


def _create_obj_in_program_scope(obj_name, program, **attrs):
  """Create an object with `attrs`.
  Optionally map this object to program.
  """
  factory_params, attrs_remainder = _split_attrs(attrs, ["program"])
  obj = factory.get_cls_rest_service(object_name=obj_name)().create_obj(
      factory_params=factory_params, **attrs_remainder)
  if program:
    map_objs(program, obj)
  return obj


def _split_attrs(attrs, second_part_keys=None):
  """Split `attrs` dictionary into two parts:
  * Dict with keys that are not in `second_part_keys`
  * Remainder dict with keys in `second_part_keys`
  """
  dict_1 = {k: v for k, v in attrs.iteritems() if k not in second_part_keys}
  dict_2 = {k: v for k, v in attrs.iteritems() if k in second_part_keys}
  return dict_1, dict_2


def update_object(obj, **attrs):
  """Update object attrs or update object title if no attrs passed."""
  if not attrs:
    attrs.update({"title": element.Common.TITLE_EDITED_PART + obj.title})
  return (factory.get_cls_rest_service(
      objects.get_plural(obj.type))().update_obj(
      obj=obj, **attrs))


def get_last_review_date(obj):
  """Get last review date as string in (mm/dd/yyyy hh:mm:ss AM/PM) format."""
  return date_utils.iso8601_to_ui_str_with_zone(
      get_obj_review(obj).last_reviewed_at)


def get_obj_review(obj):
  """Get obj review instance."""
  rest_obj = get_obj(obj)
  return get_obj(entities_factory.ReviewsFactory().create(**rest_obj.review))


def request_obj_review(obj, reviewer):
  """Returns obj with requested review."""
  rest_service.ReviewService().create_obj(
      {"reviewers": reviewer,
       "reviewable": obj.repr_min_dict()})
  return obj.update_attrs(
      review=entities_factory.ReviewsFactory().create(reviewers=reviewer))


def approve_obj_review(obj):
  """Returns obj with approved review."""
  rest_review = get_obj_review(obj)
  rest_service.ReviewService().update_obj(
      obj=rest_review, status=element.ReviewStates.REVIEWED)
  return obj.update_attrs(
      review=entities_factory.ReviewsFactory().create(
          status=element.ReviewStates.REVIEWED,
          reviewers=users.current_user(),
          last_reviewed_by=users.current_user().email,
          last_reviewed_at=date_utils.iso8601_to_ui_str_with_zone(
              rest_review.last_reviewed_at)))


def cas_dashboards(obj, *urls):
  """Creates 'Dashboard' CAs for obj and fill them with provided urls.
  Returns: dict with dashboard tab items names as a keys and urls as a values.
  """
  cads_rest_service = rest_service.CustomAttributeDefinitionsService()
  gca_defs = cads_rest_service.create_dashboard_gcas(obj.type, count=len(urls))
  factory.get_cls_rest_service(objects.get_plural(obj.type))().update_obj(
      obj=obj,
      custom_attributes=dict(zip([gca_def.id for gca_def in gca_defs], urls)))
  valid_dashboard_url_pattern = re.compile(r"^https?://[^\s]+$")
  valid_urls = [i for i in urls if re.match(valid_dashboard_url_pattern, i)]
  return dict(zip([gca_def.title.replace(value_aliases.DASHBOARD + "_", "")
                   for gca_def in gca_defs], valid_urls))


def update_acl(objs, people, rewrite_acl=False, **kwargs):
  """Updates or rewrites access control list of objects.

  Args:
    objs: A list of objects to update.
    people: Person or list of persons who will be assigned with role
    rewrite_acl: Boolean indicating whether the object ACL will be updated or
        rewritten.
    **kwargs:
      role_name: Name of access control role.
      role_id: Id of access control role.

  Returns: list of updated objects."""
  return [
      factory.get_cls_rest_service(objects.get_plural(obj.type))().
      update_acl(obj=obj, people=people, rewrite_acl=rewrite_acl,
                 role_name=kwargs["role_name"], role_id=kwargs["role_id"])
      for obj in objs]
