# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Program model."""
from ggrc import db
from ggrc.access_control import roleable
from ggrc.fulltext import mixin as ft_mixin
from ggrc.models import context
from ggrc.models import deferred
from ggrc.models import mixins
from ggrc.models import object_document
from ggrc.models import object_person
from ggrc.models import reflection
from ggrc.models import relationship
from ggrc.models import review


class Program(review.Reviewable,
              mixins.CustomAttributable,
              object_document.PublicDocumentable,
              roleable.Roleable,
              object_person.Personable,
              relationship.Relatable,
              context.HasOwnContext,
              mixins.LastDeprecatedTimeboxed,
              mixins.base.ContextRBAC,
              mixins.BusinessObject,
              mixins.Folderable,
              ft_mixin.Indexed,
              db.Model):
  """Representation for Program model."""
  __tablename__ = 'programs'

  KINDS = ['Directive']
  KINDS_HIDDEN = ['Company Controls Policy']

  kind = deferred.deferred(db.Column(db.String), 'Program')

  audits = db.relationship(
      'Audit', backref='program', cascade='all, delete-orphan')

  _api_attrs = reflection.ApiAttributes(
      'kind',
      reflection.Attribute('audits', create=False, update=False),
      reflection.Attribute('risk_assessments', create=False, update=False),
  )
  _include_links = []
  _aliases = {
      "documents_file": None,
      "owners": None
  }

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Program, cls).eager_query()
    return cls.eager_inclusions(query, Program._include_links).options(
        orm.subqueryload('audits'),
        orm.subqueryload('risk_assessments'),
    )
