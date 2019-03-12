# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Module for Mega mixin"""

import sqlalchemy as sa
from sqlalchemy.ext.declarative import declared_attr

from ggrc import db
from ggrc.builder import simple_property
from ggrc.models import relationship
from ggrc.models import reflection


class Mega(object):
  """Mixin adds methods for Mega objects
  Mega objects can have mapped objects of the same type"""

  _api_attrs = reflection.ApiAttributes(
      reflection.Attribute('is_mega', create=False, update=False),
  )

  @simple_property
  def is_mega(self):
    """Returns True if object have children"""
    return bool(self._child_relationships)

  @declared_attr
  def _child_relationships(cls):  # pylint: disable=no-self-argument
    """Return relationships to children
    used to eagerly query is_mega property"""
    joinstr = (
        "and_(foreign(Relationship.source_id) == {cls_name}.id,"
        "foreign(Relationship.source_type) == '{cls_name}',"
        "foreign(Relationship.destination_type) == '{cls_name}')"
    )
    return db.relationship(
        "Relationship",
        primaryjoin=joinstr.format(cls_name=cls.__name__),
    )

  @classmethod
  def eager_query(cls):
    """Define fields to be loaded eagerly to lower the count of DB queries."""
    query = super(Mega, cls).eager_query()
    return query.options(
        sa.orm.subqueryload('_child_relationships')
    )

  def relatives_ids(self, direction, all_generations=False):
    """Returns ids of relatives"""
    rel = relationship.Relationship
    if direction == "children":
      direction_filter = rel.source_id.in_
      not_visited_attr = "destination_id"
    elif direction == "parents":
      direction_filter = rel.destination_id.in_
      not_visited_attr = "source_id"
    else:
      raise ValueError

    visited = set()
    not_visited = {self.id, }
    while not_visited:
      child_rels = rel.query.filter(
          direction_filter(not_visited),
          rel.source_type == self.__class__.__name__,
          rel.destination_type == self.__class__.__name__,
      )
      visited.update(not_visited)
      not_visited = set((getattr(r, not_visited_attr) for r in child_rels
                         if getattr(r, not_visited_attr) not in visited))
      if not all_generations:
        visited.update(not_visited)
        break
    visited.discard(self.id)
    return visited

  def relatives(self, direction, all_generations=False):
    return self.__class__.query.filter(
        self.__class__.id.in_(self.relatives_ids(direction, all_generations))
    ).options(sa.orm.undefer('title')).all()

  def children(self):
    """Returns object children """
    return self.relatives("children", all_generations=True)

  def parents(self):
    """Returns object parents"""
    return self.relatives("parents", all_generations=True)
