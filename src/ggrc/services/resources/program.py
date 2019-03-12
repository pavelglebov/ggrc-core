# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Program API resource extension."""
from werkzeug import exceptions

from ggrc.services import common
from ggrc import models


class ProgramResource(common.ExtendedResource):
  """Resource handler for Program."""

  # method post, patch is abstract and not used.
  # pylint: disable=abstract-method

  def get(self, *args, **kwargs):
    # This is to extend the get request for additional data.
    # pylint: disable=arguments-differ
    command_map = {
        None: super(ProgramResource, self).get,
        "child_programs": self.child_programs,
        "parent_programs": self.parent_programs,
    }
    return self._process_request(command_map, *args, **kwargs)

  def child_programs(self, id):
    """Get data for Program child_programs command."""
    # pylint: disable=invalid-name,redefined-builtin
    from ggrc.rbac import permissions
    program = models.Program.query.get(id)
    if program is None:
      return self.not_found_response()
    if not permissions.is_allowed_read_for(program):
      raise exceptions.Forbidden()
    data = program.children()
    return self.json_success_response(data)

  def parent_programs(self, id):
    """Get data for Program parent_programs command."""
    # pylint: disable=invalid-name,redefined-builtin
    from ggrc.rbac import permissions
    program = models.Program.query.get(id)
    if program is None:
      return self.not_found_response()
    if not permissions.is_allowed_read_for(program):
      raise exceptions.Forbidden()
    data = program.parents()
    return self.json_success_response(data)
