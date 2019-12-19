/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import {
  externalBusinessObjects,
  externalDirectiveObjects,
  scopingObjects,
} from '../../plugins/models-types-collections';
import {isSnapshot} from './snapshot-utils';

/**
 * Util methods for integration with GGRCQ.
 */

/**
 * Determine whether model type could have mapped questions.
 * @param {Object} instance - The model instance
 * @return {Boolean} True or False
 */
function hasQuestions(instance) {
  return instance &&
    instance.constructor &&
    instance.constructor.isQuestionnaireable;
}

/**
 * Determine whether model type is changeable externally.
 * @param {Object} instance - The model instance
 * @return {Boolean} True or False
 */
function isChangeableExternally(instance) {
  return instance &&
    instance.constructor &&
    instance.constructor.isChangeableExternally;
}

/**
 * Determine whether model type is mappable externally.
 * @param {Object} source - Source model
 * @param {Object} destination - Destination model
 * @return {Boolean} True or False
 */
function isMappableExternally(source, destination) {
  return (
    (externalDirectiveObjects.includes(source.model_singular) &&
    scopingObjects.includes(destination.model_singular)) ||
    (scopingObjects.includes(source.model_singular) &&
    externalDirectiveObjects.includes(destination.model_singular))
  );
}
/**
 * Determine whether instance is proposable externally.
 * @param {*} instance the model instance
 * @return {Boolean} true or false
 */
function isProposableExternally(instance) {
  return (
    instance.constructor.isProposable &&
    isChangeableExternally(instance) &&
    !isSnapshot(instance)
  );
}

/**
 * Get url to questionnaire
 * @param {Object} options - The url options
 * @param {String} options.model - The model name
 * @param {String} options.path - The questionnaire path
 * @param {String} options.slug - The model slug
 * @param {String} options.view - The view path
 * @param {String} options.params - Additional url params
 * @return {String} Url to questions
 */
function getUrl({model, path, slug, view, params}) {
  let url = GGRC.GGRC_Q_INTEGRATION_URL;
  if (!url) {
    return '';
  }
  if (!url.endsWith('/')) {
    url += '/';
  }

  let modelParams = '';

  if (model && slug) {
    model = model.toLowerCase();
    slug = slug.toLowerCase();
    modelParams = `/${model}=${slug}`;
  }

  path = path ? path.toLowerCase() : '';
  view = view ? `/${view}` : '';
  params = params ? `?${params}` : '';

  return `${url}${path}${modelParams}${view}${params}`;
}

/**
 * Get url to page with questions
 * @param {Object} instance - The model instance
 * @return {String} Url to questions
 */
function getQuestionsUrl(instance) {
  return getUrl({
    model: instance.constructor.table_singular,
    path: 'questionnaires',
    slug: instance.slug,
  });
}

/**
 * Get url to info view
 * @param {Object} instance - The model instance
 * @return {String} Url to info view
 */
function getInfoUrl(instance) {
  return getUrl({
    model: instance.constructor.table_singular,
    path: instance.constructor.table_plural,
    slug: instance.slug,
    view: 'info',
  });
}

/**
 * Get url to comment form
 * @param {Object} instance - The model instance
 * @return {String} Url to comment form
 */
function getCommentFormUrl(instance) {
  return getUrl({
    model: instance.constructor.table_singular,
    path: instance.constructor.table_plural,
    slug: instance.slug,
    view: 'info',
    params: 'comments=open',
  });
}

/**
 * Get url to review view
 * @param {Object} instance - The model instance
 * @return {String} Url to review view
 */
function getReviewUrl(instance) {
  return getUrl({
    model: instance.constructor.table_singular,
    path: instance.constructor.table_plural,
    slug: instance.slug,
    view: 'review',
  });
}

/**
 * Get url to import page
 * @return {String} Url to import page
 */
function getImportUrl() {
  return getUrl({
    path: 'import',
  });
}

/**
 * Get url to proposals view
 * @param {Object} instance - The model instance
 * @return {String} Url to proposals view
 */
function getProposalsUrl(instance) {
  return getUrl({
    model: instance.constructor.table_singular,
    path: instance.constructor.table_plural,
    slug: instance.slug,
    view: 'proposals',
  });
}

/**
 * Get url to change log view
 * @param {Object} instance - The model instance
 * @return {String} Url to change log view
 */
function getChangeLogUrl(instance) {
  return getUrl({
    model: instance.constructor.table_singular,
    path: instance.constructor.table_plural,
    slug: instance.slug,
    view: 'change-log',
  });
}

/**
 * Get urls for for external objects
 * @param {object} instance - The model instance
 * @param {object} destinationModel - Destination model
 * @param {string} statuses - Required statuses list (comma separated)
 * @return {string} Redirection url
 */
function getMapUrl(instance, destinationModel, statuses) {
  if (isChangeableExternally(instance)) {
    return getMapObjectToExternalObjectUrl(
      instance,
      destinationModel,
      statuses,
    );
  } else if (destinationModel.isChangeableExternally) {
    return getMapExternalObjectToObjectUrl(
      instance,
      destinationModel.table_plural,
      statuses
    );
  } else if (isMappableExternally(instance.constructor, destinationModel)) {
    return getMapObjectsExternallyUrl(
      instance,
      destinationModel,
      statuses
    );
  }

  return '';
}

/**
 * Get url to mapping view
 * @param {Object} instance - The model instance
 * @param {Object} destinationModel - The destination model
 * @return {String} Url to mapping view
 * */
function getMappingUrl(instance, destinationModel) {
  const statuses = 'in_progress,not_in_scope,reviewed';

  return getMapUrl(instance, destinationModel, statuses);
}

/**
 * Get url to unmapping view
 * @param {Object} instance - The model instance
 * @param {Object} destinationModel - The destination model
 * @return {String} Url to unmapping view
 */
function getUnmappingUrl(instance, destinationModel) {
  const statuses = 'in_progress,reviewed';

  return getMapUrl(instance, destinationModel, statuses);
}

/**
 * Get url to mapping view for external objects
 * @param {Object} instance - The model instance
 * @param {Object} destinationModel - The destination model
 * @param {String} statuses - Required statuses list (comma separated)
 * @return {String} Url
 */
function getMapObjectToExternalObjectUrl(instance, destinationModel, statuses) { // eslint-disable-line
  let view = '';
  let useUrlTypes = true;

  if (externalDirectiveObjects.includes(destinationModel.model_singular)) {
    view = 'directives';
  } else if (scopingObjects.includes(destinationModel.model_singular)) {
    view = 'scope';
  } else if (
    externalBusinessObjects.includes(destinationModel.model_singular)
  ) {
    view = destinationModel.table_plural;
    useUrlTypes = false;
  }

  const destinationType = destinationModel.table_singular;
  const params = `mappingStatus=${statuses}` + (useUrlTypes
    ? `&types=${destinationType}`
    : ''
  );

  const path = scopingObjects.includes(instance.constructor.model_singular) ?
    'questionnaires' : instance.constructor.table_plural;

  return getUrl({
    path: path,
    model: instance.constructor.table_singular,
    slug: instance.slug,
    view,
    params,
  });
}

/**
 * Get url to external object mapping view for selected object
 * @param {object} instance - The model instance
 * @param {string} view - View parameter for url
 * @param {string} statuses - Required statuses list (comma separated)
 * @param {string} types - Required types list (comma separated)
 * @return {string} Url
 */
function getMapExternalObjectToObjectUrl(instance, view, statuses, types) { // eslint-disable-line id-length
  let path = '';
  const sourceType = instance.constructor.model_singular;
  if (externalDirectiveObjects.includes(sourceType)) {
    path = 'directives';
  } else if (scopingObjects.includes(sourceType)) {
    path = 'questionnaires';
  }

  const params = `mappingStatus=${statuses}` + (types ? `&types=${types}`: '');

  return getUrl({
    path,
    model: instance.constructor.table_singular,
    slug: instance.slug,
    view,
    params,
  });
}

/**
 * Get url to external object mapping view for selected object
 * @param {object} instance - The source instance
 * @param {Object} destinationModel - The destination model
 * @param {string} statuses - Required statuses list (comma separated)
 * @return {string} Url
 */
function getMapObjectsExternallyUrl(instance, destinationModel, statuses) { // eslint-disable-line
  let view = '';
  if (scopingObjects.includes(destinationModel.model_singular)) {
    view = 'applicable-scope';
  } else if (
    externalDirectiveObjects.includes(destinationModel.model_singular)) {
    view = 'map-objects';
  }

  return getMapExternalObjectToObjectUrl(
    instance, view, statuses, destinationModel.table_singular);
}

/**
 * Get url to create new object
 * @param {Object} model - The object model
 * @return {String} Url to create new object
 */
function getCreateObjectUrl(model) {
  return getUrl({
    path: model.table_plural,
    params: 'action=create',
  });
}

/**
* Get url to instance's attribute
* @param {Object} instance - The model instance
* @param {String} attributeName - Name of attribute
* @param {Boolean} isCustomAttribute - Flag, which defines, is attribute
* custom or not.
* @return {String} Url to attribute
*/
function getProposalAttrUrl(
  instance,
  attributeName,
  isCustomAttribute,
) {
  return getUrl({
    model: instance.constructor.table_singular,
    path: instance.constructor.table_plural,
    slug: instance.slug,
    view: 'info',
    params: `${isCustomAttribute
      ? 'proposalAttribute'
      : 'proposal'
    }=${attributeName}`,
  });
}

export {
  hasQuestions,
  isChangeableExternally,
  isMappableExternally,
  getCommentFormUrl,
  getQuestionsUrl,
  getImportUrl,
  getInfoUrl,
  getReviewUrl,
  getMappingUrl,
  getUnmappingUrl,
  getCreateObjectUrl,
  getUrl,
  getProposalsUrl,
  getChangeLogUrl,
  getProposalAttrUrl,
  isProposableExternally,
};
