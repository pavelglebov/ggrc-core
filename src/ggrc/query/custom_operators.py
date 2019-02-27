# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""This module contains custom operators for query helper"""

# pylint: disable=unused-argument
import operator
import functools

import sqlalchemy
from sqlalchemy.orm import aliased
from sqlalchemy.orm import load_only

from ggrc import db
from ggrc.models import all_models
from ggrc.fulltext.mysql import MysqlRecordProperty as Record
from ggrc.models import inflector
from ggrc.models import relationship_helper
from ggrc.models.mixins.filterable import Filterable
from ggrc.query import autocast
from ggrc.query import my_objects
from ggrc.query.exceptions import BadQueryException
from ggrc.snapshotter import rules
from ggrc.utils import revisions_diff


GETATTR_WHITELIST = {
    "child_type",
    "id",
    "is_current",
    "program",
    "created_at",
    "updated_at",
}


def validate(*required_fields):
  """Validate decorator.

  Checks if all of required fields are in exp dict.
  If there are some of required fields are not found then raise the
  BadQueryException.
  """
  required_fields_set = set(required_fields)
  required_tmpl = "`{field}` required for operation `{operation}`"

  def decorator(operation):
    """Decorator for operator."""
    @functools.wraps(operation)
    def decorated_operator(exp, *args, **kwargs):
      """Decorated operator """
      operation_name = exp["op"]["name"]
      error_fields = required_fields_set - set(exp.keys())
      if error_fields:
        raise BadQueryException("\n".join([
            required_tmpl.format(field=field, operation=operation_name)
            for field in error_fields]))
      return operation(exp, *args, **kwargs)
    return decorated_operator
  return decorator


def build_op_shortcut(predicate):
  """A shortcut to call build_op with default lhs and rhs."""
  def decorated(exp, object_class, target_class, query):
    """decorator for sended predicate"""
    key = exp['left'].lower()

    key, filter_by = target_class.attributes_map().get(key, (key, None))
    if callable(filter_by):
      return filter_by(lambda x: predicate(x, exp['right']))

    if key in GETATTR_WHITELIST:
      return predicate(getattr(object_class, key, None), exp['right'])

    if issubclass(target_class, Filterable) and \
       target_class.has_filterable_attribute(key):
      attr = target_class.get_filterable_attribute(key)
      return predicate(attr, exp['right'])

    return object_class.id.in_(
        db.session.query(Record.key).filter(
            Record.type == object_class.__name__,
            Record.property == key,
            Record.subproperty != '__sort__',
            predicate(Record.content, exp['right'])
        )
    )
  return decorated


@validate("left", "right")
@build_op_shortcut
def like(left, right):
  """Handle ~ operator with SQL LIKE."""
  return left.ilike(u"%{}%".format(right))


def reverse(operation):
  """ decorator that returns sa.not_ for sending operation"""
  def decorated(*args, **kwargs):
    return sqlalchemy.not_(operation(*args, **kwargs))
  return decorated


@validate("left", "right")
def is_filter(exp, object_class, target_class, query):
  """Handle 'is' operator.

  As in 'CA is empty' expression
  """
  if exp['right'] != u"empty":
    raise BadQueryException(
        u"Invalid operator near 'is': {}".format(exp['right']))
  left = exp['left'].lower()
  left, _ = target_class.attributes_map().get(left, (left, None))
  subquery = db.session.query(Record.key).filter(
      Record.type == object_class.__name__,
      Record.property == left,
      Record.subproperty != '__sort__',
      sqlalchemy.not_(
          sqlalchemy.or_(Record.content == u"", Record.content.is_(None))
      ),
  )
  return object_class.id.notin_(subquery)


def unknown(exp, object_class, target_class, query):
  """A fake operator for invalid operator names."""
  name = exp.get("op", {}).get("name")
  if name is None:
    msg = u"No operator name sent"
  else:
    msg = u"Unknown operator \"{}\"".format(name)
  raise BadQueryException(msg)


@validate("object_name", "ids")
def related_people(exp, object_class, target_class, query):
  """Get people related to the specified object.

  Returns the following people:
    for Program: the users that have a Program-wide role,
    for Audit: the users that have a Program-wide or Audit-wide role,
    for Workflow: the users mapped via WorkflowPeople and
                  the users that have a Workflow-wide role.

  Args:
    related_type: the name of the class of the related objects.
    related_ids: the ids of related objects.

  Returns:
    sqlalchemy.sql.elements.BinaryExpression if an object of `object_class`
    is related to the given users.
  """
  if "Person" not in [object_class.__name__, exp['object_name']]:
    return sqlalchemy.sql.false()

  res = []

  acl = all_models.AccessControlList
  acp = all_models.AccessControlPerson

  # Note using we are using base_id in the join statement because this filter
  # should include propagated roles as well.
  res.extend(db.session.query(acp.person_id).filter(
      sqlalchemy.and_(
          acl.object_id.in_(exp['ids']),
          acl.object_type == exp['object_name'],
          acp.ac_list_id == acl.base_id,
      )
  ))
  if res:
    return object_class.id.in_([obj[0] for obj in res])
  return sqlalchemy.sql.false()


@validate("ids")
def owned(exp, object_class, target_class, query):
  """Get objects for which the user is owner.

  Note: only the first id from the list of ids is used.

  Args:
    ids: the ids of owners.

  Returns:
    sqlalchemy.sql.elements.BinaryExpression if an object of `object_class`
    is owned by one of the given users.
  """
  res = db.session.query(
      my_objects.get_myobjects_query(
          types=[object_class.__name__],
          contact_id=exp['ids'][0]
      ).alias().c.id
  )
  res = res.all()
  if res:
    return object_class.id.in_([obj.id for obj in res])
  return sqlalchemy.sql.false()


@validate("text")
def text_search(exp, object_class, target_class, query):
  """Filter by fulltext search.

  The search is done only in fields indexed for fulltext search.

  Args:
    text: the text we are searching for.

  Returns:
    sqlalchemy.sql.elements.BinaryExpression if an object of `object_class`
    has an indexed property that contains `text`.
  """
  return object_class.id.in_(
      db.session.query(Record.key).filter(
          Record.type == object_class.__name__,
          Record.subproperty != '__sort__',
          Record.content.ilike(u"%{}%".format(exp['text'])),
      ),
  )


@validate("object_name", "ids")
def similar(exp, object_class, target_class, query):
  """Filter by relationships similarity.

  Note: only the first id from the list of ids is used.

  Args:
    object_name: the name of the class of the objects to which similarity
                 will be computed.
    ids: the ids of similar objects of type `object_name`.

  Returns:
    sqlalchemy.sql.elements.BinaryExpression if an object of `object_class`
    is similar to one the given objects.
  """
  similar_class = inflector.get_model(exp['object_name'])
  if not hasattr(similar_class, "get_similar_objects_query"):
    raise BadQueryException(u"{} does not define weights to count "
                            u"relationships similarity"
                            .format(similar_class.__name__))
  similar_objects_query = similar_class.get_similar_objects_query(
      id_=exp['ids'][0],
      type_=object_class.__name__,
  )
  similar_objects_ids = {obj[0] for obj in similar_objects_query}
  if similar_objects_ids:
    return object_class.id.in_(similar_objects_ids)
  return sqlalchemy.sql.false()


@validate("object_name", "ids")
def relevant(exp, object_class, target_class, query):
  "Filter by relevant object"
  if exp['object_name'] == "__previous__":
    exp = query[exp['ids'][0]]
  object_name = exp['object_name']
  ids = exp['ids']
  check_snapshots = (
      object_class.__name__ in rules.Types.scoped | rules.Types.trans_scope and
      object_name in rules.Types.all
  )
  check_direct = (not check_snapshots or
                  object_class.__name__ in rules.Types.trans_scope)

  result = set()

  if check_direct:
    result.update(*relationship_helper.get_ids_related_to(
        object_class.__name__,
        object_name,
        ids,
    ))

  if check_snapshots:
    snapshot_qs = all_models.Snapshot.query.filter(
        all_models.Snapshot.parent_type == all_models.Audit.__name__,
        all_models.Snapshot.child_type == object_name,
        all_models.Snapshot.child_id.in_(ids),
    ).options(
        load_only(all_models.Snapshot.id),
    ).distinct(
    ).subquery(
        "snapshot"
    )
    dest_qs = db.session.query(all_models.Relationship.source_id).filter(
        all_models.Relationship.destination_id == snapshot_qs.c.id,
        all_models.Relationship.destination_type ==
        all_models.Snapshot.__name__,
        all_models.Relationship.source_type == object_class.__name__,
    )
    source_qs = db.session.query(
        all_models.Relationship.destination_id
    ).filter(
        all_models.Relationship.source_id == snapshot_qs.c.id,
        all_models.Relationship.source_type == all_models.Snapshot.__name__,
        all_models.Relationship.destination_type == object_class.__name__,
    )
    ids_qs = dest_qs.union(source_qs)
    result.update(*ids_qs.all())

  if not result:
    return sqlalchemy.sql.false()

  return object_class.id.in_(result)


@validate("object_name", "ids")
def related_evidence(exp, object_class, target_class, query):
  """Special Filter by relevant object used to display audit scope evidence

  returns list of evidence ids mapped to assessments for given audit.
  Evidence mapped to audit itself are ignored.
  """
  if not exp["object_name"] == "Audit":
    raise BadQueryException("relevant_evidence operation "
                            "works with object Audit only")
  ids = exp["ids"]
  evid_dest = db.session.query(
      all_models.Relationship.destination_id.label("id")
  ).join(
      all_models.Assessment,
      all_models.Assessment.id == all_models.Relationship.source_id
  ).filter(
      all_models.Relationship.destination_type == target_class.__name__,
      all_models.Relationship.source_type == all_models.Assessment.__name__,
      all_models.Assessment.audit_id.in_(ids)
  )

  evid_source = db.session.query(
      all_models.Relationship.source_id.label("id")
  ).join(
      all_models.Assessment,
      all_models.Assessment.id == all_models.Relationship.destination_id
  ).filter(
      all_models.Relationship.source_type == target_class.__name__,
      all_models.Relationship.destination_type ==
      all_models.Assessment.__name__,
      all_models.Assessment.audit_id.in_(ids)
  )

  result = evid_dest.union(evid_source)
  return object_class.id.in_(result)


def build_expression(exp, object_class, target_class, query):
  """Make an SQLAlchemy filtering expression from exp expression tree."""
  if not exp:
    # empty expression doesn't required filter
    return None
  if autocast.is_autocast_required_for(exp):
    exp = validate("left", "right")(autocast.autocast)(exp, target_class)
  if not exp:
    # empty expression after autocast is invalid and should raise an exception
    raise BadQueryException("Invalid filter data")
  operation = OPS.get(exp.get("op", {}).get("name")) or unknown
  return operation(exp, object_class, target_class, query)


@validate("left", "right")
def and_operation(exp, object_class, target_class, query):
  """Operator generate sqlalchemy for and operation"""
  return sqlalchemy.and_(
      build_expression(exp["left"], object_class, target_class, query),
      build_expression(exp["right"], object_class, target_class, query))


@validate("left", "right")
def or_operation(exp, object_class, target_class, query):
  """Operator generate sqlalchemy for or operation"""
  return sqlalchemy.or_(
      build_expression(exp["left"], object_class, target_class, query),
      build_expression(exp["right"], object_class, target_class, query))


@validate("left", "right")
@build_op_shortcut
def in_operation(left, right):
  """IN operator."""
  if not right:
    return sqlalchemy.sql.false()
  return left.in_(right)


@validate("issue", "assessment")
def cascade_unmappable(exp, object_class, target_class, query):
  """Special operator to get the effect of cascade unmap of Issue from Asmt."""
  issue_id = exp["issue"].get("id")
  assessment_id = exp["assessment"].get("id")

  if not issue_id:
    raise BadQueryException("Missing 'id' key in 'issue': {}"
                            .format(exp["issue"]))
  if not assessment_id:
    raise BadQueryException("Missing 'id' key in 'assessment': {}"
                            .format(exp["assessment"]))

  if object_class.__name__ not in {"Audit", "Snapshot"}:
    raise BadQueryException("'cascade_unmapping' can't be applied to {}"
                            .format(object_class.__name__))

  mapped_to_issue = aliased(sqlalchemy.union_all(
      db.session.query(
          all_models.Relationship.destination_id.label("target_id"),
      ).filter(
          all_models.Relationship.source_id == issue_id,
          all_models.Relationship.source_type == "Issue",
          all_models.Relationship.destination_type == object_class.__name__,
          ~all_models.Relationship.automapping_id.is_(None),
      ),
      db.session.query(
          all_models.Relationship.source_id.label("target_id"),
      ).filter(
          all_models.Relationship.destination_id == issue_id,
          all_models.Relationship.destination_type == "Issue",
          all_models.Relationship.source_type == object_class.__name__,
      ),
  ), name="mapped_to_issue")

  mapped_to_assessment = aliased(sqlalchemy.union_all(
      db.session.query(
          all_models.Relationship.destination_id.label("target_id"),
      ).filter(
          all_models.Relationship.source_id == assessment_id,
          all_models.Relationship.source_type == "Assessment",
          all_models.Relationship.destination_type == object_class.__name__,
      ),
      db.session.query(
          all_models.Relationship.source_id.label("target_id"),
      ).filter(
          all_models.Relationship.destination_id == assessment_id,
          all_models.Relationship.destination_type == "Assessment",
          all_models.Relationship.source_type == object_class.__name__,
      ),
  ), "mapped_to_assessment")

  other_assessments = aliased(sqlalchemy.union_all(
      db.session.query(
          all_models.Relationship.destination_id.label("assessment_id"),
      ).filter(
          all_models.Relationship.source_id == issue_id,
          all_models.Relationship.source_type == "Issue",
          all_models.Relationship.destination_id != assessment_id,
          all_models.Relationship.destination_type == "Assessment",
      ),
      db.session.query(
          all_models.Relationship.source_id.label("assessment_id"),
      ).filter(
          all_models.Relationship.destination_id == issue_id,
          all_models.Relationship.destination_type == "Issue",
          all_models.Relationship.source_id != assessment_id,
          all_models.Relationship.source_type == "Assessment",
      ),
  ), "other_assessments")

  mapped_to_other_assessments = aliased(sqlalchemy.union_all(
      db.session.query(
          all_models.Relationship.destination_id.label("target_id"),
      ).filter(
          all_models.Relationship.source_id.in_(other_assessments),
          all_models.Relationship.source_type == "Assessment",
          all_models.Relationship.destination_type == object_class.__name__,
      ),
      db.session.query(
          all_models.Relationship.source_id.label("target_id"),
      ).filter(
          all_models.Relationship.destination_id != assessment_id,
          all_models.Relationship.destination_type == "Assessment",
          all_models.Relationship.source_type == object_class.__name__,
      ),
  ), "mapped_to_other_assessments")

  result = set(db.session.query(mapped_to_issue))
  result &= set(db.session.query(mapped_to_assessment))
  result -= set(db.session.query(mapped_to_other_assessments))

  if not result:
    return sqlalchemy.sql.false()

  return object_class.id.in_([row[0] for row in result])


@validate("resource_type", "resource_id")
def not_empty_revisions(exp, object_class, target_class, query):
  """Filter revisions containing object state changes.

  This operator is useful if revisions with object state changes are needed.
  Revisions without object state changes are created when object editing
  without any actual changes is performed.
  """
  if object_class is not all_models.Revision:
    raise BadQueryException("'not_empty_revisions' operator works with "
                            "Revision only")

  resource_type = exp["resource_type"]
  resource_id = exp["resource_id"]

  resource_cls = getattr(all_models, resource_type, None)
  if resource_cls is None:
    raise BadQueryException("'{}' resource type does not exist"
                            .format(resource_type))

  query = all_models.Revision.query.filter(
      all_models.Revision.resource_type == resource_type,
      all_models.Revision.resource_id == resource_id,
  ).order_by(
      all_models.Revision.created_at,
  )

  current_instance = resource_cls.query.get(resource_id)
  current_instance_meta = revisions_diff.meta_info.MetaInfo(current_instance)
  latest_rev_content = revisions_diff.builder.get_latest_revision_content(
      current_instance,
  )
  prev_diff = None
  revision_with_changes = []
  for revision in query:
    diff = revisions_diff.builder.prepare_content_diff(
        instance_meta_info=current_instance_meta,
        l_content=latest_rev_content,
        r_content=revision.content,
    )
    if diff != prev_diff:
      revision_with_changes.append(revision.id)
      prev_diff = diff

  if not revision_with_changes:
    return sqlalchemy.sql.false()

  return all_models.Revision.id.in_(revision_with_changes)


@validate("object_name", "ids")
def child_op(exp, object_class, *_):
  """Filter by children objects"""
  if not(exp["object_name"] == "Program" and
         object_class is all_models.Program):
    raise BadQueryException("child operation "
                            "works with object Program only")
  ids = exp["ids"]
  _children_ids = set()
  for _id in ids:
    _children_ids.update(
        all_models.Program.query.get(_id).relatives_ids("children")
    )
  return object_class.id.in_(_children_ids)


@validate("object_name", "ids")
def parent_op(exp, object_class, target_class, query):
  """Filter by parents objects"""
  if not(exp["object_name"] == "Program" and
         object_class is all_models.Program):
    raise BadQueryException("parent operation "
                            "works with object Program only")
  ids = exp["ids"]
  _parents_ids = set()
  for _id in ids:
    _parents_ids.update(
        all_models.Program.query.get(_id).relatives_ids("parents")
    )
  return object_class.id.in_(_parents_ids)


EQ_OPERATOR = validate("left", "right")(build_op_shortcut(operator.eq))
LT_OPERATOR = validate("left", "right")(build_op_shortcut(operator.lt))
GT_OPERATOR = validate("left", "right")(build_op_shortcut(operator.gt))
LE_OPERATOR = validate("left", "right")(build_op_shortcut(operator.le))
GE_OPERATOR = validate("left", "right")(build_op_shortcut(operator.ge))


OPS = {
    "AND": and_operation,
    "OR": or_operation,
    "IN": in_operation,
    "=": EQ_OPERATOR,
    "!=": reverse(EQ_OPERATOR),
    "~": like,
    "!~": reverse(like),
    "<": LT_OPERATOR,
    ">": GT_OPERATOR,
    "<=": LE_OPERATOR,
    ">=": GE_OPERATOR,
    "relevant": relevant,
    "related_evidence": related_evidence,
    "similar": similar,
    "owned": owned,
    "related_people": related_people,
    "text_search": text_search,
    "is": is_filter,
    "cascade_unmappable": cascade_unmappable,
    "not_empty_revisions": not_empty_revisions,
    "child": child_op,
    "parent": parent_op,
}
