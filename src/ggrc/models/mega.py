# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
"""Module for Mega mixin"""
from sqlalchemy import orm

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
    rel = relationship.Relationship
    _is_mega = db.session.query(rel.query.filter(
        rel.source_id == self.id,
        rel.source_type == self.__class__.__name__,
        rel.destination_type == self.__class__.__name__,
    ).exists()).scalar()
    return _is_mega

  def relatives_ids(self, direction):
    """Returns ids of relatives"""
    rel = relationship.Relationship
    visited = set()
    not_visited = {self.id, }
    if direction == "children":
      direction_filter = rel.source_id.in_
      not_visited_attr = "destination_id"
    elif direction == "parents":
      direction_filter = rel.destination_id.in_
      not_visited_attr = "source_id"
    else:
      raise ValueError

    while not_visited:
      child_rels = rel.query.filter(
          direction_filter(not_visited),
          rel.source_type == self.__class__.__name__,
          rel.destination_type == self.__class__.__name__,
      )
      visited.update(not_visited)
      not_visited = set((getattr(r, not_visited_attr) for r in child_rels
                         if getattr(r, not_visited_attr) not in visited))
    visited.discard(self.id)
    return visited

  def relatives(self, direction):
    return self.__class__.query.filter(
        self.__class__.id.in_(self.relatives_ids(direction))
    ).options(orm.undefer('title')).all()

  def children(self):
    """Returns object children """
    return self.relatives("children")

  def parents(self):
    """Returns object parents"""
    return self.relatives("parents")
