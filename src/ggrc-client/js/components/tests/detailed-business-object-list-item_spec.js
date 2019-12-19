/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {getComponentVM} from '../../../js_specs/spec-helpers';
import Component from '../object-list-item/detailed-business-object-list-item';

describe('detailed-business-object-list-item component', function () {
  'use strict';

  const snapshotParentTitle = 'Control title #1';
  const snapshotParentUrl = '/controls/55';
  const objectiveObjectTitle = 'Objective title 123';
  const objectiveObjectLink = '/objectives/33';
  const controlVisibleRoles = [
    'Admin', 'Control Operators', 'Control Owners', 'Other Contacts',
  ];
  const defaultVisibleRoles = [
    'Admin', 'Primary Contacts', 'Secondary Contacts',
  ];

  let snapshotObject = {
    selfLink: '/api/snapshots/123',
    viewLink: '/snapshots/123',
    type: 'Snapshot',
    child_id: 55,
    child_type: 'Control',
    revision: {
      content: {
        title: snapshotParentTitle,
      },
    },
  };

  let objectiveObject = {
    selfLink: '/api/objectives/33',
    viewLink: objectiveObjectLink,
    type: 'Objective',
    title: objectiveObjectTitle,
    id: 33,
  };

  let controlObject = {
    selfLink: '/api/controls/12',
    viewLink: '/controls/12',
    type: 'Control',
    title: 'Control title12',
    id: 12,
  };

  describe('objectLink property', function () {
    let viewModel;

    beforeEach(function () {
      viewModel = getComponentVM(Component);
    });

    it('check objectLink of Objective object', function () {
      viewModel.attr('instance', objectiveObject);
      expect(viewModel.attr('objectLink')).toEqual(objectiveObjectLink);
    });

    it('check objectLink of Snapshot object', function () {
      viewModel.attr('instance', snapshotObject);
      expect(viewModel.attr('objectLink')).toEqual(snapshotParentUrl);
    });
  });

  describe('objectTitle property', function () {
    let viewModel;

    beforeEach(function () {
      viewModel = getComponentVM(Component);
    });

    it('check objectTitle of Objective object', function () {
      viewModel.attr('instance', objectiveObject);
      expect(viewModel.attr('objectTitle')).toEqual(objectiveObjectTitle);
    });

    it('check objectTitle of Snapshot object', function () {
      viewModel.attr('instance', snapshotObject);
      expect(viewModel.attr('objectTitle')).toEqual(snapshotParentTitle);
    });
  });

  describe('visibleRoles property', function () {
    let viewModel;

    beforeEach(function () {
      viewModel = getComponentVM(Component);
    });

    it('returns correct roles for Control object', function () {
      viewModel.attr('instance', controlObject);
      expect(viewModel.attr('visibleRoles'))
        .toEqual(controlVisibleRoles);
    });

    it('returns default roles for not Control object', function () {
      viewModel.attr('instance', objectiveObject);
      expect(viewModel.attr('visibleRoles')).toEqual(defaultVisibleRoles);
    });
  });
});
