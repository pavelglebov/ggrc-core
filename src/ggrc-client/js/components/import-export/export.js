/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import './relevant-filter';
import './export-group';
import csvExportTemplate from './templates/csv-export.mustache';
import {
  download,
  fileSafeCurrentDate,
  runExport,
  getExportsHistory,
  downloadExportContent,
  deleteExportJob,
  stopExportJob,
  jobStatuses,
  PRIMARY_TIMEOUT,
  SECONDARY_TIMEOUT,
} from '../../plugins/utils/import-export-utils';
import {
  isConnectionLost,
  handleAjaxError,
} from '../../plugins/utils/errors-utils';
import {
  confirm,
  BUTTON_VIEW_CLOSE,
} from '../../plugins/utils/modals';
import {backendGdriveClient} from '../../plugins/ggrc-gapi-client';
import './current-exports/current-exports';
import {connectionLostNotifier} from './connection-lost-notifier';
import router from '../../router';
import QueryParser from '../../generated/ggrc_filter_query_parser';

export default can.Component.extend({
  tag: 'csv-export',
  template: csvExportTemplate,
  leakScope: true,
  viewModel: {
    define: {
      exportAllowed: {
        get() {
          if (!this.attr('panels.length')) {
            return false;
          }

          return _.reduce(this.attr('panels'), (allowed, panel) => {
            return allowed && panel.attr('isValidConfiguration');
          }, true);
        },
      },
    },
    isInProgress: false,
    loading: false,
    fileName: 'export_objects.csv',
    panels: [],
    isFilterActive: false,
    currentExports: [],
    disabledItems: {},
    timeout: PRIMARY_TIMEOUT,
    getInProgressJobs() {
      return this.attr('currentExports').filter((el) => {
        return el.status === jobStatuses.IN_PROGRESS;
      });
    },
    getExports(ids) {
      return getExportsHistory(ids)
        .then((exports) => {
          if (ids) {
            let exportsMap = exports
              .reduce((map, job) => {
                map[job.id] = job.status;
                return map;
              }, {});

            this.attr('currentExports').forEach((job) => {
              if (exportsMap[job.id]) {
                job.attr('status', exportsMap[job.id]);
              }
            });
          } else {
            this.attr('currentExports').replace(exports);
          }
          if (this.getInProgressJobs().length) {
            this.attr('timeout', SECONDARY_TIMEOUT);
            this.attr('isInProgress', true);
            this.trackExportsStatus();
          } else {
            this.attr('isInProgress', false);
            this.attr('timeout', PRIMARY_TIMEOUT);
          }
        })
        .fail((jqxhr, textStatus, errorThrown) => {
          if (isConnectionLost()) {
            connectionLostNotifier();
          } else {
            handleAjaxError(jqxhr, errorThrown);
          }
        });
    },
    trackExportsStatus() {
      setTimeout(() => {
        let ids = this.getInProgressJobs().map((job) => job.id);
        this.getExports(ids);
      }, this.attr('timeout'));
    },
    onViewContent({id, format, fileName}) {
      if (this.attr(`disabledItems.${id}`)) {
        return;
      }
      this.attr(`disabledItems.${id}`, true);

      if (format === 'csv') {
        downloadExportContent(id, format)
          .then((data) => {
            download(fileName, data);
            this.deleteJob(id);
          })
          .fail(() => {
            this.attr(`disabledItems.${id}`, false);
          });
      } else if (format === 'gdrive') {
        backendGdriveClient.withAuth(() => {
          return downloadExportContent(id, format);
        })
          .then((data) => {
            let link = `https://docs.google.com/spreadsheets/d/${data.id}`;

            confirm({
              modal_title: 'File Generated',
              modal_description: `GDrive file is generated successfully.
               Click button below to view the file.`,
              gDriveLink: link,
              button_view: `${GGRC.mustache_path}/modals/open_sheet.mustache`,
            }, () => {
              this.deleteJob(id);
            }, () => {
              this.attr(`disabledItems.${id}`, false);
            });
          })
          .fail(() => {
            this.attr(`disabledItems.${id}`, false);
          });
      }
    },
    onRemove({id}) {
      if (this.attr(`disabledItems.${id}`)) {
        return;
      }
      this.attr(`disabledItems.${id}`, true);
      this.deleteJob(id);
    },
    onStopExport({id}) {
      stopExportJob(id)
        .then(() => {
          let exportJob = _.find(this.attr('currentExports'), (job) => {
            return job.id === id;
          });

          if (exportJob) {
            exportJob.attr('status', 'Stopped');
          }
        })
        .fail((jqxhr, textStatus, errorThrown) => {
          if (isConnectionLost()) {
            connectionLostNotifier();
          } else {
            handleAjaxError(jqxhr, errorThrown);
          }
        });
    },
    deleteJob(id) {
      deleteExportJob(id)
        .then(() => {
          let index = _.findIndex(this.attr('currentExports'), {id});
          this.attr('currentExports').splice(index, 1);
        }, () => {
          this.attr(`disabledItems.${id}`, false);
        });
    },
    exportObjects() {
      let data = {
        objects: this.getObjectsForExport(),
        current_time: fileSafeCurrentDate(),
      };

      $('.area > section.content').animate({scrollTop: 0}, 'slow');

      runExport(data)
        .then((jobInfo) => {
          const isInProgress = this.getInProgressJobs().length;
          this.attr('currentExports').push(jobInfo);
          this.attr('isInProgress', !!isInProgress);

          if (!isInProgress) {
            this.getExports([jobInfo.id]);
          }
        });
    },
    getObjectsForExport: function () {
      let panels = this.attr('panels');

      return _.map(panels, function (panel, index) {
        let allItems = panel.attr('attributes')
          .concat(panel.attr('mappings'))
          .concat(panel.attr('localAttributes'));
        let relevantFilter = _.reduce(panel.attr('relevant'),
          (result, el, filterIndex) => {
            const isPrevious = el.model_name === '__previous__';
            const id = isPrevious ? index - 1 : el.filter.id;

            if (id !== undefined) {
              const filter = `#${el.model_name},${id}#`;

              return filterIndex ?
                `${result} ${el.operator} ${filter}` : filter;
            }
            return result;
          }, '');

        if (panel.attr('snapshot_type')) {
          if (relevantFilter) {
            relevantFilter += ' AND ';
          }
          relevantFilter += `child_type = ${panel.attr('snapshot_type')}`;
        }

        return {
          object_name: panel.type,
          fields: allItems
            .filter((item) => item.isSelected)
            .map((item) => item.key).serialize(),
          filters: QueryParser.joinQueries(
            QueryParser.parse(relevantFilter || ''),
            QueryParser.parse(panel.filter || '')
          ),
        };
      });
    },
    verifyTargetJob: function () {
      let targetJobId = router.attr('job_id');

      if (targetJobId) {
        let isJobActive = _.find(this.attr('currentExports'), function (el) {
          return el.id === parseInt(targetJobId);
        });

        if (!isJobActive) {
          confirm({
            modal_title: 'Warning',
            modal_description: `You have already downloaded a file generated
              for this export request.`,
            button_view: BUTTON_VIEW_CLOSE,
          });
        }
      }
    },
  },
  events: {
    inserted() {
      this.viewModel.getExports().then(() => {
        this.viewModel.verifyTargetJob();
      });
    },
    toggleIndicator: function (currentFilter) {
      let isExpression =
          !!currentFilter &&
          !!currentFilter.expression.op &&
          currentFilter.expression.op.name !== 'text_search' &&
          currentFilter.expression.op.name !== 'exclude_text_search';
      this.viewModel.attr('isFilterActive', isExpression);
    },
    '.tree-filter__expression-holder input keyup': function (el, ev) {
      this.toggleIndicator(QueryParser.parse(el.val()));
    },
    '.option-type-selector change': function (el, ev) {
      this.viewModel.attr('isFilterActive', false);
    },
  },
});
