# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert vendor attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class VendorConverter(scope.ScopeConverter):
  """Class for vendor converter."""

  DEFINITION_TYPE = 'vendor'
  OBJECT_TYPE = 'Vendor'
  TABLE_NAME = 'vendors'
