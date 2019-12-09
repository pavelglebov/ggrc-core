# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert access group attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class AccessGroupConverter(scope.ScopeConverter):
  """Class for access group converter."""

  DEFINITION_TYPE = 'access_group'
  OBJECT_TYPE = 'AccessGroup'
  TABLE_NAME = 'access_groups'
