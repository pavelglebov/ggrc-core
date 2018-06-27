# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""All GGRC REST services."""

from ggrc.services.common import ReadOnlyResource
from ggrc.services.registry import service


def contributed_services():
  """The list of all GGRC collection services as a list of
  (url, ModelClass) tuples.
  """
  import ggrc.models.all_models as models
  from ggrc.services.resources.relationship import RelationshipResource
  from ggrc.services.resources.audit import AuditResource
  from ggrc.services.resources.assessment import AssessmentResource
  from ggrc.services.resources.person import PersonResource
  from ggrc.services.resources import related_assessments
  from ggrc.access_control.role import AccessControlRole

  return [
      service('background_tasks', models.BackgroundTask),
      service('access_groups', models.AccessGroup),
      service('audits', models.Audit, AuditResource),
      service('categorizations', models.Categorization),
      service('category_bases', models.CategoryBase),
      service('control_categories', models.ControlCategory),
      service('control_assertions', models.ControlAssertion),
      service('contexts', models.Context),
      service('controls', models.Control),
      service('assessments', models.Assessment, AssessmentResource),
      service('assessment_templates', models.AssessmentTemplate),
      service('comments', models.Comment),
      service('custom_attribute_definitions',
              models.CustomAttributeDefinition),
      service('custom_attribute_values', models.CustomAttributeValue),
      service('data_assets', models.DataAsset),
      service('directives', models.Directive, ReadOnlyResource),
      service('contracts', models.Contract),
      service('evidence', models.Evidence),
      service('policies', models.Policy),
      service('regulations', models.Regulation),
      service('standards', models.Standard),
      service('documents', models.Document),
      service('events', models.Event, ReadOnlyResource),
      service('facilities', models.Facility),
      service('markets', models.Market),
      service('object_people', models.ObjectPerson),
      service('objectives', models.Objective),
      service('options', models.Option),
      service('org_groups', models.OrgGroup),
      service('vendors', models.Vendor),
      service('people', models.Person, PersonResource),
      service('products', models.Product),
      service('projects', models.Project),
      service('programs', models.Program),
      service('relationships', models.Relationship, RelationshipResource),
      service('revisions', models.Revision, ReadOnlyResource),
      service('requirements', models.Requirement),
      service('clauses', models.Clause),
      service(
          'systems_or_processes', models.SystemOrProcess, ReadOnlyResource),
      service('systems', models.System),
      service('processes', models.Process),
      service('metrics', models.Metric),
      service('notification_configs', models.NotificationConfig),
      service('issues', models.Issue),
      service('snapshots', models.Snapshot),
      service('access_control_roles', AccessControlRole),
      service('labels', models.Label),
      service('proposals', models.Proposal),
      service('related_assessments', None,
              related_assessments.RelatedAssessmentsResource),
      service('technology_environments', models.TechnologyEnvironment),
      service('product_groups', models.ProductGroup),
  ]


def all_services():
  """Get services from all modules."""
  from ggrc.extensions import get_extension_modules

  services = contributed_services()

  for extension_module in get_extension_modules():
    contributions = getattr(extension_module, 'contributed_services', None)
    if contributions:
      if callable(contributions):
        contributions = contributions()
      services.extend(contributions)
  return services


def init_extra_services(app):
  """Add extra service url rules."""
  from ggrc.login import login_required

  from ggrc.services.search import search
  app.add_url_rule(
      '/search', 'search', login_required(search))

  from ggrc.services.suggest import suggest
  app.add_url_rule('/people/suggest', 'suggest', login_required(suggest))

  from ggrc.services.description import ServiceDescription
  app.add_url_rule(
      '/api', view_func=ServiceDescription.as_view('ServiceDescription'))


def init_all_services(app):
  """Register all GGRC REST services with the Flask application ``app``."""
  from ggrc.extensions import get_extension_modules
  from ggrc.login import login_required

  for entry in all_services():
    entry.service_class.add_to(
        app,
        '/api/{0}'.format(entry.name),
        entry.model_class,
        decorators=(login_required,),
    )

  init_extra_services(app)
  for extension_module in get_extension_modules():
    ext_extra_services = getattr(extension_module, 'init_extra_services', None)
    if ext_extra_services:
      ext_extra_services(app)
