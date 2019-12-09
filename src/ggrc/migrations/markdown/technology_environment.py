# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert technology environment attributes html to markdown."""

from ggrc.migrations.markdown import scope


class TechnologyEnvironmentConverter(scope.ScopeConverter):
  """Class for technology environment converter."""

  DEFINITION_TYPE = 'technology_environment'
  OBJECT_TYPE = 'TechnologyEnvironment'
  TABLE_NAME = 'technology_environments'
