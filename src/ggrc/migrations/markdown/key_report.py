# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert key report attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class KeyReportConverter(scope.ScopeConverter):
  """Class for key report converter."""

  DEFINITION_TYPE = 'key_report'
  OBJECT_TYPE = 'KeyReport'
  TABLE_NAME = 'key_reports'
