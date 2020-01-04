# Copyright (C) 2020 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
migrate html to markdown for Scope objects

Create Date: 2019-12-10 14:05:31.973483
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

from alembic import op

from ggrc.migrations.markdown import access_group
from ggrc.migrations.markdown import account_balance
from ggrc.migrations.markdown import data_asset
from ggrc.migrations.markdown import facility
from ggrc.migrations.markdown import key_report
from ggrc.migrations.markdown import market
from ggrc.migrations.markdown import metric
from ggrc.migrations.markdown import org_group
from ggrc.migrations.markdown import process
from ggrc.migrations.markdown import product
from ggrc.migrations.markdown import product_group
from ggrc.migrations.markdown import project
from ggrc.migrations.markdown import system
from ggrc.migrations.markdown import technology_environment
from ggrc.migrations.markdown import vendor


# revision identifiers, used by Alembic.
revision = 'ddc897e22d54'
down_revision = '2d0f232de783'


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  # pylint: disable=too-many-locals

  connection = op.get_bind()

  converters = [
      access_group.AccessGroupConverter(),
      account_balance.AccountBalanceConverter(),
      data_asset.DataAssetConverter(),
      facility.FacilityConverter(),
      key_report.KeyReportConverter(),
      market.MarketConverter(),
      metric.MetricConverter(),
      org_group.OrgGroupConverter(),
      process.ProcessConverter(),
      product.ProductConverter(),
      product_group.ProductGroupConverter(),
      project.ProjectConverter(),
      system.SystemConverter(),
      technology_environment.TechnologyEnvironmentConverter(),
      vendor.VendorConverter(),
  ]

  for converter in converters:
    converter.convert_to_markdown(connection)


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  raise NotImplementedError("Downgrade is not supported")
