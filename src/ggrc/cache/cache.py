# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>


from collections import namedtuple

CacheEntry = namedtuple('CacheEntry', 'model_plural class_name cache_type')
MappingEntry = namedtuple('MappingEntry', 'class_name attr polymorph')


def resource(model_plural, class_name, cache_type='memcache'):
  return CacheEntry(model_plural, class_name, cache_type)


def mapping(class_name, attr, polymorph=False):
  return MappingEntry(class_name, attr, polymorph)


def all_cache_entries():
  ret = [
      resource('access_groups', 'AccessGroup'),
      resource('audits', 'Audit'),
      resource('custom_attribute_values', 'CustomAttributeValue'),
      resource('categorizations', 'Categorization'),
      resource('category_bases', 'CategoryBase'),
      resource('comments', 'Comment'),
      resource('control_categories', 'ControlCategory'),
      resource('control_assertions', 'ControlAssertion'),
      resource('contexts', 'Context'),
      resource('controls', 'Control'),
      resource('assessments', 'Assessments'),
      resource('assessment_templates', 'AssessmentTemplate'),
      resource('data_assets', 'DataAsset'),
      resource('directives', 'Directive'),
      resource('contracts', 'Contract'),
      resource('policies', 'Policy'),
      resource('regulations', 'Regulation'),
      resource('standards', 'Standard'),
      resource('documents', 'Document'),
      resource('evidence', 'Evidence'),
      resource('events', 'Event'),
      resource('facilities', 'Facility'),
      resource('markets', 'Market'),
      resource('object_people', 'ObjectPerson'),
      resource('objectives', 'Objective'),
      resource('options', 'Option'),
      resource('org_groups', 'OrgGroup'),
      resource('vendors', 'Vendor'),
      resource('people', 'Person'),
      resource('products', 'Product'),
      resource('projects', 'Project'),
      resource('programs', 'Program'),
      resource('relationships', 'Relationship'),
      resource('requirements', 'Requirement'),
      resource('clauses', 'Clause'),
      resource('systems_or_processes', 'SystemOrProcess'),
      resource('systems', 'System'),
      resource('processes', 'Process'),
      resource('issues', 'Issue'),
      resource('snapshots', 'Snapshot'),
      resource('product_groups', 'ProductGroup'),
      resource('metrics', 'Metric'),
      resource('technology_environments', 'TechnologyEnvironment'),

      # ggrc notification models
      resource('notification_configs', 'NotificationConfig'),
      resource('notifications', 'Notification'),
      resource('notification_type', 'NotificationType'),

      # ggrc custom attribuess
      resource('custom_attribute_definitions', 'CustomAttributeDefinition'),
      resource('custom_attribute_values', 'CustomAttributeValue'),

      # FIXME: Extension-defined models should be registered
      #        from the extensions.

      # ggrc_basic_permissions models
      resource('roles', 'Role'),
      resource('user_roles', 'UserRole'),

      # ggrc_risk_assessments models
      resource('templates', 'Template'),
      resource('risk_assessments', 'RiskAssessment'),
      resource('risk_assessment_mappings', 'RiskAssessmentMapping'),
      resource('risk_assessment_control_mappings',
               'RiskAssessmentControlMapping'),
      resource('threats', 'Threat'),
      resource('vulnerabilities', 'Vulnerability'),

      # ggrc_workflows models
      resource('cycle_task_entries', 'CycleTaskEntry'),
      resource('cycle_task_group_object_tasks', 'CycleTaskGroupObjectTask'),
      resource('cycle_task_groups', 'CycleTaskGroup'),
      resource('cycles', 'Cycle'),
      resource('task_group_objects', 'TaskGroupObject'),
      resource('task_group_tasks', 'TaskGroupTask'),
      resource('task_groups', 'TaskGroup'),
      resource('workflows', 'Workflow'),
  ]

  return ret


def all_mapping_entries():
  ret = [
      mapping('Audit', 'program'),
      mapping('CustomAttributeValue', 'attributable', True),
      mapping('ObjectPerson', 'person'),
      mapping('ObjectPerson', 'personable', True),
      mapping('Requirement', 'directive'),  # this goes out?
      mapping('Relationship', 'source', True),
      mapping('Relationship', 'destination', True),
      mapping('UserRole', 'context'),
      mapping('UserRole', 'person'),
      mapping('UserRole', 'role'),
      mapping('Notification', 'recipients'),
      mapping('Notification', 'notification_object'),
      # ggrc_workflows mappings:
      mapping('TaskGroupObject', 'object', True),
      mapping('TaskGroupObject', 'task_group'),
      mapping('TaskGroupTask', 'task_group'),
      mapping('TaskGroup', 'workflow'),
      mapping('Cycle', 'workflow'),
      mapping('Cycle', 'cycle_task_groups'),
      mapping('CycleTaskGroup', 'cycle'),
      mapping('CycleTaskGroup', 'task_group'),
      mapping('CycleTaskGroupObjectTask', 'cycle'),
      mapping('CycleTaskGroupObjectTask', 'cycle_task_entries'),
      mapping('CycleTaskGroupObjectTask', 'cycle_task_group'),
      mapping('CycleTaskGroupObjectTask', 'task_group_task'),
      mapping('CycleTaskGroupObjectTask', 'cycle_task_objects_for_cache'),
      mapping('CycleTaskEntry', 'cycle'),
      mapping('CycleTaskEntry', 'cycle_task_group_object_task'),
      # mapping('RiskAssessmentMapping'),
      # mapping('RiskAssessmentControlMapping'),
  ]

  return ret


class Cache(object):  # pylint: disable=no-self-use
  name = None
  supported_resources = {}

  def __init__(self):
    pass

  def get_name(self):
    return None

  def get(self, *_):
    return None

  def add(self, *_):
    return None

  def update(self, *_):
    return None

  def remove(self, *_):
    return None

  def get_multi(self, *_):
    return None

  def add_multi(self, *_):
    return None

  def update_multi(self, *_):
    return None

  def remove_multi(self, *_):
    return None

  def clean(self):
    return False

  @staticmethod
  def get_key(category, resource_name):
    cache_key = category + ":" + resource_name
    return cache_key

  @staticmethod
  def parse_filter(filter_obj):
    return filter_obj.get('ids'), filter_obj.get('attrs')

  def is_caching_supported(self, category, resource_name):
    if category is 'collection':
      return resource_name in self.supported_resources
    return False
