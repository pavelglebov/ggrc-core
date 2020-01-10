/*
  Copyright (C) 2020 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import loDifference from 'lodash/difference';
import {
  getUrl,
  getMappingUrl,
  getUnmappingUrl,
  isMappableExternally,
} from '../utils/ggrcq-utils';
import {
  businessObjects,
  scopingObjects,
  externalDirectiveObjects,
} from '../../plugins/models-types-collections';
import {makeFakeInstance} from '../../../js_specs/spec-helpers';
import Cacheable from '../../models/cacheable';
import Control from '../../models/business-models/control';
import Risk from '../../models/business-models/risk';
import Standard from '../../models/business-models/standard';
import TechnologyEnvironment
  from '../../models/business-models/technology-environment';

describe('GGRCQ utils', () => {
  let originalIntegrationUrl;

  beforeAll(() => {
    originalIntegrationUrl = GGRC.GGRC_Q_INTEGRATION_URL;
    GGRC.GGRC_Q_INTEGRATION_URL = originalIntegrationUrl ||
      'http://example.com/';
  });

  afterAll(() => {
    GGRC.GGRC_Q_INTEGRATION_URL = originalIntegrationUrl;
  });

  describe('isMappableExternally util', () => {
    it('should return True if map scope object to directive', () => {
      scopingObjects.forEach((source) => {
        externalDirectiveObjects.forEach((destination) => {
          const srcModel = {model_singular: source};
          const dstModel = {model_singular: destination};

          expect(isMappableExternally(srcModel, dstModel)).toBeTruthy();
        });
      });
    });

    it('should return True if map directive object to scope', () => {
      externalDirectiveObjects.forEach((source) => {
        scopingObjects.forEach((destination) => {
          const srcModel = {model_singular: source};
          const dstModel = {model_singular: destination};

          expect(isMappableExternally(srcModel, dstModel)).toBeTruthy();
        });
      });
    });

    it('should return False if map scope object to any non-directive', () => {
      scopingObjects.forEach((source) => {
        loDifference(businessObjects, externalDirectiveObjects).forEach(
          (destination) => {
            const srcModel = {model_singular: source};
            const dstModel = {model_singular: destination};

            expect(isMappableExternally(srcModel, dstModel)).toBeFalsy();
          });
      });
    });

    it('should return False if map directive object to any non-scope', () => {
      externalDirectiveObjects.forEach((source) => {
        loDifference(businessObjects, scopingObjects).forEach(
          (destination) => {
            const srcModel = {model_singular: source};
            const dstModel = {model_singular: destination};

            expect(isMappableExternally(srcModel, dstModel)).toBeFalsy();
          });
      });
    });
  });

  describe('getUrl util', () => {
    it('should return url', () => {
      const options = {
        model: 'control',
        path: 'control',
        slug: 'control-1',
        view: 'info',
        params: 'types=org_group',
      };

      let url = GGRC.GGRC_Q_INTEGRATION_URL +
        'control/control=control-1/info?types=org_group';
      expect(getUrl(options)).toBe(url);
    });

    it('should return url without view path', () => {
      const options = {
        model: 'control',
        path: 'questionnaires',
        slug: 'control-1',
        params: 'types=org_group',
      };

      let url = GGRC.GGRC_Q_INTEGRATION_URL +
        'questionnaires/control=control-1?types=org_group';
      expect(getUrl(options)).toBe(url);
    });

    it('should return url without params', () => {
      const options = {
        model: 'control',
        path: 'control',
        slug: 'control-1',
        view: 'info',
      };

      expect(getUrl(options))
        .toBe(`${GGRC.GGRC_Q_INTEGRATION_URL}control/control=control-1/info`);
    });

    it('should return url with path only', () => {
      const options = {
        path: 'import',
      };

      expect(getUrl(options))
        .toBe(`${GGRC.GGRC_Q_INTEGRATION_URL}import`);
    });
  });

  describe('getMappingUrl util', () => {
    it('should return empty string ' +
      'if neither source not destination is changeable externally', () => {
      let instance = makeFakeInstance({model: Cacheable})();
      let model = Cacheable;

      let url = getMappingUrl(instance, model);
      expect(url).toBe('');
    });

    it('should return url to map directive to external object', () => {
      let instance = makeFakeInstance({model: Control, instanceProps: {
        type: 'Control',
        slug: 'CONTROL-1',
      }})();
      let model = Standard;

      let result = getMappingUrl(instance, model);
      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'controls/control=control-1/directives' +
        '?mappingStatus=in_progress,not_in_scope,reviewed&type=standard';
      expect(result).toBe(expected);
    });

    it('should return url to map scope object to external object', () => {
      let instance = makeFakeInstance({model: Control, instanceProps: {
        type: 'Control',
        slug: 'CONTROL-1',
      }})();

      let model = TechnologyEnvironment;

      let result = getMappingUrl(instance, model);
      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'controls/control=control-1/scope' +
        '?mappingStatus=in_progress,not_in_scope,reviewed' +
        '&types=technology_environment';
      expect(result).toBe(expected);
    });

    it('should return url to map external object to directive', () => {
      let instance = makeFakeInstance({model: Standard})({
        type: 'Standard',
        slug: 'STANDARD-1',
      });
      let model = Control;
      let result = getMappingUrl(instance, model);
      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'directives/standard=standard-1/controls' +
        '?mappingStatus=in_progress,not_in_scope,reviewed';
      expect(result).toBe(expected);
    });

    it('should return url to map external object to scope object', () => {
      let instance = makeFakeInstance({model: TechnologyEnvironment})({
        type: 'TechnologyEnvironment',
        slug: 'TechnologyEnvironment-1',
      });
      let model = Control;
      let result = getMappingUrl(instance, model);
      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'questionnaires/technology_environment=technologyenvironment-1' +
        '/controls?mappingStatus=in_progress,not_in_scope,reviewed';
      expect(result).toBe(expected);
    });

    it('should return url to map scope object to directive', () => {
      let instance = makeFakeInstance({model: TechnologyEnvironment})({
        type: 'TechnologyEnvironment',
        slug: 'TechnologyEnvironment-1',
      });

      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'questionnaires/technology_environment=technologyenvironment-1' +
        '/map-objects?mappingStatus=in_progress,not_in_scope,reviewed' +
        '&type=standard';
      expect(getMappingUrl(instance, Standard)).toBe(expected);
    });

    it('should return url to map directive to scope object', () => {
      let instance = makeFakeInstance({model: Standard})({
        type: 'Standard',
        slug: 'STANDARD-1',
      });

      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'directives/standard=standard-1/applicable-scope' +
        '?mappingStatus=in_progress,not_in_scope,reviewed' +
        '&types=technology_environment';
      expect(getMappingUrl(instance, TechnologyEnvironment)).toBe(expected);
    });

    it('should return url with path only', () => {
      const options = {
        path: 'import',
      };

      expect(getUrl(options))
        .toBe(`${GGRC.GGRC_Q_INTEGRATION_URL}import`);
    });

    it('should return url to map external object 1 to external object 2',
      () => {
        let externalObject1 = makeFakeInstance({model: Control,
          instanceProps: {
            type: 'Control',
            slug: 'CONTROL-1',
          }})();
        let externalModel = Risk;

        let result = getMappingUrl(externalObject1, externalModel);
        let expected = GGRC.GGRC_Q_INTEGRATION_URL +
          'controls/control=control-1/risks' +
          '?mappingStatus=in_progress,not_in_scope,reviewed';
        expect(result).toBe(expected);
      });
  });

  describe('getUnmappingUrl util', () => {
    it('should return empty string ' +
      'if neither source not destination is changeable externally', () => {
      let instance = makeFakeInstance({model: Cacheable})();
      let model = Cacheable;

      let url = getUnmappingUrl(instance, model);
      expect(url).toBe('');
    });

    it('should return url to unmap external object from directive', () => {
      let instance = makeFakeInstance({model: Control, instanceProps: {
        type: 'Control',
        slug: 'CONTROL-1',
      }})();
      let model = Standard;

      let result = getUnmappingUrl(instance, model);
      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'controls/control=control-1/directives' +
        '?mappingStatus=in_progress,reviewed&type=standard';
      expect(result).toBe(expected);
    });

    it('should return url to unmap external object from scope object', () => {
      let instance = makeFakeInstance({model: Control, instanceProps: {
        type: 'Control',
        slug: 'CONTROL-1',
      }})();

      let model = TechnologyEnvironment;

      let result = getUnmappingUrl(instance, model);
      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'controls/control=control-1/scope' +
        '?mappingStatus=in_progress,reviewed&types=technology_environment';
      expect(result).toBe(expected);
    });

    it('should return url to unmap directive from external object', () => {
      let instance = makeFakeInstance({model: Standard})({
        type: 'Standard',
        slug: 'STANDARD-1',
      });
      let model = Control;
      let result = getUnmappingUrl(instance, model);
      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'directives/standard=standard-1/controls' +
        '?mappingStatus=in_progress,reviewed';
      expect(result).toBe(expected);
    });

    it('should return url to unmap scope object from control', () => {
      let instance = makeFakeInstance({model: TechnologyEnvironment})({
        type: 'TechnologyEnvironment',
        slug: 'TechnologyEnvironment-1',
      });
      let model = Control;
      let result = getUnmappingUrl(instance, model);
      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'questionnaires/technology_environment=technologyenvironment-1' +
        '/controls?mappingStatus=in_progress,reviewed';
      expect(result).toBe(expected);
    });

    it('should return url to unmap scope object from directive', () => {
      let instance = makeFakeInstance({model: TechnologyEnvironment})({
        type: 'TechnologyEnvironment',
        slug: 'TechnologyEnvironment-1',
      });

      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'questionnaires/technology_environment=technologyenvironment-1' +
        '/map-objects?mappingStatus=in_progress,reviewed&type=standard';
      expect(getUnmappingUrl(instance, Standard)).toBe(expected);
    });

    it('should return url to unmap directive from scope object', () => {
      let instance = makeFakeInstance({model: Standard})({
        type: 'Standard',
        slug: 'STANDARD-1',
      });

      let expected = GGRC.GGRC_Q_INTEGRATION_URL +
        'directives/standard=standard-1/applicable-scope' +
        '?mappingStatus=in_progress,reviewed&types=technology_environment';
      expect(getUnmappingUrl(instance, TechnologyEnvironment)).toBe(expected);
    });
  });
});
