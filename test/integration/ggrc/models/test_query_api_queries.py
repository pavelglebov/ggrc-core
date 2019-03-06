# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Tests for making sure eager queries are working on all mixins."""

import ddt

from ggrc.utils import QueryCounter

from integration.ggrc import TestCase
from integration.ggrc.models import factories as ggrc_factories
from integration.ggrc_workflows.models import factories as wf_factories
from integration.ggrc.query_helper import WithQueryApi
from integration.ggrc import api_helper


@ddt.ddt
class TestAllModels(WithQueryApi, TestCase):
  """Test basic model structure for all models"""

  def setUp(self):
    super(TestAllModels, self).setUp()
    self.client.get("/login")
    self.api = api_helper.Api()

  QUERY_API_LIMIT = {
      'Assessment': 16,
      'AssessmentTemplate': 10,
      'AccessGroup': 17,
      'Audit': 14,
      'Comment': 8,
      'Contract': 15,
      'Control': 16,
      'Cycle': 9,
      'CycleTaskGroup': 10,
      'CycleTaskGroupObjectTask': 14,
      'Document': 9,
      'Issue': 14,
      'KeyReport': 14,
      'Market': 14,
      'Objective': 15,
      'OrgGroup': 14,
      'Person': 12,
      'Policy': 15,
      'Process': 14,
      'System': 14,
      'Program': 18,
      'Regulation': 15,
      'TaskGroup': 11,
      'TaskGroupObject': 4,
      'TaskGroupTask': 9,
      'Workflow': 14,
      'TechnologyEnvironment': 8,
      'Product': 14,
      'Metric': 14,
      'ProductGroup': 14,
  }

  MODEL_FACTORIES = [
      ggrc_factories.AuditFactory,
      ggrc_factories.AssessmentFactory,
      ggrc_factories.AssessmentTemplateFactory,
      ggrc_factories.CommentFactory,
      ggrc_factories.ContractFactory,
      ggrc_factories.ControlFactory,
      ggrc_factories.IssueFactory,
      ggrc_factories.KeyReportFactory,
      ggrc_factories.MarketFactory,
      ggrc_factories.ObjectiveFactory,
      ggrc_factories.OrgGroupFactory,
      ggrc_factories.PersonFactory,
      ggrc_factories.PolicyFactory,
      ggrc_factories.ProcessFactory,
      ggrc_factories.SystemFactory,
      ggrc_factories.ProgramFactory,
      ggrc_factories.RegulationFactory,
      ggrc_factories.DocumentFactory,
      ggrc_factories.MetricFactory,
      ggrc_factories.ProductFactory,
      ggrc_factories.ProductGroupFactory,
      wf_factories.CycleFactory,
      wf_factories.CycleTaskGroupFactory,
      wf_factories.CycleTaskGroupObjectTaskFactory,
      wf_factories.TaskGroupFactory,
      wf_factories.TaskGroupTaskFactory,
      wf_factories.WorkflowFactory,
  ]

  LOWER_BOUND_COUNT = 10

  UPPER_BOUND_COUNT = 20

  QUERY_API_TEST_CASES = [(f, count) for f in MODEL_FACTORIES
                          for count in (LOWER_BOUND_COUNT,
                                        UPPER_BOUND_COUNT)]

  @ddt.data(*QUERY_API_TEST_CASES)
  @ddt.unpack
  def test_index_on_commit(self, factory, obj_count):
    """Test count number of queries on eager query procedure."""

    model = factory._meta.model  # pylint: disable=protected-access
    with ggrc_factories.single_commit():
      # pylint: disable=expression-not-assigned
      {factory() for _ in range(obj_count)}
    with QueryCounter() as counter:
      self._post([{
          "object_name": model.__name__,
          "filters": {"expression": {}},
          "limit": [0, obj_count],
          "order_by": [{"name": "updated_at", "desc": True}]
      }])
      self.assertEqual(
          counter.get,
          self.QUERY_API_LIMIT[model.__name__],
          "Eager query of {model} has too much queries: "
          "{counted} not equal to {expected} for query "
          "{obj_count} instances".format(
              model=model,
              expected=self.QUERY_API_LIMIT[model.__name__],
              counted=counter.get,
              obj_count=obj_count,
          )
      )
