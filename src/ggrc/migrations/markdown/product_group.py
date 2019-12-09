# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert product group attributes from html to markdown."""

from ggrc.migrations.markdown import scope


class ProductGroupConverter(scope.ScopeConverter):
  """Class for product group converter."""

  DEFINITION_TYPE = 'product_group'
  OBJECT_TYPE = 'ProductGroup'
  TABLE_NAME = 'product_groups'
