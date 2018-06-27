# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""ggrc.views
Handle non-RESTful views, e.g. routes which return HTML rather than JSON
"""

import collections
import json
import logging

import sqlalchemy
from sqlalchemy import true
from flask import flash
from flask import Response
from flask import g
from flask import render_template
from flask import url_for
from flask import request
from werkzeug import exceptions

from ggrc import models
from ggrc import settings
from ggrc.app import app
from ggrc.app import db
from ggrc.builder.json import publish
from ggrc.builder.json import publish_representation
from ggrc.converters import get_importables, get_exportables
from ggrc.extensions import get_extension_modules
from ggrc.fulltext import get_indexer, mixin
from ggrc.integrations import issues
from ggrc.integrations import integrations_errors
from ggrc.login import get_current_user
from ggrc.login import login_required
from ggrc.login import admin_required
from ggrc.models import all_models
from ggrc.models.background_task import create_task
from ggrc.models.background_task import make_task_response
from ggrc.models.background_task import queued_task
from ggrc.models.reflection import AttributeInfo
from ggrc.models.revision import Revision
from ggrc.rbac import permissions
from ggrc.services.common import as_json
from ggrc.services.common import inclusion_filter
from ggrc.query import views as query_views
from ggrc.snapshotter import rules
from ggrc.snapshotter import indexer as snapshot_indexer
from ggrc.views import converters
from ggrc.views import cron
from ggrc.views import filters
from ggrc.views import notifications
from ggrc.views.utils import DocumentEndpoint
from ggrc.views.registry import object_view
from ggrc import utils
from ggrc.utils import benchmark, helpers
from ggrc.utils import revisions

logger = logging.getLogger(__name__)
REINDEX_CHUNK_SIZE = 100


# Needs to be secured as we are removing @login_required
@app.route("/_background_tasks/propagate_acl", methods=["POST"])
@queued_task
def propagate_acl(_):
  """Web hook to update revision content."""
  models.hooks.acl.propagation.propagate_all()
  return app.make_response(("success", 200, [("Content-Type", "text/html")]))


@app.route("/_background_tasks/create_missing_revisions", methods=["POST"])
@queued_task
def create_missing_revisions(_):
  """Web hook to create revisions for new objects."""
  revisions.do_missing_revisions()
  return app.make_response(("success", 200, [("Content-Type", "text/html")]))


@app.route("/_background_tasks/refresh_revisions", methods=["POST"])
@queued_task
def refresh_revisions(_):
  """Web hook to update revision content."""
  revisions.do_refresh_revisions()
  return app.make_response(("success", 200, [("Content-Type", "text/html")]))


@app.route("/_background_tasks/reindex_snapshots", methods=["POST"])
@queued_task
def reindex_snapshots(_):
  """Web hook to update the full text search index."""
  logger.info("Updating index for: %s", "Snapshot")
  with benchmark("Create records for %s" % "Snapshot"):
    snapshot_indexer.reindex()
  return app.make_response(("success", 200, [("Content-Type", "text/html")]))


@app.route("/_background_tasks/reindex", methods=["POST"])
@queued_task
def reindex(_):
  """Web hook to update the full text search index."""
  do_reindex()
  return app.make_response(("success", 200, [("Content-Type", "text/html")]))


@app.route("/_background_tasks/full_reindex", methods=["POST"])
@queued_task
def full_reindex(_):
  """Web hook to update the full text search index for all models."""
  do_full_reindex()
  return app.make_response(("success", 200, [("Content-Type", "text/html")]))


@app.route("/_background_tasks/compute_attributes", methods=["POST"])
@queued_task
def compute_attributes(args):
  """Web hook to update the full text search index."""
  with benchmark("Run compute_attributes background task"):
    from ggrc.data_platform import computed_attributes
    if args.parameters["event_id"] and not args.parameters["revision_ids"]:
      rows = db.session.query(Revision.id).filter_by(
          event_id=args.parameters["event_id"],).all()
      revision_ids = [revision_id for revision_id, in rows]
    elif str(args.parameters["revision_ids"]) == "all_latest":
      revision_ids = "all_latest"
    else:
      revision_ids = [id_ for id_ in args.parameters["revision_ids"]]

    computed_attributes.compute_attributes(revision_ids)
    return app.make_response(("success", 200, [("Content-Type", "text/html")]))


@app.route('/_background_tasks/update_audit_issues', methods=['POST'])
@queued_task
def update_audit_issues(args):
  """Web hook to update the issues associated with an audit."""
  audit_id = args.parameters['audit_id']
  message = args.parameters['message']

  if not audit_id or not message:
    logger.warning(
        'One or more of required parameters (audit_id, message) is empty.')
    return app.make_response((
        'Parameters audit_id and message are required.',
        400, [('Content-Type', 'text/html')]))

  issue_tracker = all_models.IssuetrackerIssue
  relationships = all_models.Relationship
  query = db.session.query(
      issue_tracker.enabled,
      issue_tracker.issue_id,
      issue_tracker.object_id
  ).join(
      relationships,
      relationships.source_id == issue_tracker.object_id
  ).filter(
      relationships.source_type == 'Assessment',
      relationships.destination_type == 'Audit',
      relationships.destination_id == audit_id
  )
  cli = issues.Client()
  issue_params = {
      'comment': message,
  }
  for enabled, issue_id, assessment_id in query.all():
    if not enabled:
      continue

    try:
      cli.update_issue(issue_id, issue_params)
    except integrations_errors.Error as error:
      logger.error(
          'Unable to update IssueTracker issue ID=%s '
          'for Assessment ID=%s while archiving/unarchiving Audit ID=%s: %s',
          issue_id, assessment_id, audit_id, error)
  return app.make_response(('success', 200, [('Content-Type', 'text/html')]))


def start_compute_attributes(revision_ids=None, event_id=None):
  """Start a background task for computed attributes."""
  task = create_task(
      name="compute_attributes",
      url=url_for(compute_attributes.__name__),
      parameters={"revision_ids": revision_ids, "event_id": event_id},
      method=u"POST",
      queued_callback=compute_attributes
  )
  task.start()


def start_update_audit_issues(audit_id, message):
  """Start a background task to update IssueTracker issues related to Audit."""
  task = create_task(
      name='update_audit_issues',
      url=url_for(update_audit_issues.__name__),
      parameters={
          'audit_id': audit_id,
          'message': message,
      },
      method=u'POST',
      queued_callback=update_audit_issues
  )
  task.start()


@helpers.without_sqlalchemy_cache
def do_reindex(with_reindex_snapshots=False):
  """Update the full text search index."""

  indexer = get_indexer()
  indexed_models = {
      m.__name__: m for m in all_models.all_models
      if issubclass(m, mixin.Indexed) and m.REQUIRED_GLOBAL_REINDEX
  }
  people_query = db.session.query(all_models.Person.id,
                                  all_models.Person.name,
                                  all_models.Person.email)
  indexer.cache["people_map"] = {p.id: (p.name, p.email) for p in people_query}
  indexer.cache["ac_role_map"] = dict(db.session.query(
      all_models.AccessControlRole.id,
      all_models.AccessControlRole.name,
  ))
  for model_name in sorted(indexed_models.keys()):
    logger.info("Updating index for: %s", model_name)
    with benchmark("Create records for %s" % model_name):
      model = indexed_models[model_name]
      ids = [obj.id for obj in model.query]
      ids_count = len(ids)
      handled_ids = 0
      for ids_chunk in utils.list_chunks(ids, chunk_size=REINDEX_CHUNK_SIZE):
        handled_ids += len(ids_chunk)
        logger.info("%s: %s / %s", model.__name__, handled_ids, ids_count)
        model.bulk_record_update_for(ids_chunk)
        db.session.commit()

  if with_reindex_snapshots:
    logger.info("Updating index for: %s", "Snapshot")
    with benchmark("Create records for %s" % "Snapshot"):
      snapshot_indexer.reindex()

  indexer.invalidate_cache()


@helpers.without_sqlalchemy_cache
def do_full_reindex():
  """Update the full text search index for all models."""

  do_reindex(with_reindex_snapshots=True)
  start_compute_attributes(revision_ids="all_latest")


class SetEncoder(json.JSONEncoder):
  """Encoder that can handle python sets"""
  # pylint: disable=method-hidden
  # false positive: https://github.com/PyCQA/pylint/issues/414

  def default(self, obj):  # pylint: disable=arguments-differ
    """If we get a set we first transform it to a list and then just use
       the default encoder"""
    if isinstance(obj, set):
      return list(obj)
    return super(SetEncoder, self).default(obj)


def get_permissions_json():
  """Get all permissions for current user"""
  with benchmark("Get permission JSON"):
    permissions.permissions_for(permissions.get_user())
    return json.dumps(getattr(g, '_request_permissions', None), cls=SetEncoder)


def get_config_json():
  """Get public app config"""
  with benchmark("Get config JSON"):
    public_config = dict(app.config.public_config)
    public_config.update(get_public_config())

    for extension_module in get_extension_modules():
      if hasattr(extension_module, 'get_public_config'):
        public_config.update(
            extension_module.get_public_config(get_current_user()))

    return json.dumps(public_config)


def get_public_config():
  """Expose additional permissions-dependent config to client."""
  if settings.INTEGRATION_SERVICE_URL:
    external_service = "/people/suggest"
  else:
    external_service = None
  return {
      "external_help_url": getattr(settings, "EXTERNAL_HELP_URL", ""),
      "external_import_help_url":
          getattr(settings, "EXTERNAL_IMPORT_HELP_URL", ""),
      "snapshotable_objects": list(rules.Types.all),
      "snapshotable_ignored": list(rules.Types.ignore),
      "snapshotable_parents": list(rules.Types.parents),
      "external_services": {"Person": external_service},
      "enable_release_notes": settings.ENABLE_RELEASE_NOTES,
  }


def get_full_user_json():
  """Get the full current user"""
  with benchmark("Get full user JSON"):
    from ggrc.models.person import Person
    current_user = get_current_user()
    person = Person.eager_query().filter_by(id=current_user.id).one()
    result = publish_representation(publish(person, (), inclusion_filter))
    return as_json(result)


def get_current_user_json():
  """Get current user"""
  with benchmark("Get current user JSON"):
    person = get_current_user()
    return as_json({
        "id": person.id,
        "company": person.company,
        "email": person.email,
        "language": person.language,
        "name": person.name,
        "system_wide_role": person.system_wide_role,
    })


def get_access_control_roles_json():
  """Get a list of all access control roles"""
  with benchmark("Get access roles JSON"):
    attrs = all_models.AccessControlRole.query.options(
        sqlalchemy.orm.undefer_group("AccessControlRole_complete")
    ).filter(~all_models.AccessControlRole.internal).all()
    published = []
    for attr in attrs:
      published.append(publish(attr))
    published = publish_representation(published)
    return as_json(published)


def get_internal_roles_json():
  """Get a list of all access control roles"""
  with benchmark("Get access roles JSON"):
    attrs = all_models.AccessControlRole.query.options(
        sqlalchemy.orm.undefer_group("AccessControlRole_complete")
    ).filter(all_models.AccessControlRole.internal == true()).all()
    published = []
    for attr in attrs:
      published.append(publish(attr))
    published = publish_representation(published)
    return as_json(published)


def get_attributes_json():
  """Get a list of all custom attribute definitions"""
  with benchmark("Get attributes JSON"):
    with benchmark("Get attributes JSON: query"):
      attrs = models.CustomAttributeDefinition.eager_query().filter(
          models.CustomAttributeDefinition.definition_id.is_(None)
      ).all()
    with benchmark("Get attributes JSON: publish"):
      published = []
      for attr in attrs:
        published.append(publish(attr))
      published = publish_representation(published)
    with benchmark("Get attributes JSON: json"):
      publish_json = as_json(published)
      return publish_json


def get_import_types(export_only=False):
  """Returns types that can be imported (and exported) or exported only.

  Args:
    export_only (default False): If set to true, return objects that can only
        be exported and not imported.
  Returns:
    A list of models with model_singular and title_plural as keys.
  """
  # pylint: disable=protected-access
  types = get_exportables if export_only else get_importables
  data = []
  for model in set(types().values()):
    data.append({
        "model_singular": model.__name__,
        "title_plural": model._inflector.title_plural
    })
  data.sort()
  response_json = json.dumps(data)
  return response_json


def get_export_definitions():
  with benchmark("Get export definitions"):
    return get_import_types(export_only=True)


def get_import_definitions():
  with benchmark("Get import definitions"):
    return get_import_types(export_only=False)


def get_all_attributes_json(load_custom_attributes=False):
  """Get a list of all attribute definitions

  This exports all attributes related to a given model, including custom
  attributes and mapping attributes, that are used in csv import and export.
  """
  with benchmark('Loading all attributes JSON'):
    published = {}
    ca_cache = collections.defaultdict(list)
    if load_custom_attributes:
      definitions = models.CustomAttributeDefinition.eager_query().group_by(
          models.CustomAttributeDefinition.title,
          models.CustomAttributeDefinition.definition_type)
      for attr in definitions:
        ca_cache[attr.definition_type].append(attr)
    for model in all_models.all_models:
      published[model.__name__] = \
          AttributeInfo.get_attr_definitions_array(model, ca_cache=ca_cache)
    return as_json(published)


@app.context_processor
def base_context():
  """Gets the base context"""
  return dict(
      get_model=models.get_model,
      permissions_json=get_permissions_json,
      permissions=permissions,
      config_json=get_config_json,
      current_user_json=get_current_user_json,
      full_user_json=get_full_user_json,
      attributes_json=get_attributes_json,
      access_control_roles_json=get_access_control_roles_json,
      internal_access_control_roles_json=get_internal_roles_json,
      all_attributes_json=get_all_attributes_json,
      import_definitions=get_import_definitions,
      export_definitions=get_export_definitions,
  )


# Actual HTML-producing routes
#


@app.route("/")
def index():
  """The initial entry point of the app
  """
  if not settings.PRODUCTION:
    flash(u"""This is not the production instance
              of the GGRC application.<br>
              Company confidential, sensitive or personally identifiable
              information <b>*MUST NOT*</b> be entered or stored here.
              For any questions, please contact your administrator.""",
          "alert alert-warning")
  about_url = getattr(settings, "ABOUT_URL", None)
  about_text = getattr(settings, "ABOUT_TEXT", "About GGRC")
  return render_template(
      "welcome/index.haml",
      about_url=about_url,
      about_text=about_text,
  )


@app.route("/dashboard")
@login_required
def dashboard():
  """The dashboard page
  """
  return render_template(
      "dashboard/index.haml",
      page_type="MY_WORK",
  )


@app.route("/objectBrowser")
@login_required
def object_browser():
  """The object Browser page
  """
  return render_template(
      "dashboard/index.haml",
      page_type="ALL_OBJECTS",
  )


@app.route("/admin/reindex_snapshots", methods=["POST"])
@login_required
@admin_required
def admin_reindex_snapshots():
  """Calls a webhook that reindexes indexable objects
  """
  task_queue = create_task(
      name="reindex_snapshots",
      url=url_for(reindex_snapshots.__name__),
      queued_callback=reindex_snapshots,
  )
  return task_queue.make_response(
      app.make_response(("scheduled %s" % task_queue.name, 200,
                         [('Content-Type', 'text/html')])))


@app.route("/admin/reindex", methods=["POST"])
@login_required
@admin_required
def admin_reindex():
  """Calls a webhook that reindexes indexable objects
  """
  task_queue = create_task(
      name="reindex",
      url=url_for(reindex.__name__),
      queued_callback=reindex
  )
  return task_queue.make_response(
      app.make_response(("scheduled %s" % task_queue.name, 200,
                         [('Content-Type', 'text/html')])))


@app.route("/admin/full_reindex", methods=["POST"])
@login_required
@admin_required
def admin_full_reindex():
  """Calls a webhook that reindexes all indexable objects
  """
  task_queue = create_task(
      name="full_reindex",
      url=url_for(full_reindex.__name__),
      queued_callback=full_reindex
  )
  return task_queue.make_response(
      app.make_response(("scheduled %s" % task_queue.name, 200,
                         [('Content-Type', 'text/html')])))


@app.route("/admin/refresh_revisions", methods=["POST"])
@login_required
@admin_required
def admin_refresh_revisions():
  """Calls a webhook that refreshes revision content."""
  admins = getattr(settings, "BOOTSTRAP_ADMIN_USERS", [])
  if get_current_user().email not in admins:
    raise exceptions.Forbidden()

  task_queue = create_task("refresh_revisions", url_for(
      refresh_revisions.__name__), refresh_revisions)
  return task_queue.make_response(
      app.make_response(("scheduled %s" % task_queue.name, 200,
                         [('Content-Type', 'text/html')])))


@app.route("/admin/compute_attributes", methods=["POST"])
@login_required
@admin_required
def send_event_job():
  """Trigger background task on every event for computed attributes."""
  with benchmark("POST /admin/compute_attributes"):
    if request.data:
      revision_ids = request.get_json().get("revision_ids", [])
    else:
      revision_ids = "all_latest"
    start_compute_attributes(revision_ids=revision_ids)
    return app.make_response(("success", 200, [("Content-Type", "text/html")]))


@app.route("/admin/propagate_acl", methods=["POST"])
@login_required
@admin_required
def admin_propagate_acl():
  """Propagates all ACL entries"""
  admins = getattr(settings, "BOOTSTRAP_ADMIN_USERS", [])
  if get_current_user().email not in admins:
    raise exceptions.Forbidden()

  task_queue = create_task("propagate_acl", url_for(
      propagate_acl.__name__), propagate_acl)
  return task_queue.make_response(
      app.make_response(("scheduled %s" % task_queue.name, 200,
                         [('Content-Type', 'text/html')])))


@app.route("/admin/create_missing_revisions", methods=["POST"])
@login_required
@admin_required
def admin_create_missing_revisions():
  """Create revisions for new objects"""
  admins = getattr(settings, "BOOTSTRAP_ADMIN_USERS", [])
  if get_current_user().email not in admins:
    raise exceptions.Forbidden()

  task_queue = create_task("create_missing_revisions", url_for(
      create_missing_revisions.__name__), create_missing_revisions)
  return task_queue.make_response(
      app.make_response(("scheduled %s" % task_queue.name, 200,
                        [('Content-Type', 'text/html')])))


@app.route("/admin")
@login_required
@admin_required
def admin():
  """The admin dashboard page
  """
  return render_template("admin/index.haml")


@app.route("/assessments_view")
@login_required
def assessments_view():
  """The clutter-free list of all Person's Assessments"""
  return render_template("assessments_view/index.haml")


@app.route("/background_task/<id_task>", methods=['GET'])
def get_task_response(id_task):
  """Gets the status of a background task"""
  return make_task_response(id_task)


def contributed_object_views():
  """Contributed object views"""

  return [
      object_view(models.AccessGroup),
      object_view(models.Assessment),
      object_view(models.AssessmentTemplate),
      object_view(models.Audit),
      object_view(models.Clause),
      object_view(models.Contract),
      object_view(models.Control),
      object_view(models.DataAsset),
      object_view(models.Document),
      object_view(models.Evidence),
      object_view(models.Facility),
      object_view(models.Issue),
      object_view(models.Market),
      object_view(models.Objective),
      object_view(models.OrgGroup),
      object_view(models.Person),
      object_view(models.Policy),
      object_view(models.Process),
      object_view(models.Product),
      object_view(models.Program),
      object_view(models.Project),
      object_view(models.Regulation),
      object_view(models.Requirement),
      object_view(models.Snapshot),
      object_view(models.Standard),
      object_view(models.System),
      object_view(models.TechnologyEnvironment),
      object_view(models.Vendor),
      object_view(models.Metric),
      object_view(models.ProductGroup),
  ]


def all_object_views():
  """Gets all object views defined in the application"""
  views = contributed_object_views()

  for extension_module in get_extension_modules():
    contributions = getattr(extension_module, "contributed_object_views", None)
    if contributions:
      if callable(contributions):
        contributions = contributions()
      views.extend(contributions)

  return views


def init_extra_views(app_):
  """Init any extra views needed by the app

  This should be used for any views that might use extension modules.
  """
  filters.init_filter_views()
  converters.init_converter_views()
  cron.init_cron_views(app_)
  notifications.init_notification_views(app_)
  query_views.init_query_views(app_)
  query_views.init_clone_views(app_)


def init_all_views(app_):
  """Inits all views defined in the core module and submodules"""
  for entry in all_object_views():
    entry.service_class.add_to(
        app_,
        '/{0}'.format(entry.url),
        entry.model_class,
        decorators=(login_required,)
    )

  init_extra_views(app_)
  for extension_module in get_extension_modules():
    ext_extra_views = getattr(extension_module, "init_extra_views", None)
    if ext_extra_views:
      ext_extra_views(app_)


@app.route("/permissions")
@login_required
def user_permissions():
  '''Permissions object for the currently
     logged in user
  '''
  return get_permissions_json()


@app.route("/api/document/documents_exist", methods=["POST"])
@login_required
def is_document_exists():
  """Check if documents with gdrive_ids are exists"""
  DocumentEndpoint.validate_doc_request(request.json)
  ids = request.json["gdrive_ids"]
  result_set = db.session.query(all_models.Document.id,
                                all_models.Document.gdrive_id).filter(
      all_models.Document.gdrive_id.in_(ids))
  response = DocumentEndpoint.build_doc_exists_response(request.json,
                                                        result_set)
  return Response(json.dumps(response), mimetype='application/json')


@app.route("/api/document/make_admin", methods=["POST"])
@login_required
def make_document_admin():
  """Add current user as document admin"""
  DocumentEndpoint.validate_doc_request(request.json)
  ids = request.json["gdrive_ids"]
  docs = all_models.Document.query.filter(
      all_models.Document.gdrive_id.in_(ids))
  for doc in docs:
    doc.add_admin_role()
  db.session.commit()
  response = DocumentEndpoint.build_make_admin_response(request.json, docs)
  return Response(json.dumps(response), mimetype='application/json')
