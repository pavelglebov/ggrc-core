# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Module for convert access group attributes from html to markdown."""


from ggrc.migrations.markdown import scope


class AccountBalanceConverter(scope.ScopeConverter):
  """Class for account balance converter."""

  DEFINITION_TYPE = 'account_balance'
  OBJECT_TYPE = 'AccountBalance'
  TABLE_NAME = 'account_balances'
