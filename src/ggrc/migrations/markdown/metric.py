# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert metric attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class MetricConverter(scope.ScopeConverter):
  """Class for metric converter."""

  DEFINITION_TYPE = 'metric'
  OBJECT_TYPE = 'Metric'
  TABLE_NAME = 'metrics'
