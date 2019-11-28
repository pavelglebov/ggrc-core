/*
 Copyright (C) 2020 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

import loDifferenceBy from 'lodash/differenceBy';
import loReverse from 'lodash/reverse';
import loDebounce from 'lodash/debounce';
import loEach from 'lodash/each';
import loIsEqual from 'lodash/isEqual';
import {getView} from '../../plugins/ggrc-utils';
import makeArray from 'can-util/js/make-array/make-array';
import canBatch from 'can-event/batch/batch';
import canStache from 'can-stache';
import canList from 'can-list';
import canMap from 'can-map';
import canComponent from 'can-component';
import {confirm} from '../../plugins/utils/modals';
import {prepareCustomAttributes} from '../../plugins/utils/ca-utils';
import {
  getInstanceView,
} from '../../plugins/utils/object-history-utils';
import {notifier} from '../../plugins/utils/notifiers-utils';
import Revision from '../../models/service-models/revision';
import Person from '../../models/business-models/person';
import Snapshot from '../../models/service-models/snapshot';
import Stub from '../../models/stub';
import * as businessModels from '../../models/business-models';
import {getPageInstance} from '../../../js/plugins/utils/current-page-utils';
import {isChangeableExternally} from '../../plugins/utils/ggrcq-utils';

const HIGHLIGHT_CLASS = 'diff-highlighted';

export default canComponent.extend({
  tag: 'revisions-comparer',
  view: canStache('<content/>'),
  leakScope: true,
  viewModel: canMap.extend({
    instance: null,
    leftRevisionId: null,
    rightRevision: null,
    proposal: null,
    buttonView: null,
    modalConfirm: null,
    modalTitle: null,
    displayDescriptions: false,
    leftRevisionDescription: '',
    rightRevisionDescription: '',
    compareIt: function () {
      const instance = this.attr('instance');

      const view = getInstanceView(instance);
      const that = this;
      const currentRevisionID = this.attr('leftRevisionId');
      const rightRevision = this.attr('rightRevision');
      const newRevisionID = rightRevision.id;
      const displayDescriptions = that.attr('displayDescriptions');
      const proposal = this.attr('proposal');
      confirm({
        modal_title: this.attr('modalTitle'),
        modal_description: 'Loading...',
        header_view: '/modals/modal-compare-header.stache',
        modal_confirm: this.attr('modalConfirm'),
        skip_refresh: true,
        extraCssClass: 'compare-modal',
        button_view: this.attr('buttonView'),
        instance: this.attr('instance'),
        rightRevision: rightRevision,
        displayDescriptions: displayDescriptions,
        proposal: proposal,
        afterFetch: function (target) {
          let confirmSelf = this;
          that.getRevisions(currentRevisionID, newRevisionID)
            .then(function (data) {
              let revisions = that.prepareInstances(data);

              if (displayDescriptions) {
                const leftRevisionData = that.getRevisionData(
                  data[0],
                  that.attr('leftRevisionDescription'));
                const rightRevisionData = that.getRevisionData(
                  data[1],
                  that.attr('rightRevisionDescription'),
                  proposal);

                confirmSelf.attr('leftRevisionData', leftRevisionData);
                confirmSelf.attr('rightRevisionData', rightRevisionData);
              }

              const template = getView(view);
              let render = canStache(template);
              let fragLeft = render(revisions[0]);
              let fragRight = render(revisions[1]);

              fragLeft.appendChild(fragRight);
              target.find('.modal-body').html(fragLeft);

              that.highlightDifference(target, revisions);
            });
        },
      }, this.updateRevision.bind(this));
    },
    getRevisionData(revision, description, proposal) {
      const revisionData = {
        description,
        date: proposal ? proposal.created_at : revision.updated_at,
        author: proposal ? proposal.proposed_by : revision.modified_by,
      };

      return revisionData;
    },
    getRevisions: function (currentRevisionID, newRevisionID) {
      let notCached = [];
      let cached = [currentRevisionID, newRevisionID].map(function (id) {
        let cache = Revision.findInCacheById(id);
        if (!cache) {
          notCached.push(id);
        }
        return cache;
      }).filter(function (revision) {
        return !!revision;
      });
      let result;

      if (cached.length === 2) {
        result = $.when(cached);
      } else if (cached.length === 1) {
        result = $.when(cached[0], Revision.findOne({id: notCached[0]}))
          .then(function () {
            return makeArray(arguments);
          });
      } else {
        result = Revision.findAll({
          id__in: notCached.join(','),
        });
      }

      return result.then(function (revisions) {
        // set correct order of revisions
        const isNeedReverse = revisions[0].id !== currentRevisionID;
        if (isNeedReverse) {
          revisions = loReverse(revisions);
        }
        return new canList(revisions);
      });
    },
    prepareInstances: function (data) {
      return data.map((value, index) => {
        let content = value.content;
        let revision = {};
        const proposalContent = this.attr('rightRevision.content');
        const model = businessModels[value.resource_type];

        content.attr('isRevision', true);
        content.attr('type', value.resource_type);

        if (content.access_control_list) {
          content.access_control_list.forEach(function (item) {
            let stub = new Stub(new Person({id: item.person_id}));
            item.attr('person', stub);
          });
        }

        if (!this.attr('proposal')) {
          return {instance: new model(content), isSnapshot: true};
        }

        if (index === 1) {
          const instWithProposedValues = new canMap(content);
          // new model method overrides modified fields
          canBatch.start();
          canMap.keys(proposalContent).forEach((key) => {
            if (Array.isArray(proposalContent[key])) {
              instWithProposedValues.attr(key).replace(proposalContent[key]);
            } else {
              instWithProposedValues.attr(key, proposalContent[key]);
            }
          });
          canBatch.stop();
          content = instWithProposedValues.attr();
        }

        revision.isSnapshot = true;
        revision.instance = new model(content);
        revision.instance.isRevision = true;

        return revision;
      });
    },
    updateRevision: function () {
      let instance = new Snapshot(this.instance.snapshot);

      // close info-pane
      $('info-pin-buttons:visible [data-trigger="close"]')
        .first()
        .trigger('click');

      instance.refresh()
        .then(function () {
          instance.attr('update_revision', 'latest');
          return instance.save();
        })
        .then(function () {
          return getPageInstance().dispatch({
            type: 'displayTree',
            destinationType: instance.child_type,
          });
        })
        .then(function () {
          let message = businessModels[instance.child_type].title_singular +
        ' was refreshed successfully.';
          notifier('success', message);
        });
    },

    // debounce required to let template fully render prior comparison
    /**
     * Highlight difference
     * @param {Object} $target - jQuery object
     * @param {canList} revisions - revisions for comparing
     */
    highlightDifference: loDebounce(function ($target, revisions) {
      const instance = this.attr('instance');
      this.highlightAttributes($target);
      this.highlightCustomRoles($target);
      if (instance.type !== 'Program') {
        this.highlightAttachments($target, revisions);
      }
      this.highlightCustomAttributes($target, revisions);
    }, 250),

    /**
     * Highlight difference in attributes
     *
     * @param {jQuery} $target - the root DOM element containing the
     *   revision diff comparison
     */
    highlightAttributes($target) {
      const titleSelector = '.general-page-header__title-wrapper';
      const instance = this.attr('instance');
      const isProposableExternalAttr = (
        instance.constructor.isProposable &&
        isChangeableExternally(instance)
      );
      const tabContent = '.info-pane__main-content';
      const attributesSelector = isProposableExternalAttr ?
        '.review-status, external-attribute > .action-toolbar-container' :
        `object-review, ${tabContent} > .row-fluid:not(:has(custom-roles)),
         ${tabContent} > .custom-attr-wrap .row-fluid.wrap-row > *`;

      const fieldsSelector = [titleSelector, attributesSelector].join(', ');
      const infoPanes = $target.find('.info .tier-content');
      const valuesOld = infoPanes.eq(0).find(fieldsSelector);
      const valuesNew = infoPanes.eq(1).find(fieldsSelector);

      valuesOld.each((index, valueOld) => {
        const $valueNew = $(valuesNew[index]);
        const $valueOld = $(valueOld);
        if ($valueNew.text().replace(/\s/g, '') !==
          $valueOld.text().replace(/\s/g, '')) {
          highlightValues($valueOld, $valueNew);
          this.equalizeHeights($valueOld, $valueNew);
        }
      });

      /**
       * Highlight difference in simple values
       * @param {Object} $value1 - jQuery object
       * @param {Object} $value2 - jQuery object
       */
      function highlightValues($value1, $value2) {
        const listSelector = 'ul li, .object-list-item';
        const listOld = $value1.find(listSelector);
        const listNew = $value2.find(listSelector);

        if (listOld.length || listNew.length) {
          const diffLeft = loDifferenceBy(listOld, listNew, 'innerHTML');
          const diffRight = loDifferenceBy(listNew, listOld, 'innerHTML');
          const diffs = [
            {attr: $value1, list: diffLeft},
            {attr: $value2, list: diffRight},
          ];

          diffs.forEach((diff) => {
            if (diff.list.length) {
              highlightList(diff.list);
            }
          });
        } else {
          [$value1, $value2].forEach(($value) => {
            highlightValue($value);
          });
        }
      }

      /**
       * Highlight difference in DOM list items
       * @param {Object} list - DOM object
       */
      function highlightList(list) {
        list.forEach((item) => {
          $(item).addClass(HIGHLIGHT_CLASS);
        });
      }

      /**
       * Highlight difference in attribute value
       * @param {Object} $value - jQuery object
       */
      function highlightValue($value) {
        if ($value.html() && !$value.find('.empty-message').length) {
          const title = isProposableExternalAttr ? '.action-toolbar' : 'h6';
          $value.find(`h3, ${title} + *, readonly-inline-content`)
            .addClass(HIGHLIGHT_CLASS);
        }
      }
    },

    /**
     * Highlights difference in 'related documents' section
     *
     * @param {jQuery} $target - the root DOM element containing the
     *   revision diff comparison
     * @param {canList} revisions - revisions for comparing
     */
    highlightAttachments($target, revisions) {
      if (!isEqual(
        revisions[0].instance.documents_reference_url,
        revisions[1].instance.documents_reference_url
      )) {
        highlightValues('.related-urls__list');
      }

      if (!isEqual(
        revisions[0].instance.documents_file,
        revisions[1].instance.documents_file
      )) {
        highlightValues('folder-attachments-list object-list');
      }

      if (revisions[0].instance.folder !== revisions[1].instance.folder) {
        highlightValues('folder-attachments-list .mapped-folder');
      }

      /**
       * Checks if two lists are equal.
       * @param {canList} left - First list to compare
       * @param {canList} right - Second list to compare
       *
       * @return {Boolean} - Returns true if lists are equal
       */
      function isEqual(left, right) {
        const valueOld = Object.assign({},
          left && left instanceof canMap && left.attr() || []);
        const valueNew = Object.assign({},
          right && right instanceof canMap && right.attr() || []);

        return loIsEqual(valueOld, valueNew);
      }

      /**
       * Highlight difference in 'related documents' section
       * @param {string} selector - Selector of area to be highlighted
       */
      function highlightValues(selector) {
        const infoPanes = $target.find('.info .tier-content');
        loEach(infoPanes, (pane) => {
          $(pane).find(selector).addClass(HIGHLIGHT_CLASS);
        });
      }
    },

    /**
     * Highlights difference in custom attributes
     *
     * @param {jQuery} $target - the root DOM element containing the
     *   revision diff comparison
     * @param {canList} revisions - revisions for comparing
     */
    highlightCustomAttributes($target, revisions) {
      let that = this;
      let $caPanes = $target.find('.info global-custom-attributes');
      let $oldCAs = $caPanes.eq(0).find('.ggrc-form-item');
      let $newCAs = $caPanes.eq(1).find('.ggrc-form-item');

      let oldCAs = getCAs(revisions[0]);
      let newCAs = getCAs(revisions[1]);

      compareCAs($oldCAs, $newCAs, oldCAs, newCAs);

      /**
       * Prepares instance's custom attributes
       * @param {Object} revision - revision
       * @return {canList} custom attributes list
       */
      function getCAs(revision) {
        let instance = revision.instance;
        return prepareCustomAttributes(
          instance.attr('custom_attribute_definitions'),
          instance.attr('custom_attribute_values'));
      }

      /**
       * Compares two lists of custom attributes
       * @param {Object} $ca0s - list of jQuery objects for custom attributes
       * @param {Object} $ca1s - list of jQuery objects for custom attributes
       * @param {canList} ca0s - list of custom attributes (should be sorted by id)
       * @param {canList} ca1s - list of custom attributes (should be sorted by id)
       */
      function compareCAs($ca0s, $ca1s, ca0s, ca1s) {
        let i = 0;
        let j = 0;
        while (i < ca0s.length || j < ca1s.length) {
          let ca0 = ca0s[i] || {};
          let ca1 = ca1s[j] || {};
          let $ca0 = $ca0s.eq(i);
          let $ca1 = $ca1s.eq(j);

          if (ca0.custom_attribute_id === ca1.custom_attribute_id) {
            // same attribute
            i++;
            j++;
          } else if (ca0.custom_attribute_id < ca1.custom_attribute_id ||
            !ca1.custom_attribute_id) {
            // attribute removed
            $ca1 = fillEmptyCA($ca1); // add empty block to the right panel
            i++;
          } else {
            // attribute added
            $ca0 = fillEmptyCA($ca0); // add empty block to the left panel
            j++;
          }
          highlightTitle($ca0, ca0, $ca1, ca1);
          highlightValue($ca0, ca0, $ca1, ca1);
          that.equalizeHeights($ca0, $ca1);
        }
      }

      /**
       * Highlights title in custom attributes
       * @param {Object} $ca0 - JQuery object
       * @param {Object} ca0 - custom attribute object
       * @param {Object} $ca1 - jQuery object
       * @param {Object} ca1 - custom attribute object
       */
      function highlightTitle($ca0, ca0, $ca1, ca1) {
        let title0 = ca0 && ca0.def ? ca0.def.title : null;
        let title1 = ca1 && ca1.def ? ca1.def.title : null;
        if (title0 !== title1) {
          [$ca0, $ca1].forEach(($ca) => {
            if ($ca && $ca.html()) {
              $ca.find('.info-pane__section-title').addClass(HIGHLIGHT_CLASS);
            }
          });
        }
      }
      /**
       * Highlights value in custom attributes
       * @param {Object} $ca0 - JQuery object
       * @param {Object} ca0 - custom attribute object
       * @param {Object} $ca1 - jQuery object
       * @param {Object} ca1 - custom attribute object
       */
      function highlightValue($ca0, ca0, $ca1, ca1) {
        let value0 = ca0 ? ca0.attribute_value : null;
        let value1 = ca1 ? ca1.attribute_value : null;
        if (value0 !== value1) {
          [$ca0, $ca1].forEach(($ca) => {
            if ($ca && $ca.html() && !$ca.find('.empty-message').length) {
              $ca.find('readonly-inline-content').addClass(HIGHLIGHT_CLASS);
            }
          });
        }
      }

      /**
       * Fills empty space when CA is not existing
       * @param {Object} $ca - jQuery object of previous the same attribute
       * @return {Object} new empty jQuery object
       */
      function fillEmptyCA($ca) {
        return $('<div class="ggrc-form-item"></div>').insertBefore($ca);
      }
    },

    /**
     * Highlight the differences in custom roles assignments between the
     * old and the new revision of an object.
     *
     * @param {jQuery} $target - the root DOM element containing the
     *   revision diff comparison pane
     */
    highlightCustomRoles: function ($target) {
      let $roleBlocksOld;
      let $roleBlocksNew;

      let $rolesPanes = $target.find('related-people-access-control');
      if (this.attr('instance.type') === 'Program') {
        $roleBlocksOld = $rolesPanes.eq(0).add($rolesPanes.eq(1))
          .find('related-people-access-control-group');
        $roleBlocksNew = $rolesPanes.eq(2).add($rolesPanes.eq(3))
          .find('related-people-access-control-group');
      } else {
        $roleBlocksOld = $rolesPanes.eq(0)
          .find('related-people-access-control-group');
        $roleBlocksNew = $rolesPanes.eq(1)
          .find('related-people-access-control-group');
      }

      $roleBlocksOld.each((i) => {
        let $blockOld = $roleBlocksOld.eq(i);
        let $blockNew = $roleBlocksNew.eq(i); // the block count is the same
        compareRoleBlocks($blockOld, $blockNew);
        this.equalizeHeights($blockOld, $blockNew);
      });

      /**
       * Compare two blocks of grants of a particular custom role and mark
       * the differences between them.
       *
       * @param {jQuery} $blockOld - a DOM element containing a list of
       *   people that had a particular custom role granted at a particular
       *   moment in the past
       * @param {jQuery} $blockNew - a DOM element containing a list of
       *   people that have a particular custom role granted at a newer point
       *   in time
       */
      function compareRoleBlocks($blockOld, $blockNew) {
        let oldUserIds = {};
        let newUserIds = {};

        let $oldGrantees = $blockOld.find('person-data');
        let $newGrantees = $blockNew.find('person-data');

        if ($oldGrantees.length && !$newGrantees.length ||
          $newGrantees.length && !$oldGrantees.length) {
          highlightBlock($blockOld);
          highlightBlock($blockNew);
        } else {
          oldUserIds = extractPeopleIds($oldGrantees);
          newUserIds = extractPeopleIds($newGrantees);

          // now we have a list of old and new person IDs
          highlightPersons($oldGrantees, newUserIds);
          highlightPersons($newGrantees, oldUserIds);
        }
      }

      /**
       * Highlight block of grants of a particular custom role.
       *
       * @param {jQuery} $block - a DOM element containing a list of
       *   people that have a particular custom role.
       */
      function highlightBlock($block) {
        if ($block.html() && !$block.find('.object-list__item-empty').length) {
          $block.find('object-list').addClass(HIGHLIGHT_CLASS);
        }
      }

      /**
       * Extract the IDs of the people that have a particular custom role
       * granted to them.
       *
       * @param {jQuery} $grantees - a list of DOM elements representing the
       *   grants of a particular custom role to people
       * @return {Object} - the list of people IDs as object keys
       */
      function extractPeopleIds($grantees) {
        let peopleIds = {};
        $grantees.each(function (i, personInfo) {
          let personId = $(personInfo)
            .viewModel().attr('person.id');
          peopleIds[personId] = true;
        });
        return peopleIds;
      }

      /**
       * Highlight the changes in role assignments.
       *
       * @param {jQuery} $grantees - a list of DOM elements representing the
       *   grants of a particular custom role to people
       * @param {Object} comparisonIds - a set of people IDs representing a
       *   referential list of grants of a particular custom role. The changes
       *   in role assignments are calculated against this list.
       */
      function highlightPersons($grantees, comparisonIds) {
        $grantees.each(function (i, grantee) {
          let $grantee = $(grantee);
          let personId = $grantee.viewModel().attr('person.id');

          if (!(personId in comparisonIds)) {
            $grantee.addClass(HIGHLIGHT_CLASS);
          }
        });
      }
    },

    /**
     * Adjust the heights of two DOM elements to the higher one's height.
     *
     * @param {jQuery} $block1 - the left block element
     * @param {jQuery} $block2 - the right block element
     */
    equalizeHeights($block1, $block2) {
      $block1.css('max-width', 'none');
      $block2.css('max-width', 'none');
      $block1.css('margin-right', '0');
      $block2.css('margin-right', '0');

      const block1Height = $block1.outerHeight();
      const block2Height = $block2.outerHeight();

      if (block1Height > block2Height) {
        $block2.outerHeight(block1Height);
      } else if (block2Height > block1Height) {
        $block1.outerHeight(block2Height);
      }
    },
  }),
});
