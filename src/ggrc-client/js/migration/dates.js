/*
    Copyright (C) 2020 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

const dates = {
  control: '03/26/2019',
  risk: '06/13/2019',
  scope: '02/24/2020',
};

/**
 * @param {String} type - The model root_object or 'scope'
 * @return {String} Migration date or empty string
 */
export const getMigrationDate = (type) => {
  return dates[type];
};
