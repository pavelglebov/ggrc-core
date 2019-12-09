# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert market attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class MarketConverter(scope.ScopeConverter):
  """Class for market converter."""

  DEFINITION_TYPE = 'market'
  OBJECT_TYPE = 'Market'
  TABLE_NAME = 'markets'
