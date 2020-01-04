# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert system attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class SystemConverter(scope.ScopeConverter):
  """Class for system converter."""

  DEFINITION_TYPE = 'system'
  OBJECT_TYPE = 'System'
  TABLE_NAME = 'systems'
