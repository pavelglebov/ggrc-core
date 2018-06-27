# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Resource for handling special endpoints for people."""

import datetime
import collections
import functools

from logging import getLogger
from werkzeug.exceptions import Forbidden, BadRequest
from sqlalchemy.orm.exc import NoResultFound
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
from ggrc.models.person_profile import PersonProfile
from ggrc.models.person import Person


# pylint: disable=invalid-name
logger = getLogger(__name__)


class PersonResource(common.ExtendedResource):
  """Resource handler for people."""

  # method post is abstract and not used.
  # pylint: disable=abstract-method

  MY_WORK_OBJECTS = {
      "Issue": 0,
      "AccessGroup": 0,
      "Assessment": 0,
      "Audit": 0,
      "Clause": 0,
      "Contract": 0,
      "Control": 0,
      "DataAsset": 0,
      "Document": 0,
      "Evidence": 0,
      "Facility": 0,
      "Market": 0,
      "Objective": 0,
      "OrgGroup": 0,
      "Policy": 0,
      "Process": 0,
      "Product": 0,
      "Program": 0,
      "Project": 0,
      "Regulation": 0,
      "Risk": 0,
      "Requirement": 0,
      "Standard": 0,
      "System": 0,
      "TechnologyEnvironment": 0,
      "Threat": 0,
      "Vendor": 0,
      "CycleTaskGroupObjectTask": 0,
      "Metric": 0,
      "ProductGroup": 0,
  }

  ALL_OBJECTS = {
      "Issue": 0,
      "AccessGroup": 0,
      "Assessment": 0,
      "Audit": 0,
      "Clause": 0,
      "Contract": 0,
      "Control": 0,
      "DataAsset": 0,
      "Document": 0,
      "Evidence": 0,
      "Facility": 0,
      "Market": 0,
      "Objective": 0,
      "OrgGroup": 0,
      "Policy": 0,
      "Process": 0,
      "Product": 0,
      "Program": 0,
      "Project": 0,
      "Regulation": 0,
      "Risk": 0,
      "Requirement": 0,
      "Standard": 0,
      "System": 0,
      "TechnologyEnvironment": 0,
      "Threat": 0,
      "Vendor": 0,
      "CycleTaskGroupObjectTask": 0,
      "Workflow": 0,
      "Metric": 0,
      "ProductGroup": 0,
  }

  @classmethod
  def add_to(cls, app, url, model_class=None, decorators=()):
    """Register view methods."""
    super(PersonResource, cls).add_to(app, url, model_class, decorators)
    view_func = cls.as_view(cls.endpoint_name())
    app.add_url_rule(
        '{url}/<{type}:{pk}>/<command>'.format(url=url,
                                               type=cls.pk_type,
                                               pk=cls.pk),
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

  def get(self, *args, **kwargs):  # pylint: disable=arguments-differ
    # This is to extend the get request for additional data.
    command_map = {
        None: super(PersonResource, self).get,
        "task_count": self.verify_is_current(self._task_count),
        "my_work_count": self.verify_is_current(self._my_work_count),
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

  def _process_request(self, command_map, *args, **kwargs):
    """Process request"""
    command = kwargs.pop("command", None)
    if command not in command_map:
      self.not_found_response()
    return command_map[command](*args, **kwargs)

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
              JOIN access_control_roles as acr
                  ON acl.ac_role_id = acr.id
              WHERE
                  ct.status != "Verified" AND
                  c.is_verification_needed = 1 AND
                  c.is_current = 1 AND
                  acl.person_id = :person_id AND
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
              JOIN access_control_roles as acr
                  ON acl.ac_role_id = acr.id
              WHERE
                  ct.status != "Finished" AND
                  c.is_verification_needed = 0 AND
                  c.is_current = 1 AND
                  acl.person_id = :person_id AND
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
      profile = PersonProfile.query.filter_by(person_id=person_id).one()
    except NoResultFound:
      person = Person.query.filter_by(id=person_id).one()
      person.profile = PersonProfile()
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
      get_profile[1].last_seen_whats_new = requested_date_time
    except Exception as err:
      logger.exception(err)
      raise BadRequest()

    log_event(db.session, get_profile[1])

    db.session.commit()
    response_json = {
        "Person": {"id": kwargs["id"], "profile": json}
    }
    return self.json_success_response(response_json, )
