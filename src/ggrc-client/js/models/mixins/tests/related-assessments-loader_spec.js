/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import {makeFakeInstance} from '../../../../js_specs/spec_helpers';

const ENDPOINT = '/api/related_assessments';

describe('relatedAssessmentsLoader mixin', () => {
  beforeEach(() => {
    spyOn($, 'get');
  });

  describe('for Assessment model', () => {
    it('should contain getRelatedAssessments method', () => {
      const model = makeFakeInstance({model: CMS.Models.Assessment})({});

      expect(model.getRelatedAssessments).toBeTruthy();
    });
  });

  describe('for Control model', () => {
    it('should contain getRelatedAssessments method', () => {
      const model = makeFakeInstance({model: CMS.Models.Control})({});

      expect(model.getRelatedAssessments).toBeTruthy();
    });
  });

  describe('for Objective model', () => {
    it('should contain getRelatedAssessments method', () => {
      const model = makeFakeInstance({model: CMS.Models.Objective})({});

      expect(model.getRelatedAssessments).toBeTruthy();
    });
  });

  describe('for Snapshot model', () => {
    it('should build correct response', () => {
      const model = makeFakeInstance({model: CMS.Models.Control})({
        id: 1,
        type: 'Control',
        snapshot: {
          child_type: 'Control',
          child_id: 13,
          type: 'Snapshot',
        },
      });

      model.getRelatedAssessments();

      expect($.get).toHaveBeenCalledWith(ENDPOINT, {
        object_id: 13,
        object_type: 'Control',
        limit: '0,5',
      });
    });
  });

  describe('for other models', () => {
    it('should not contain getRelatedAssessments method', () => {
      const audit = makeFakeInstance({model: CMS.Models.Audit})({});
      const program = makeFakeInstance({model: CMS.Models.Program})({});
      const reg = makeFakeInstance({model: CMS.Models.Regulation})({});
      const system = makeFakeInstance({model: CMS.Models.System})({});
      const issue = makeFakeInstance({model: CMS.Models.Issue})({});
      const requirement = makeFakeInstance({model: CMS.Models.Requirement})({});

      expect(audit.getRelatedAssessments).toBeFalsy();
      expect(program.getRelatedAssessments).toBeFalsy();
      expect(reg.getRelatedAssessments).toBeFalsy();
      expect(system.getRelatedAssessments).toBeFalsy();
      expect(issue.getRelatedAssessments).toBeFalsy();
      expect(requirement.getRelatedAssessments).toBeFalsy();
    });
  });

  describe('when model is Assessment', () => {
    let fakeAssessmentCreator;

    beforeEach(function () {
      fakeAssessmentCreator = makeFakeInstance({model: CMS.Models.Assessment});
    });


    it('should send default limit as "0,5"', () => {
      const model = fakeAssessmentCreator({id: 1, type: 'Assessment'});

      model.getRelatedAssessments();

      expect($.get).toHaveBeenCalledWith(ENDPOINT, {
        object_id: 1,
        object_type: 'Assessment',
        limit: '0,5',
      });
    });

    it('should send correct limit values', () => {
      const model = fakeAssessmentCreator({id: 1, type: 'Assessment'});

      model.getRelatedAssessments([0, 10]);

      expect($.get).toHaveBeenCalledWith(ENDPOINT, {
        object_id: 1,
        object_type: 'Assessment',
        limit: '0,10',
      });
    });

    it('should send correct order_by value', () => {
      const model = fakeAssessmentCreator({id: 1, type: 'Assessment'});

      model.getRelatedAssessments([0, 10], [{field: 'foo', direction: 'asc'}]);

      expect($.get).toHaveBeenCalledWith(ENDPOINT, {
        object_id: 1,
        object_type: 'Assessment',
        limit: '0,10',
        order_by: 'foo,asc',
      });
    });

    it('should send correct order_by value for multiple fields', () => {
      const model = fakeAssessmentCreator({id: 1, type: 'Assessment'});

      model.getRelatedAssessments([0, 10], [
        {field: 'foo', direction: 'asc'},
        {field: 'bar', direction: 'desc'},
      ]);

      expect($.get).toHaveBeenCalledWith(ENDPOINT, {
        object_id: 1,
        object_type: 'Assessment',
        limit: '0,10',
        order_by: 'foo,asc,bar,desc',
      });
    });
  });
});
