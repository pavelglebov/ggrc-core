# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Issue API resource optimization."""

from ggrc.services import common


class IssueResource(common.ExtendedResource):
  """Resource handler for issues."""

  def get(self, *args, **kwargs):
    # This is to extend the get request for additional data.
    # pylint: disable=arguments-differ
    command_map = {
        None: super(IssueResource, self).get,
        "snapshot_counts": self.snapshot_counts_query,
    }
    command = kwargs.pop("command", None)
    if command not in command_map:
      self.not_found_response()
    return command_map[command](*args, **kwargs)
