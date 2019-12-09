# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert facility attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class FacilityConverter(scope.ScopeConverter):
  """Class for facility converter."""

  DEFINITION_TYPE = 'facility'
  OBJECT_TYPE = 'Facility'
  TABLE_NAME = 'facilities'
