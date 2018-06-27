# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Collects all permissions for Global Creator role."""

# pylint: disable=invalid-name

scope = "System"
description = """
  This role grants a user basic object creation and editing permission.
  """

owner_base = [
    "Categorization",
    "Category",
    "ControlCategory",
    "ControlAssertion",
    "Option",
    {
        "type": "BackgroundTask",
        "terms": {
            "property_name": "modified_by",
            "value": "$current_user"
        },
        "condition": "is"
    },
    "CustomAttributeDefinition",
    "CustomAttributeValue",
]
owner_read = owner_base + [
    "AccessControlList",
    "AccessControlRole",
    {
        "type": "Relationship",
        "terms": {
            "property_name": "source,destination",
            "action": "read"
        },
        "condition": "relationship",
    },
    {
        "type": "Proposal",
        "condition": "is_allowed_based_on",
        "terms": {
            "property_name": "instance",
            "action": "read",
        }
    },
    "Role",
    "UserRole",
    "Context",
    "Person",
]

owner_update = owner_base + [
    {
        "type": "Relationship",
        "terms": {
            "property_name": "source,destination",
            "action": "update"
        },
        "condition": "relationship",
    },
    {
        "type": "Comment",
        "terms": {
            "property_name": "modified_by",
            "value": "$current_user"
        },
        "condition": "is"
    },
    {
        "type": "Proposal",
        "condition": "is_allowed_based_on",
        "terms": {
            "property_name": "instance",
            "action": "update",
        }
    },
]

permissions = {
    "read": owner_read,
    "create": [
        {
            "type": "Audit",
            "condition": "is_allowed_based_on",
            "terms": {
                "property_name": "program",
                "action": "update",
            }
        },
        {
            "type": "Snapshot",
            "condition": "is_allowed_based_on",
            "terms": {
                "property_name": "parent",
                "action": "update",
            }
        },
        "AssessmentTemplate",
        {
            "type": "TaskGroup",
            "condition": "is_workflow_admin",
            "terms": {},
        },
        {
            "type": "TaskGroupTask",
            "condition": "is_workflow_admin",
            "terms": {},
        },
        {
            "type": "Cycle",
            "condition": "is_workflow_admin",
            "terms": {},
        },
        {
            "type": "CycleTaskEntry",
            "condition": "is_workflow_admin",
            "terms": {},
        },
        {
            "type": "TaskGroupObject",
            "condition": "is_workflow_admin",
            "terms": {},
        },
        "Categorization",
        "Category",
        "ControlCategory",
        "ControlAssertion",
        "Control",
        "Comment",
        {
            "type": "Assessment",
            "condition": "is_auditor",
            "terms": {},
        },
        "Issue",
        "DataAsset",
        "AccessGroup",
        "Directive",
        "Contract",
        "Policy",
        "Regulation",
        "Standard",
        "Document",
        "Evidence",
        "Facility",
        "Market",
        "Objective",
        "ObjectPerson",
        "Option",
        "OrgGroup",
        "Vendor",
        "PopulationSample",
        "Product",
        {
            "type": "Proposal",
            "condition": "is_allowed_based_on",
            "terms": {
                "property_name": "instance",
                "action": "read",
            }
        },
        "Project",
        {
            "type": "Relationship",
            "terms": {
                "property_name": "source,destination",
                "action": "update"
            },
            "condition": "relationship",
        },
        "Requirement",
        "Clause",
        "SystemOrProcess",
        "System",
        "Process",
        "Metric",
        "ProductGroup",
        "Program",
        "TechnologyEnvironment",
        "Context",
        {
            "type": "BackgroundTask",
            "terms": {
                "property_name": "modified_by",
                "value": "$current_user"
            },
            "condition": "is"
        },
    ],
    "update": owner_update,
    "delete": owner_update,
}
