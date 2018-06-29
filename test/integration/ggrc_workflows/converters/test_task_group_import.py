# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Tests for TaskGroup import."""

import collections

import ddt

from ggrc.converters import errors
from ggrc.models import all_models
from ggrc_risks.models import risk, threat
from integration.ggrc.models import factories
from integration.ggrc_workflows.helpers import workflow_test_case
from integration.ggrc_workflows.models import factories as wf_factories


@ddt.ddt
class TestTaskGroupImport(workflow_test_case.WorkflowTestCase):
  """Tests related to TaskGroup import."""

  @ddt.data(
      (all_models.OrgGroup.__name__, True),
      (all_models.Vendor.__name__, True),
      (all_models.AccessGroup.__name__, True),
      (all_models.System.__name__, True),
      (all_models.Process.__name__, True),
      (all_models.DataAsset.__name__, True),
      (all_models.Product.__name__, True),
      (all_models.Project.__name__, True),
      (all_models.Facility.__name__, True),
      (all_models.Market.__name__, True),
      (all_models.Program.__name__, True),
      (all_models.Regulation.__name__, True),
      (all_models.Policy.__name__, True),
      (all_models.Standard.__name__, True),
      (all_models.Contract.__name__, True),
      (all_models.Clause.__name__, True),
      (all_models.Requirement.__name__, True),
      (all_models.Control.__name__, True),
      (all_models.Objective.__name__, True),
      (all_models.Issue.__name__, True),
      (risk.Risk.__name__, True),
      (threat.Threat.__name__, True),
      (all_models.Assessment.__name__, False),
      (all_models.Audit.__name__, False),
      (all_models.Metric.__name__, True),
      (all_models.ProductGroup.__name__, True),
      (all_models.TechnologyEnvironment.__name__, True),
  )
  @ddt.unpack
  def test_task_group_import_objects(self, model_name, is_mapped):
    """"Test import TaskGroup with mapping to object: {0}"""
    wf_slug = "WORKFLOW-1"
    tg_slug = "TASKGROUP-1"
    mapped_slug = "MAPPEDOBJECT-1"
    with factories.single_commit():
      factories.get_model_factory(model_name)(slug=mapped_slug)
      workflow = wf_factories.WorkflowFactory(slug=wf_slug)
      wf_factories.TaskGroupFactory(slug=tg_slug, workflow=workflow)

    tg_data = collections.OrderedDict([
        ("object_type", all_models.TaskGroup.__name__),
        ("code", tg_slug),
        ("workflow", wf_slug),
        ("objects", "{}: {}".format(model_name, mapped_slug))
    ])
    result = self.import_data(tg_data)
    task_group = all_models.TaskGroup.query.one()
    if is_mapped:
      self.assertEqual(len(task_group.task_group_objects), 1)
      self.assertEqual(task_group.task_group_objects[0].object.slug,
                       mapped_slug)
      self.assertEqual(len(result[0]['row_warnings']), 0)
    else:
      self.assertEqual(len(task_group.task_group_objects), 0)
      self.assertEqual(len(result[0]['row_warnings']), 1)
      self.assertEqual(
          result[0]['row_warnings'][0],
          errors.INVALID_TASKGROUP_MAPPING_WARNING.format(
              line=3, object_class=model_name
          )
      )
