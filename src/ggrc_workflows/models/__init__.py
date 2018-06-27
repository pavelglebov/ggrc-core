# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>


from ggrc.models.all_models import register_model
from ggrc.models import all_models

from .task_group_task import TaskGroupTask
from .task_group import TaskGroup
from .task_group_object import TaskGroupObject
from .workflow import Workflow
from .cycle import Cycle
from .cycle_task_entry import CycleTaskEntry
from .cycle_task_group import CycleTaskGroup
from .cycle_task_group_object_task import CycleTaskGroupObjectTask


register_model(TaskGroup)
register_model(TaskGroupObject)
register_model(TaskGroupTask)
register_model(Workflow)

register_model(Cycle)
register_model(CycleTaskEntry)
register_model(CycleTaskGroup)
register_model(CycleTaskGroupObjectTask)

WORKFLOW_OBJECT_TYPES = {
    "Program", "Vendor", "OrgGroup",
    "Assessment",
    "Regulation", "Standard", "Policy", "Contract",
    "Objective", "Control", "Requirement", "Clause",
    "System", "Process",
    "DataAsset", "Facility", "Market", "Product", "Project", "Issue",
    "AccessGroup", "Risk", "Threat",
    "Metric", "TechnologyEnvironment", "ProductGroup",
}

WORKFLOW_OBJECT_TYPES = set(t for t in WORKFLOW_OBJECT_TYPES if
                            hasattr(all_models, t))
