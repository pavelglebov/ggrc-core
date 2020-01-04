# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert process attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class ProcessConverter(scope.ScopeConverter):
  """Class for process converter."""

  DEFINITION_TYPE = 'process'
  OBJECT_TYPE = 'Process'
  TABLE_NAME = 'systems'
