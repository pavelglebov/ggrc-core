/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

// import modules from '../js/mustache';

// for (let module in modules) {
//   console.log(module);
// }

import * as modules from './mustache';

import acrModalContent from
  './mustache/access_control_roles/modal_content.mustache';
import acrSubTree from './mustache/access_control_roles/subtree.mustache';
import acrTree from './mustache/access_control_roles/tree.mustache';
import acrTreeHeader from
  './mustache/access_control_roles/tree_header.mustache';
import accessGroupsModalContent from
  './mustache/access_groups/modal_content.mustache';
import atInfo from './mustache/assessment_templates/info.mustache';
import atModalContent from
  './mustache/assessment_templates/modal_content.mustache';
import atTreeAddItem from
  './mustache/assessment_templates/tree_add_item.mustache';
import asmtExtendedInfo from
  './mustache/assessments/assignable_extended_info.mustache';
import assessmentsDatesList from './mustache/assessments/dates_list.mustache';
import assessmentsHeader from './mustache/assessments/header.mustache';
import assessmentsInfo from './mustache/assessments/info.mustache';
import asmtModalContentAdtFields from
  './mustache/assessments/modal_content_additional_fields.mustache';
import assessmentsModalContent from
  './mustache/assessments/modal_content.mustache';
import assessmentsTreeAddItem from
  './mustache/assessments/tree_add_item.mustache';
import auditsDropDownMenu from './mustache/audits/dropdown_menu.mustache';
import auditsExtendedInfo from './mustache/audits/extended_info.mustache';
import auditsInfo from './mustache/audits/info.mustache';
import auditsModalContent from './mustache/audits/modal_content.mustache';
import auditsObjectCloner from './mustache/audits/object_cloner.mustache';
import auditsSearchResult from './mustache/audits/search_result.mustache';
import auditsSummary from './mustache/audits/summary.mustache';
import auditsTreeAddItem from './mustache/audits/tree_add_item.mustache';
import auditsTreeItemAttr from './mustache/audits/tree-item-attr.mustache';
import baseObjAutocompleteResult from
  './mustache/base_objects/autocomplete_result.mustache';
import baseObjConfirmArchive from
  './mustache/base_objects/confirm_archive.mustache';
import baseObjConfirmDelete from
  './mustache/base_objects/confirm_delete.mustache';
import baseObjConfirmWarning from
  './mustache/base_objects/confirm_warning.mustache';
import baseObjContacts from './mustache/base_objects/contacts.mustache';
import baseObjDashboardWidget from
  './mustache/base_objects/dashboard_widget.mustache';
import baseObjDescription from
  './mustache/base_objects/description.mustache';
import baseObjDropDownMenu from
  './mustache/base_objects/dropdown_menu.mustache';
import baseObjEditObjectLink from
  './mustache/base_objects/edit_object_link.mustache';
import baseObjEmpty from './mustache/base_objects/empty.mustache';
import baseObjExtendedInfo from
  './mustache/base_objects/extended_info.mustache';
import baseObjFormRestore from
  './mustache/base_objects/form_restore.mustache';
import baseObjGeneralPageHeader from
  './mustache/base_objects/general-page-header.mustache';
import baseObjInfoPaneUtility from
  './mustache/base_objects/info-pane-utility.mustache';
import baseObjInfo from './mustache/base_objects/info.mustache';
import baseObjMapItemDesc from
  './mustache/base_objects/mapper-item-description.mustache';
import baseObjModalContRefUrls from
  './mustache/base_objects/modal-content-reference-urls.mustache';
import baseObjNotes from './mustache/base_objects/notes.mustache';
import baseObjOpenClose from './mustache/base_objects/open_close.mustache';
import baseObjPageHeader from
  './mustache/base_objects/page_header.mustache';
import baseObjReferenceUrls from
  './mustache/base_objects/reference-urls.mustache';
import baseObjSearchActions from
  './mustache/base_objects/search_actions.mustache';
import baseObjSearchResult from
  './mustache/base_objects/search_result.mustache';
import baseObjTaskGrSubtreeFoter from
  './mustache/base_objects/task_group_subtree_footer.mustache';
import baseObjTaskGroupSubtree from
  './mustache/base_objects/task_group_subtree.mustache';
import baseObjTestPlan from './mustache/base_objects/test_plan.mustache';
import baseObjTitle from './mustache/base_objects/title.mustache';
import baseObjTreeAddItem from './mustache/base_objects/tree_add_item.mustache';
import baseObjTreeItemAttr from
  './mustache/base_objects/tree-item-attr.mustache';
import baseObjUnmap from './mustache/base_objects/unmap.mustache';
import baseObjViewLink from './mustache/base_objects/view_link.mustache';
import baseTmpMappedObj from
  './mustache/base_templates/mapped_objects.mustache';
import baseTemplatesSubtree from './mustache/base_templates/subtree.mustache';
import contractsModalContent from './mustache/contracts/modal_content.mustache';
import controlsCategoriesTree from
  './mustache/controls/categories_tree.mustache';
import controlsContacts from './mustache/controls/contacts.mustache';
import controlsInfo from './mustache/controls/info.mustache';
import controlsModalContent from './mustache/controls/modal_content.mustache';
import controlsTreeItemAttr from './mustache/controls/tree-item-attr.mustache';
import cadModalContent from
  './mustache/custom_attribute_definitions/modal_content.mustache';
import cadSubtree from
  './mustache/custom_attribute_definitions/subtree.mustache';
import cadTreeHeader from
  './mustache/custom_attribute_definitions/tree_header.mustache';
import cadTree from './mustache/custom_attribute_definitions/tree.mustache';
import caInfo from './mustache/custom_attributes/info.mustache';
import caModalContent from
  './mustache/custom_attributes/modal_content.mustache';
import ctEntriesModalContent from
  './mustache/cycle_task_entries/modal_content.mustache';
import ctEntriesTreeAddItem from
  './mustache/cycle_task_entries/tree_add_item.mustache';
import ctEntriesTree from './mustache/cycle_task_entries/tree.mustache';
import ctGrObjTasksInfo from
  './mustache/cycle_task_group_object_tasks/info.mustache';
import ctGrObjTasksModCont from
  './mustache/cycle_task_group_object_tasks/modal_content.mustache';
import ctGrObjTasksTreeAddItem from
  './mustache/cycle_task_group_object_tasks/tree_add_item.mustache';
import ctGrObjTasksTreeItemAttr from
  './mustache/cycle_task_group_object_tasks/tree-item-attr.mustache';
import ctGroupsAutocResult from
  './mustache/cycle_task_groups/autocomplete_result.mustache';
import ctGroupsExtendedInfo from
  './mustache/cycle_task_groups/extended_info.mustache';
import ctGroupsInfo from './mustache/cycle_task_groups/info.mustache';
import cycles from './mustache/cycles/info.mustache';
import dashboardInfoGetStarted from
  './mustache/dashboard/info/get_started.mustache';
import dashboardInfoInfo from './mustache/dashboard/info/info.mustache';
import dashboardInfoWfProgress from
  './mustache/dashboard/info/workflow_progress.mustache';
import dashboardInternavList from './mustache/dashboard/internav_list.mustache';
import dashboardLhnRisks from './mustache/dashboard/lhn_risks.mustache';
import dashboardLhnSearch from './mustache/dashboard/lhn_search.mustache';
import dashboardLhn from './mustache/dashboard/lhn.mustache';
import dashboardModalPreload from './mustache/dashboard/modal_preload.mustache';
import dashboardObjectList from './mustache/dashboard/object_list.mustache';
import dashboardObjectNavActions from
  './mustache/dashboard/object_nav_actions.mustache';
import dashboardObjectWidget from './mustache/dashboard/object_widget.mustache';
import dashboardRecViewedList from
  './mustache/dashboard/recently_viewed_list.mustache';
import dataAssetsModalContent from
  './mustache/data_assets/modal_content.mustache';
import directivesAutocResult from
  './mustache/directives/autocomplete_result.mustache';
import directivesTreeItemAttr from
  './mustache/directives/tree-item-attr.mustache';
import documentsInfo from './mustache/documents/info.mustache';
import documentsModalContent from './mustache/documents/modal_content.mustache';
import documentsTreeItemAttr from
  './mustache/documents/tree-item-attr.mustache';
import events from './mustache/events/object_list.mustache';
import evidenceInfo from './mustache/evidence/info.mustache';
import evidenceModalContent from './mustache/evidence/modal_content.mustache';
import evidenceTreeItemAttr from './mustache/evidence/tree-item-attr.mustache';
import facilities from './mustache/facilities/modal_content.mustache';
import gdriveAuthButton from './mustache/gdrive/auth_button.mustache';
import gdriveConfirmButtons from './mustache/gdrive/confirm_buttons.mustache';
import helpFiltersHelperContent from
  './mustache/help/filters_helper_content.mustache';
import importExport from
  './mustache/import_export/export/attribute_selector.mustache';
import issuesInfo from './mustache/issues/info.mustache';
import issuesModalContent from './mustache/issues/modal_content.mustache';
import issuesRemediationPlan from './mustache/issues/remediation_plan.mustache';
import issuesTreeAddItem from './mustache/issues/tree_add_item.mustache';
import marketsModalContent from './mustache/markets/modal_content.mustache';
import metricsModalContent from './mustache/metrics/modal_content.mustache';
import mdArchCancelButtons from
  './mustache/modals/archive_cancel_buttons.mustache';
import modalsCloseButtons from './mustache/modals/close_buttons.mustache';
import modalsConfirmButton from './mustache/modals/confirm_button.mustache';
import mdConfirmCancelButtons from
  './mustache/modals/confirm_cancel_buttons.mustache';
import modalsConfirm from './mustache/modals/confirm.mustache';
import modalsCreateProposal from './mustache/modals/create_proposal.mustache';
import modalsDeleteCancelButtons from
  './mustache/modals/delete_cancel_buttons.mustache';
import modalsDiscardButtons from './mustache/modals/discard_buttons.mustache';
import modalsDoneButtons from './mustache/modals/done_buttons.mustache';
import modalsModalCompareHeader from
  './mustache/modals/modal_compare_header.mustache';
import modalsModalHeader from './mustache/modals/modal_header.mustache';
import modalsOpenSheet from './mustache/modals/open_sheet.mustache';
import modalsPromptButtons from './mustache/modals/prompt_buttons.mustache';
import modalsRestoreRevision from './mustache/modals/restore_revision.mustache';
import modalsReviewProposal from './mustache/modals/review_proposal.mustache';
import modalsSaveCancelButtons from
  './mustache/modals/save_cancel_buttons.mustache';
import mdSaveCancelDelButtons from
  './mustache/modals/save_cancel_delete_buttons.mustache';
import objectivesAutocResult from
  './mustache/objectives/autocomplete_result.mustache';
import objectivesModalContent from
  './mustache/objectives/modal_content.mustache';
import objectivesTreeItemAttr from
  './mustache/objectives/tree-item-attr.mustache';
import orgGroupsAutocResult from
  './mustache/org_groups/autocomplete_result.mustache';
import orgGroupsModalContent from
  './mustache/org_groups/modal_content.mustache';
import partials from './mustache/partials/modal-ajax-test-plan.mustache';
import peopleAutocompleteResult from
  './mustache/people/autocomplete_result.mustache';
import peopleDropdownMenu from './mustache/people/dropdown_menu.mustache';
import peopleFilters from './mustache/people/filters.mustache';
import peopleInfo from './mustache/people/info.mustache';
import peopleMapperItemDesc from
  './mustache/people/mapper-item-description.mustache';
import peopleModalContent from './mustache/people/modal_content.mustache';
import peopleObjectList from './mustache/people/object_list.mustache';
import peopleSearchResult from './mustache/people/search_result.mustache';
import peopleTreeItemAttr from './mustache/people/tree-item-attr.mustache';
import peopleRolesBaseModal from './mustache/people_roles/base_modal.mustache';
import peopleRolesInfo from './mustache/people_roles/info.mustache';
import peopleRolesObjectDetail from
  './mustache/people_roles/object_detail.mustache';
import peopleRolesOptionColumn from
  './mustache/people_roles/option_column.mustache';
import policiesInfo from './mustache/policies/info.mustache';
import policiesModalContent from
  './mustache/policies/modal_content.mustache';
import processesInfo from './mustache/processes/info.mustache';
import processesModalContent from
  './mustache/processes/modal_content.mustache';
import productGroupsModalContent from
  './mustache/product_groups/modal_content.mustache';
import productsInfo from './mustache/products/info.mustache';
import productsModalContent from './mustache/products/modal_content.mustache';
import programsExtendedInfo from './mustache/programs/extended_info.mustache';
import programsInfo from './mustache/programs/info.mustache';
import programsModalContent from './mustache/programs/modal_content.mustache';
import programsSearchResult from './mustache/programs/search_result.mustache';
import programsTreeItemAttr from './mustache/programs/tree-item-attr.mustache';
import projectModalContent from './mustache/projects/modal_content.mustache';
import quickFormConfirmButtons from
  './mustache/quick_form/confirm_buttons.mustache';
import regulationsModalContent from
  './mustache/regulations/modal_content.mustache';
import requirementsModalContent from
  './mustache/requirements/modal_content.mustache';
import requirementsTreeItemAttr from
  './mustache/requirements/tree-item-attr.mustache';
import raInfo from './mustache/risk_assessments/info.mustache';
import raModalContent from './mustache/risk_assessments/modal_content.mustache';
import raTreeAddItem from
  './mustache/risk_assessments/tree_add_item.mustache';
import raTreeItemAttr from
  './mustache/risk_assessments/tree-item-attr.mustache';
import risksModalContent from './mustache/risks/modal_content.mustache';
import rolesObjectList from './mustache/roles/object_list.mustache';
import selectorsActiveColumn from './mustache/selectors/active_column.mustache';
import selectorsBaseModal from './mustache/selectors/base_modal.mustache';
import selectorsOptionColumn from './mustache/selectors/option_column.mustache';
import selectorsOptionDetail from './mustache/selectors/option_detail.mustache';
import snapshotsDropdownMenu from './mustache/snapshots/dropdown_menu.mustache';
import snapshotsTreeAddItem from './mustache/snapshots/tree_add_item.mustache';
import standardsModalContent from './mustache/standards/modal_content.mustache';
import systemsInfo from './mustache/systems/info.mustache';
import systemsModalContent from './mustache/systems/modal_content.mustache';
import tgtModalContent from
  './mustache/task_group_tasks/modal_content.mustache';
import tgtTaskGroupSubtree from
  './mustache/task_group_tasks/task_group_subtree.mustache';
import tgtTreeItemAttr from
  './mustache/task_group_tasks/tree-item-attr.mustache';
import tgCloneModalContent from
  './mustache/task_groups/clone_modal_content.mustache';
import tgInfo from './mustache/task_groups/info.mustache';
import tgModalContent from './mustache/task_groups/modal_content.mustache';
import tgTier2Content from './mustache/task_groups/tier2_content.mustache';
import tgTreeAddItem from './mustache/task_groups/tree_add_item.mustache';
import tgTreeItemAttr from './mustache/task_groups/tree-item-attr.mustache';
import teModalContent from
  './mustache/technology_environments/modal_content.mustache';
import threatsModalContent from './mustache/threats/modal_content.mustache';
import vendorsAutocompleteResult from
  './mustache/vendors/autocomplete_result.mustache';
import vendorsModalContent from './mustache/vendors/modal_content.mustache';
import wfCloneModalContent from
  './mustache/workflows/clone_modal_content.mustache';
import wfConfirmStartButtons from
  './mustache/workflows/confirm_start_buttons.mustache';
import workflowsConfirmStart from './mustache/workflows/confirm_start.mustache';
import workflowsExtendedInfo from './mustache/workflows/extended_info.mustache';
import workflowsInfo from './mustache/workflows/info.mustache';
import workflowsLhnSearch from './mustache/workflows/lhn_search.mustache';
import workflowsModalContent from './mustache/workflows/modal_content.mustache';
import workflowsSearchResult from './mustache/workflows/search_result.mustache';
import workflowsTreeItemAttr from
  './mustache/workflows/tree-item-attr.mustache';

GGRC.Templates = GGRC.Templates || {};
GGRC.Templates['access_control_roles/modal_content'] = acrModalContent;
GGRC.Templates['access_control_roles/tree'] = acrTree;
GGRC.Templates['access_control_roles/subtree'] = acrSubTree;
GGRC.Templates['access_control_roles/tree_header'] = acrTreeHeader;
GGRC.Templates['access_groups/modal_content'] = accessGroupsModalContent;
GGRC.Templates['assessment_templates/modal_content'] = atModalContent;
GGRC.Templates['assessment_templates/info'] = atInfo;
GGRC.Templates['assessment_templates/tree_add_item'] = atTreeAddItem;
GGRC.Templates['assessments/assignable_extended_info'] = asmtExtendedInfo;
GGRC.Templates['assessments/dates_list'] = assessmentsDatesList;
GGRC.Templates['assessments/header'] = assessmentsHeader;
GGRC.Templates['assessments/info'] = assessmentsInfo;
GGRC.Templates['assessments/modal_content_additional_fields'] =
  asmtModalContentAdtFields;
GGRC.Templates['assessments/modal_content'] = assessmentsModalContent;
GGRC.Templates['assessments/tree_add_item'] = assessmentsTreeAddItem;
GGRC.Templates['audits/dropdown_menu'] = auditsDropDownMenu;
GGRC.Templates['audits/extended_info'] = auditsExtendedInfo;
GGRC.Templates['audits/info'] = auditsInfo;
GGRC.Templates['audits/modal_content'] = auditsModalContent;
GGRC.Templates['audits/object_cloner'] = auditsObjectCloner;
GGRC.Templates['audits/search_result'] = auditsSearchResult;
GGRC.Templates['audits/summary'] = auditsSummary;
GGRC.Templates['audits/tree_add_item'] = auditsTreeAddItem;
GGRC.Templates['audits/tree-item-attr'] = auditsTreeItemAttr;
GGRC.Templates['base_objects/autocomplete_result'] = baseObjAutocompleteResult;
GGRC.Templates['base_objects/confirm_archive'] = baseObjConfirmArchive;
GGRC.Templates['base_objects/confirm_delete'] = baseObjConfirmDelete;
GGRC.Templates['base_objects/confirm_warning'] = baseObjConfirmWarning;
GGRC.Templates['base_objects/contacts'] = baseObjContacts;
GGRC.Templates['base_objects/dashboard_widget'] = baseObjDashboardWidget;
GGRC.Templates['base_objects/description'] = baseObjDescription;
GGRC.Templates['base_objects/dropdown_menu'] = baseObjDropDownMenu;
GGRC.Templates['base_objects/edit_object_link'] = baseObjEditObjectLink;
GGRC.Templates['base_objects/empty'] = baseObjEmpty;
GGRC.Templates['base_objects/extended_info'] = baseObjExtendedInfo;
GGRC.Templates['base_objects/form_restore'] = baseObjFormRestore;
GGRC.Templates['base_objects/general-page-header'] = baseObjGeneralPageHeader;
GGRC.Templates['base_objects/info-pane-utility'] = baseObjInfoPaneUtility;
GGRC.Templates['base_objects/info'] = baseObjInfo;
GGRC.Templates['base_objects/mapper-item-description'] = baseObjMapItemDesc;
GGRC.Templates['base_objects/modal-content-reference-urls'] =
  baseObjModalContRefUrls;
GGRC.Templates['base_objects/notes'] = baseObjNotes;
GGRC.Templates['base_objects/open_close'] = baseObjOpenClose;
GGRC.Templates['base_objects/page_header'] = baseObjPageHeader;
GGRC.Templates['base_objects/reference-urls'] = baseObjReferenceUrls;
GGRC.Templates['base_objects/search_actions'] = baseObjSearchActions;
GGRC.Templates['base_objects/search_result'] = baseObjSearchResult;
GGRC.Templates['base_objects/task_group_subtree_footer'] =
  baseObjTaskGrSubtreeFoter;
GGRC.Templates['base_objects/task_group_subtree'] = baseObjTaskGroupSubtree;
GGRC.Templates['base_objects/test_plan'] = baseObjTestPlan;
GGRC.Templates['base_objects/title'] = baseObjTitle;
GGRC.Templates['base_objects/tree_add_item'] = baseObjTreeAddItem;
GGRC.Templates['base_objects/tree-item-attr'] = baseObjTreeItemAttr;
GGRC.Templates['base_objects/unmap'] = baseObjUnmap;
GGRC.Templates['base_objects/view_link'] = baseObjViewLink;
GGRC.Templates['base_templates/mapped_objects'] = baseTmpMappedObj;
GGRC.Templates['base_templates/subtree'] = baseTemplatesSubtree;
GGRC.Templates['contracts/modal_content'] = contractsModalContent;
GGRC.Templates['controls/categories_tree'] = controlsCategoriesTree;
GGRC.Templates['controls/contacts'] = controlsContacts;
GGRC.Templates['controls/info'] = controlsInfo;
GGRC.Templates['controls/modal_content'] = controlsModalContent;
GGRC.Templates['controls/tree-item-attr'] = controlsTreeItemAttr;
GGRC.Templates['custom_attribute_definitions/modal_content'] = cadModalContent;
GGRC.Templates['custom_attribute_definitions/subtree'] = cadSubtree;
GGRC.Templates['custom_attribute_definitions/tree_header'] = cadTreeHeader;
GGRC.Templates['custom_attribute_definitions/tree'] = cadTree;
GGRC.Templates['custom_attributes/info'] = caInfo;
GGRC.Templates['custom_attributes/modal_content'] = caModalContent;
GGRC.Templates['cycle_task_entries/modal_content'] = ctEntriesModalContent;
GGRC.Templates['cycle_task_entries/tree_add_item'] = ctEntriesTreeAddItem;
GGRC.Templates['cycle_task_entries/tree'] = ctEntriesTree;
GGRC.Templates['cycle_task_group_object_tasks/info'] = ctGrObjTasksInfo;
GGRC.Templates['cycle_task_group_object_tasks/modal_content'] =
  ctGrObjTasksModCont;
GGRC.Templates['cycle_task_group_object_tasks/tree_add_item'] =
  ctGrObjTasksTreeAddItem;
GGRC.Templates['cycle_task_group_object_tasks/tree-item-attr'] =
  ctGrObjTasksTreeItemAttr;
GGRC.Templates['cycle_task_groups/autocomplete_result'] = ctGroupsAutocResult;
GGRC.Templates['cycle_task_groups/extended_info'] = ctGroupsExtendedInfo;
GGRC.Templates['cycle_task_groups/info'] = ctGroupsInfo;
GGRC.Templates['cycles/info'] = cycles;
GGRC.Templates['dashboard/info/get_started'] = dashboardInfoGetStarted;
GGRC.Templates['dashboard/info/info'] = dashboardInfoInfo;
GGRC.Templates['dashboard/info/workflow_progress'] = dashboardInfoWfProgress;
GGRC.Templates['dashboard/internav_list'] = dashboardInternavList;
GGRC.Templates['dashboard/lhn_risks'] = dashboardLhnRisks;
GGRC.Templates['dashboard/lhn_search'] = dashboardLhnSearch;
GGRC.Templates['dashboard/lhn'] = dashboardLhn;
GGRC.Templates['dashboard/modal_preload'] = dashboardModalPreload;
GGRC.Templates['dashboard/object_list'] = dashboardObjectList;
GGRC.Templates['dashboard/object_nav_actions'] = dashboardObjectNavActions;
GGRC.Templates['dashboard/object_widget'] = dashboardObjectWidget;
GGRC.Templates['dashboard/recently_viewed_list'] = dashboardRecViewedList;
GGRC.Templates['data_assets/modal_content'] = dataAssetsModalContent;
GGRC.Templates['directives/autocomplete_result'] = directivesAutocResult;
GGRC.Templates['directives/tree-item-attr'] = directivesTreeItemAttr;
GGRC.Templates['documents/info'] = documentsInfo;
GGRC.Templates['documents/modal_content'] = documentsModalContent;
GGRC.Templates['documents/tree-item-attr'] = documentsTreeItemAttr;
GGRC.Templates['events/object_list'] = events;
GGRC.Templates['evidence/info'] = evidenceInfo;
GGRC.Templates['evidence/modal_content'] = evidenceModalContent;
GGRC.Templates['evidence/tree-item-attr'] = evidenceTreeItemAttr;
GGRC.Templates['facilities/modal_content'] = facilities;
GGRC.Templates['gdrive/auth_button'] = gdriveAuthButton;
GGRC.Templates['gdrive/confirm_buttons'] = gdriveConfirmButtons;
GGRC.Templates['help/filters_helper_content'] = helpFiltersHelperContent;
GGRC.Templates['import_export/export/attribute_selector'] = importExport;
GGRC.Templates['issues/info'] = issuesInfo;
GGRC.Templates['issues/modal_content'] = issuesModalContent;
GGRC.Templates['issues/remediation_plan'] = issuesRemediationPlan;
GGRC.Templates['issues/tree_add_item'] = issuesTreeAddItem;
GGRC.Templates['markets/modal_content'] = marketsModalContent;
GGRC.Templates['metrics/modal_content'] = metricsModalContent;
GGRC.Templates['modals/archive_cancel_buttons'] = mdArchCancelButtons;
GGRC.Templates['modals/close_buttons'] = modalsCloseButtons;
GGRC.Templates['modals/confirm_button'] = modalsConfirmButton;
GGRC.Templates['modals/confirm_cancel_buttons'] = mdConfirmCancelButtons;
GGRC.Templates['modals/confirm'] = modalsConfirm;
GGRC.Templates['modals/create_proposal'] = modalsCreateProposal;
GGRC.Templates['modals/delete_cancel_buttons'] = modalsDeleteCancelButtons;
GGRC.Templates['modals/discard_buttons'] = modalsDiscardButtons;
GGRC.Templates['modals/done_buttons'] = modalsDoneButtons;
GGRC.Templates['modals/modal_compare_header'] = modalsModalCompareHeader;
GGRC.Templates['modals/modal_header'] = modalsModalHeader;
GGRC.Templates['modals/open_sheet'] = modalsOpenSheet;
GGRC.Templates['modals/prompt_buttons'] = modalsPromptButtons;
GGRC.Templates['modals/restore_revision'] = modalsRestoreRevision;
GGRC.Templates['modals/review_proposal'] = modalsReviewProposal;
GGRC.Templates['modals/save_cancel_buttons'] = modalsSaveCancelButtons;
GGRC.Templates['modals/save_cancel_delete_buttons'] = mdSaveCancelDelButtons;
GGRC.Templates['objectives/autocomplete_result'] = objectivesAutocResult;
GGRC.Templates['objectives/modal_content'] =objectivesModalContent;
GGRC.Templates['objectives/tree-item-attr'] = objectivesTreeItemAttr;
GGRC.Templates['org_groups/autocomplete_result'] = orgGroupsAutocResult;
GGRC.Templates['org_groups/modal_content'] = orgGroupsModalContent;
GGRC.Templates['partials/modal-ajax-test-plan'] = partials;
GGRC.Templates['people/autocomplete_result'] = peopleAutocompleteResult;
GGRC.Templates['people/dropdown_menu'] = peopleDropdownMenu;
GGRC.Templates['people/filters'] = peopleFilters;
GGRC.Templates['people/info'] = peopleInfo;
GGRC.Templates['people/mapper-item-description'] = peopleMapperItemDesc;
GGRC.Templates['people/modal_content'] = peopleModalContent;
GGRC.Templates['people/object_list'] = peopleObjectList;
GGRC.Templates['people/search_result'] = peopleSearchResult;
GGRC.Templates['people/tree-item-attr'] = peopleTreeItemAttr;
GGRC.Templates['people_roles/base_modal'] = peopleRolesBaseModal;
GGRC.Templates['people_roles/info'] = peopleRolesInfo;
GGRC.Templates['people_roles/object_detail'] = peopleRolesObjectDetail;
GGRC.Templates['people_roles/option_column'] = peopleRolesOptionColumn;
GGRC.Templates['policies/info'] = policiesInfo;
GGRC.Templates['policies/modal_content'] = policiesModalContent;
GGRC.Templates['processes/info'] = processesInfo;
GGRC.Templates['processes/modal_content'] = processesModalContent;
GGRC.Templates['product_groups/modal_content'] = productGroupsModalContent;
GGRC.Templates['products/info'] = productsInfo;
GGRC.Templates['products/modal_content'] = productsModalContent;
GGRC.Templates['programs/extended_info'] = programsExtendedInfo;
GGRC.Templates['programs/info'] = programsInfo;
GGRC.Templates['programs/modal_content'] = programsModalContent;
GGRC.Templates['programs/search_result'] = programsSearchResult;
GGRC.Templates['programs/tree-item-attr'] = programsTreeItemAttr;
GGRC.Templates['projects/modal_content'] = projectModalContent;
GGRC.Templates['quick_form/confirm_buttons'] = quickFormConfirmButtons;
GGRC.Templates['regulations/modal_content'] = regulationsModalContent;
GGRC.Templates['requirements/modal_content'] = requirementsModalContent;
GGRC.Templates['requirements/tree-item-attr'] = requirementsTreeItemAttr;
GGRC.Templates['risk_assessments/info'] = raInfo;
GGRC.Templates['risk_assessments/modal_content'] = raModalContent;
GGRC.Templates['risk_assessments/tree_add_item'] = raTreeAddItem;
GGRC.Templates['risk_assessments/tree-item-attr'] = raTreeItemAttr;
GGRC.Templates['risks/modal_content'] = risksModalContent;
GGRC.Templates['roles/object_list'] = rolesObjectList;
GGRC.Templates['selectors/active_column'] = selectorsActiveColumn;
GGRC.Templates['selectors/base_modal'] = selectorsBaseModal;
GGRC.Templates['selectors/option_column'] = selectorsOptionColumn;
GGRC.Templates['selectors/option_detail'] = selectorsOptionDetail;
GGRC.Templates['snapshots/dropdown_menu'] = snapshotsDropdownMenu;
GGRC.Templates['snapshots/tree_add_item'] = snapshotsTreeAddItem;
GGRC.Templates['standards/modal_content'] = standardsModalContent;
GGRC.Templates['systems/info'] = systemsInfo;
GGRC.Templates['systems/modal_content'] = systemsModalContent;
GGRC.Templates['task_group_tasks/modal_content'] = tgtModalContent;
GGRC.Templates['task_group_tasks/task_group_subtree'] = tgtTaskGroupSubtree;
GGRC.Templates['task_group_tasks/tree-item-attr'] = tgtTreeItemAttr;
GGRC.Templates['task_groups/clone_modal_content'] = tgCloneModalContent;
GGRC.Templates['task_groups/info'] = tgInfo;
GGRC.Templates['task_groups/modal_content'] = tgModalContent;
GGRC.Templates['task_groups/tier2_content'] = tgTier2Content;
GGRC.Templates['task_groups/tree_add_item'] = tgTreeAddItem;
GGRC.Templates['task_groups/tree-item-attr'] = tgTreeItemAttr;
GGRC.Templates['technology_environments/modal_content'] = teModalContent;
GGRC.Templates['threats/modal_content'] = threatsModalContent;
GGRC.Templates['vendors/autocomplete_result'] = vendorsAutocompleteResult;
GGRC.Templates['vendors/modal_content'] = vendorsModalContent;
GGRC.Templates['workflows/clone_modal_content'] = wfCloneModalContent;
GGRC.Templates['workflows/confirm_start_buttons'] = wfConfirmStartButtons;
GGRC.Templates['workflows/confirm_start'] = workflowsConfirmStart;
GGRC.Templates['workflows/extended_info'] = workflowsExtendedInfo;
GGRC.Templates['workflows/info'] = workflowsInfo;
GGRC.Templates['workflows/lhn_search'] = workflowsLhnSearch;
GGRC.Templates['workflows/modal_content'] = workflowsModalContent;
GGRC.Templates['workflows/search_result'] = workflowsSearchResult;
GGRC.Templates['workflows/tree-item-attr'] = workflowsTreeItemAttr;
