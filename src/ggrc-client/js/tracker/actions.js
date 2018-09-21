/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

// Timing Category in Google Analytics Timing API
export const FOCUS_AREAS = {
  ASSESSMENT: 'Assessment',
  AUDIT: 'Audit',
  RELATED_ASSESSMENTS: 'Related Assessments',
  SNAPSHOTS: 'Snapshots',
  IMPORT_AND_EXPORT: 'Import/Export',
  LHN: 'LHN',
  MAPPINGS: (type) => `Mappings to ${type}`,
  COUNTS: 'Counts of Objects',
};

// Timing Variable in Google Analytics Timing API
export const USER_JOURNEY_KEYS = {
  LOADING: 'Loading',
  NAVIGATION: 'Navigation',
  ATTACHMENTS: 'Attachments',
  TREEVIEW: 'TreeView',
  MAP_OBJECTS: (type) => `Mapped type: ${type}`,
  API: 'API Methods',
  INFO_PANE: 'Info Pane',
};

// Timing Label in Google Analytics Timing API
export const USER_ACTIONS = {
  CREATE_OBJECT: (count) => `Creating new object(s): ${count}`,
  UPDATE_OBJECT: 'Updating object',
  LOAD_OBJECT: 'Loading object',
  MAPPING_OBJECTS: (count) => `Mapping objects: ${count}`,
  ADD_ATTACHMENT: (count) => `Attachment of ${count} file(s)`,
  ADD_ATTACHMENT_TO_FOLDER: (count) =>
    `Attachment to folder of ${count} file(s)`,
  ADVANCED_SEARCH_FILTER: 'Advanced search filter',
  CHANGE_LOG: 'Loading of Change Log',
  API: {
    COUNTS_MY_WORK: 'Loading counts for My Work page',
    COUNTS_ALL_OBJECTS: 'Loading counts for All Objects page',
    TASKS_COUNT: 'Loading counts for Tasks',
    SNAPSHOTS_COUNT: 'Loading snapshots count for Audit',
  },
  TREEVIEW: {
    FILTER: 'Tree view filter',
    TREE_VIEW_PAGE_LOADING:
      (pageSize) => `Loading of tree view page with ${pageSize} items`,
    SUB_TREE_LOADING: 'Loading sub-level of tree view',
  },
  INFO_PANE: {
    OPEN_INFO_PANE: 'Open Info pane',
    ADD_COMMENT_TO_LCA: 'Adding a comment to LCA value',
    ADD_COMMENT: 'Adding a comment',
  },
  LHN: {
    SHOW_LIST: 'LHN: Show list of items',
    SHOW_MORE: 'LHN: Show more items for the list',
    SEARCH: (area) => `LHN search in ${area}`,
  },
  ASSESSMENT: {
    OPEN_ASMT_GEN_MODAL: 'Open Assessment Generation modal',
    CHANGE_STATUS: 'Changing status of Assessment',
    EDIT_LCA: 'Editing Local CA',
    RELATED_ASSESSMENTS: 'Loading Related Assessments',
    RELATED_OBJECTS: 'Loading objects related to Assessment',
  },
  CYCLE_TASK: {
    CHANGE_STATUS: 'Changing status of Task',
    BULK_UPDATE: 'Bulk update',
    ADD_COMMENT: 'Adding a comment',
  },
};
