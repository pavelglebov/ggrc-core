# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert data asset attributes from html to markdown."""


from ggrc.migrations.markdown import scope


class DataAssetConverter(scope.ScopeConverter):
  """Class for data asset converter."""

  DEFINITION_TYPE = 'data_asset'
  OBJECT_TYPE = 'DataAsset'
  TABLE_NAME = 'data_assets'
