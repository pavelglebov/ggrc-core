# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Snapshot API resource extension."""
from collections import defaultdict
from werkzeug import exceptions

from ggrc.services import common
from ggrc import utils
from ggrc.utils import referenced_objects


class SnapshotResource(common.ExtendedResource):
  """Resource handler for Snapshot."""

  # method post is abstract and not used.
  # pylint: disable=abstract-method

  def get(self, *args, **kwargs):
    # This is to extend the get request for additional data.
    # pylint: disable=arguments-differ
    command_map = {
        None: super(SnapshotResource, self).get,
        "related_objects": self.related_objects,
    }
    return self._process_request(command_map, *args, **kwargs)

  def related_objects(self, id):
    """Get data for snapshot related_objects page."""
    # id name is used as a kw argument and can't be changed here
    # pylint: disable=invalid-name,redefined-builtin
    from ggrc import models
    from ggrc.rbac import permissions
    snapshot = models.Snapshot.query.get(id)
    if snapshot is None:
      return self.not_found_response()
    if not permissions.is_allowed_read_for(snapshot):
      raise exceptions.Forbidden()

    data = defaultdict(list)
    for obj in snapshot.related_objects():
      obj_data = _stub(obj)
      if obj.type == "Snapshot":
        child = referenced_objects.get(obj.child_type, obj.child_id)
        obj_data.update({
            "child": _stub(child),
            "revision:": {
                "content": {
                    "title": obj.revision.content.get("title", ""),
                    "updated_at": obj.revision.content.get("updated_at", "")}}
        })
      data[obj.type].append(obj_data)
    return self.json_success_response(data, )


def _stub(obj):
  """Returns stub of object"""
  data = {
      "viewLink": utils.view_url_for(obj),
      "selfLink": utils.url_for(obj),
      "id": obj.id,
      "type": obj.type,
  }
  if hasattr(obj, "title"):
    data.update({"title": obj.title})
  return data
