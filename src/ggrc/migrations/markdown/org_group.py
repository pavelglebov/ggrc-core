# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert org group attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class OrgGroupConverter(scope.ScopeConverter):
  """Class for org group converter."""

  DEFINITION_TYPE = 'org_group'
  OBJECT_TYPE = 'OrgGroup'
  TABLE_NAME = 'org_groups'
