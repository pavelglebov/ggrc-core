# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Resource for handling special endpoints for people."""

import datetime
import collections
import functools

from logging import getLogger
import sqlalchemy as sa
from sqlalchemy.orm.exc import NoResultFound

from werkzeug.exceptions import Forbidden
from werkzeug.exceptions import BadRequest
from werkzeug.exceptions import MethodNotAllowed
from dateutil import parser as date_parser

from ggrc import db
from ggrc import login
from ggrc import models
from ggrc.utils import benchmark
from ggrc.utils.log_event import log_event
from ggrc.services import common
from ggrc.views import converters
from ggrc.query import my_objects
from ggrc.query import builder
from ggrc.models import all_models


# pylint: disable=invalid-name
logger = getLogger(__name__)

ALL_MODELS = {
    "Issue", "AccessGroup", "Assessment", "Audit", "Contract", "Control",
    "DataAsset", "Document", "Evidence", "Facility", "Market", "Objective",
    "OrgGroup", "Policy", "Process", "Product", "Program", "Project",
    "Regulation", "Risk", "Requirement", "Standard", "System",
    "TechnologyEnvironment", "Threat", "Vendor", "CycleTaskGroupObjectTask",
    "Workflow", "Metric", "ProductGroup", "KeyReport",
}

MY_WORK_MODELS = ALL_MODELS - {"Workflow"}


class PersonResource(common.ExtendedResource):
  """Resource handler for people."""

  # method post is abstract and not used.
  # pylint: disable=abstract-method

  MY_WORK_OBJECTS = {item: 0 for item in MY_WORK_MODELS}

  ALL_OBJECTS = {item: 0 for item in ALL_MODELS}

  @classmethod
  def add_to(cls, app, url, model_class=None, decorators=()):
    """Register view methods."""
    super(PersonResource, cls).add_to(app, url, model_class, decorators)
    view_func = cls.as_view(cls.endpoint_name())
    app.add_url_rule(
        '{url}/<{type}:{pk}>/<command>'.format(
            url=url, type=cls.pk_type, pk=cls.pk
        ),
        view_func=view_func,
        methods=['GET', 'PUT', 'POST', 'DELETE'])
    app.add_url_rule(
        '{url}/<{type}:{pk}>/<command>/<{type}:{pk2}>'.format(
            url=url,
            type=cls.pk_type,
            pk=cls.pk,
            pk2='id2'
        ),
        view_func=view_func,
        methods=['GET', 'DELETE'])
    app.add_url_rule(
        '{url}/<{type}:{pk}>/<command>/<{type}:{pk2}>/<command2>'.format(
            url=url,
            type=cls.pk_type,
            pk=cls.pk,
            pk2='id2'
        ),
        view_func=view_func,
        methods=['PUT', 'GET'])

  @staticmethod
  def verify_is_current(procedure):
    """Check that the process user is the same as current user.

    This function ensures that the user specified in the API call
    is the same as the current user.
    The wrapper should be used on API functions that are user specific such as
    task_counts.

    Raises Forbidden() when accessed user is not the same as current user.
    """
    @functools.wraps(procedure)
    def wrapper(*args, **kwargs):
      """Wrapper procedure."""
      process_user_id = kwargs.get("id")
      curent_user_id = login.get_current_user_id()
      if curent_user_id != process_user_id:
        raise Forbidden()
      return procedure(*args, **kwargs)

    return wrapper

  @staticmethod
  def raise_not_allowed_exception(*args, **kwargs):
    """Raise not allowed exception for person resource."""
    del args
    del kwargs
    raise MethodNotAllowed(description="Creation of new profile for person "
                                       "by POST request is not allowed")

  def get(self, *args, **kwargs):  # pylint: disable=arguments-differ
    # This is to extend the get request for additional data.
    command_map = {
        None: super(PersonResource, self).get,
        "task_count": self.verify_is_current(self._task_count),
        "my_work_count": self.verify_is_current(self._my_work_count),
        "my_workflows": self.verify_is_current(self._my_workflows),
        "all_objects_count": self.verify_is_current(self._all_objects_count),
        "imports": self.verify_is_current(converters.handle_import_get),
        "exports": self.verify_is_current(converters.handle_export_get),
        "profile": self.verify_is_current(self._get_profile),
    }
    return self._process_request(command_map, *args, **kwargs)

  def post(self, *args, **kwargs):
    """This is to extend the post request for additional data."""
    command_map = {
        None: super(PersonResource, self).post,
        # create import entry
        "imports": self.verify_is_current(converters.handle_import_post),
        # create export entry and start export background task
        "exports": self.verify_is_current(converters.handle_export_post),
        "profile": self.raise_not_allowed_exception,
    }
    return self._process_request(command_map, *args, **kwargs)

  def put(self, *args, **kwargs):  # pylint: disable=arguments-differ
    """This is to extend the put request for additional data."""
    command_map = {
        None: super(PersonResource, self).put,
        "imports": self.verify_is_current(converters.handle_import_put),
        "exports": self.verify_is_current(converters.handle_export_put),
        "profile": self.verify_is_current(self._set_profile),
    }
    return self._process_request(command_map, *args, **kwargs)

  def delete(self, *args, **kwargs):  # pylint: disable=arguments-differ
    """This is to extend the delete request for additional data."""
    command_map = {
        None: super(PersonResource, self).delete,
        "imports": self.verify_is_current(converters.handle_delete),
        "exports": self.verify_is_current(converters.handle_delete),
    }
    return self._process_request(command_map, *args, **kwargs)

  def _task_count(self, id):
    """Return open task count and overdue flag for a given user."""
    # id name is used as a kw argument and can't be changed here
    # pylint: disable=invalid-name,redefined-builtin
    with benchmark("Make response"):
      # query below ignores acr.read flag because this is done on a
      # non_editable role that has read rights:
      counts_query = db.session.execute(
          """
          SELECT
              overdue,
              sum(task_count)
          FROM (
              SELECT
                  ct.end_date < :today AS overdue,
                  count(DISTINCT ct.id) AS task_count
              FROM cycle_task_group_object_tasks AS ct
              JOIN cycles AS c ON
                  c.id = ct.cycle_id
              JOIN access_control_list AS acl
                  ON acl.object_id = ct.id
                  AND acl.object_type = "CycleTaskGroupObjectTask"
              JOIN access_control_people AS acp
                  ON acp.ac_list_id = acl.id
              JOIN access_control_roles as acr
                  ON acl.ac_role_id = acr.id
              WHERE
                  ct.status != "Verified" AND
                  c.is_verification_needed = 1 AND
                  c.is_current = 1 AND
                  acp.person_id = :person_id AND
                  acr.name IN ("Task Assignees", "Task Secondary Assignees")
              GROUP BY overdue

              UNION ALL

              SELECT
                  ct.end_date < :today AS overdue,
                  count(DISTINCT ct.id) AS task_count
              FROM cycle_task_group_object_tasks AS ct
              JOIN cycles AS c ON
                  c.id = ct.cycle_id
              JOIN access_control_list AS acl
                  ON acl.object_id = ct.id
                  AND acl.object_type = "CycleTaskGroupObjectTask"
              JOIN access_control_people AS acp
                  ON acp.ac_list_id = acl.id
              JOIN access_control_roles as acr
                  ON acl.ac_role_id = acr.id
              WHERE
                  ct.status != "Finished" AND
                  c.is_verification_needed = 0 AND
                  c.is_current = 1 AND
                  acp.person_id = :person_id AND
                  acr.name IN ("Task Assignees", "Task Secondary Assignees")
              GROUP BY overdue
          ) as temp
          GROUP BY overdue
          """,
          {
              # Using today instead of DATE(NOW()) for easier testing with
              # freeze gun.
              "today": datetime.date.today(),
              "person_id": id,
          }
      )
      counts = dict(counts_query.fetchall())
      response_object = {
          "open_task_count": int(sum(counts.values())),
          "has_overdue": bool(counts.get(1, 0)),
      }
      return self.json_success_response(response_object, )

  def _my_work_count(self, **kwargs):  # pylint: disable=unused-argument
    """Get object counts for my work page."""
    with benchmark("Make response"):
      aliased = my_objects.get_myobjects_query(
          types=self.MY_WORK_OBJECTS.keys(),
          contact_id=login.get_current_user_id()
      )
      all_ = db.session.query(
          aliased.c.type,
          aliased.c.id,
      )

      all_ids = collections.defaultdict(set)
      for type_, id_ in all_:
        all_ids[type_].add(id_)

      response_object = self.MY_WORK_OBJECTS.copy()
      for type_, ids in all_ids.items():
        model = models.get_model(type_)
        # pylint: disable=protected-access
        # We must move the type permissions query to a proper utility function
        # but we will not do that for a patch release
        permission_filter = builder.QueryHelper._get_type_query(model, "read")
        if permission_filter is not None:
          count = model.query.filter(
              model.id.in_(ids),
              permission_filter,
          ).count()
        else:
          count = model.query.filter(model.id.in_(ids)).count()
        response_object[type_] = count

      return self.json_success_response(response_object, )

  def _my_workflows(self, id):
    """Returns workflow statistic for authorized user."""
    # pylint: disable=invalid-name,redefined-builtin
    base_query = db.session.query(
        all_models.Workflow,
    ).join(
        all_models.AccessControlList,
        all_models.AccessControlList.object_id ==
        all_models.Workflow.id,
    ).join(
        all_models.AccessControlPerson,
        all_models.AccessControlPerson.ac_list_id ==
        all_models.AccessControlList.id,
    ).join(
        all_models.AccessControlRole,
        all_models.AccessControlList.ac_role_id ==
        all_models.AccessControlRole.id,
    ).join(
        all_models.Person,
        all_models.AccessControlPerson.person_id ==
        all_models.Person.id,
    )

    finish_condition = sa.or_(
        sa.and_(
            all_models.Workflow.is_verification_needed ==
            sa.true(),
            all_models.CycleTaskGroupObjectTask.status ==
            'Verified',
        ),
        sa.and_(
            all_models.Workflow.is_verification_needed ==
            sa.false(),
            all_models.CycleTaskGroupObjectTask.status ==
            'Finished',
        )
    )

    tasks_query = base_query.join(
        all_models.Cycle,
        all_models.Workflow.id == all_models.Cycle.workflow_id,
    ).join(
        all_models.CycleTaskGroupObjectTask,
        all_models.CycleTaskGroupObjectTask.cycle_id == all_models.Cycle.id,
    ).filter(
        sa.and_(
            all_models.AccessControlPerson.person_id == id,
            all_models.Workflow.status == 'Active',
            all_models.AccessControlList.object_type == 'Workflow',
            all_models.AccessControlRole.name == 'Admin',
        )
    ).group_by(
        all_models.Workflow.id,
    ).order_by(
        "due_date"
    ).with_entities(
        all_models.Workflow.id.label("workflow_id"),
        all_models.Workflow.title.label("workflow_title"),
        sa.func.min(
            all_models.CycleTaskGroupObjectTask.end_date).label("due_date"),
        sa.func.sum(
            sa.func.IF(finish_condition, 1, 0)
        ).label("completed"),
        sa.func.count(all_models.Workflow.id).label("total"),
        sa.func.sum(
            sa.func.IF(sa.and_(sa.not_(finish_condition),
                               all_models.CycleTaskGroupObjectTask.end_date <
                               datetime.date.today()), 1, 0)
        ).label("overdue")
    )
    wf_tasks_result = tasks_query.all()
    workflow_ids = [res.workflow_id for res in wf_tasks_result]

    owners_query = base_query.filter(
        sa.and_(
            all_models.Workflow.id.in_(workflow_ids),
            all_models.Workflow.status == 'Active',
            all_models.AccessControlList.object_type == 'Workflow',
            all_models.AccessControlRole.name == 'Admin',
        )
    ).group_by(
        all_models.Workflow.id,
    ).with_entities(
        all_models.Workflow.id.label("workflow_id"),
        sa.func.group_concat(all_models.Person.email).label("owners"),
    )
    owners_result = dict(owners_query.all())

    response_object = {
        "workflows": []
    }
    for row in wf_tasks_result:
      response_object["workflows"].append({
          "workflow": {
              "id": row.workflow_id,
              "title": row.workflow_title,
          },
          "owners": sorted(owners_result[row.workflow_id].split(",")),
          "task_stat": {
              "counts": {
                  "total": int(row.total),
                  "overdue": int(row.overdue),
                  "completed": int(row.completed),
              },
              "due_in_date": row.due_date
          }
      })
    return self.json_success_response(response_object, )

  def _all_objects_count(self, **kwargs):  # pylint: disable=unused-argument
    """Get object counts for all objects page."""
    with benchmark("Make response"):

      response_object = self.ALL_OBJECTS.copy()
      for model_type in response_object:
        model = models.get_model(model_type)
        # pylint: disable=protected-access
        # We must move the type permissions query to a proper utility function
        # but we will not do that for a patch release
        permission_filter = builder.QueryHelper._get_type_query(model, "read")
        if permission_filter is not None:
          count = model.query.filter(permission_filter).count()
        else:
          count = model.query.count()
        response_object[model_type] = count

      return self.json_success_response(response_object, )

  @staticmethod
  def _get_or_create_profile(person_id):
    """Returns profile if it exists, otherwise returns created one

    Returns:
        A tuple (created, profile). Created is set True for created profile,
        False otherwise. Profile is profile for Person with id=person_id.
      """
    try:
      profile = all_models.PersonProfile.query.filter_by(
          person_id=person_id
      ).one()
    except NoResultFound:
      person = all_models.Person.query.filter_by(id=person_id).one()
      person.profile = all_models.PersonProfile()
      return (True, person.profile)
    return (False, profile)

  def _get_profile(self, **kwargs):
    """Get person profile"""
    get_profile = self._get_or_create_profile(kwargs["id"])
    if get_profile[0]:
      log_event(db.session, get_profile[1])
      db.session.commit()

    response_json = {
        "last_seen_whats_new": get_profile[1].last_seen_whats_new
    }
    return self.json_success_response(response_json, )

  def _set_profile(self, **kwargs):
    """Update person profile"""
    json = self.request.json

    get_profile = self._get_or_create_profile(kwargs["id"])

    try:
      requested_date_time = date_parser.parse(json["last_seen_whats_new"])
      offset_naive = requested_date_time.replace(tzinfo=None)
      get_profile[1].last_seen_whats_new = offset_naive
    except Exception as err:
      logger.exception(err)
      raise BadRequest()

    log_event(db.session, get_profile[1])

    db.session.commit()
    response_json = {
        "Person": {"id": kwargs["id"], "profile": json}
    }
    return self.json_success_response(response_json, )
