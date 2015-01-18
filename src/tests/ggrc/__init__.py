# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

from flask.ext.testing import TestCase as BaseTestCase
from ggrc import db
from ggrc.app import app
from ggrc.models import create_db, drop_db
from ggrc import settings

class TestCase(BaseTestCase):
  def setUp(self):
    pass
    #db.engine.execute("DROP DATABASE IF EXISTS ggrcdevtest;")
    #db.engine.execute("CREATE DATABASE ggrcdevtest;")
    #create_db(True, quiet=True)
    # if getattr(settings, 'MEMCACHE_MECHANISM', False) is True:
    #   from google.appengine.api import memcache
    #   from google.appengine.ext import testbed
    #   self.testbed = testbed.Testbed()
    #   self.testbed.activate()
    #   self.testbed.init_memcache_stub()

  def tearDown(self):
    pass
    #db.session.remove()
    #db.engine.execute("DROP DATABASE ggrcdevtest; CREATE DATABASE ggrcdevtest;")
    # if getattr(settings, 'MEMCACHE_MECHANISM', False) is True:
    #   from google.appengine.api import memcache
    #   from google.appengine.ext import testbed
    #   self.testbed.deactivate()

  def create_app(self):
    app.testing = True
    app.debug = False
    return app
