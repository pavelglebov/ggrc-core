# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert project attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class ProjectConverter(scope.ScopeConverter):
  """Class for project converter."""

  DEFINITION_TYPE = 'project'
  OBJECT_TYPE = 'Project'
  TABLE_NAME = 'projects'
