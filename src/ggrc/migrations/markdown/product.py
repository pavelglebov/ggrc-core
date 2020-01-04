# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert product attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class ProductConverter(scope.ScopeConverter):
  """Class for product converter."""

  DEFINITION_TYPE = 'product'
  OBJECT_TYPE = 'Product'
  TABLE_NAME = 'products'
