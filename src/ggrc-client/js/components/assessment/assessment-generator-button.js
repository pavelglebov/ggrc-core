/*
    Copyright (C) 2018 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import tracker from '../../tracker';
import RefreshQueue from '../../models/refresh_queue';
import template from './templates/generate_assessments_button.mustache';

export default can.Component.extend({
  tag: 'assessment-generator-button',
  template,
  viewModel: {
    audit: null,
    button: '@',
  },
  events: {
    'a click': function (el, ev) {
      let instance = this.viewModel.attr('audit') || GGRC.page_instance();
      let a;
      this._results = null;
      tracker.start(tracker.FOCUS_AREAS.ASSESSMENT,
        tracker.USER_JOURNEY_KEYS.LOADING,
        tracker.USER_ACTIONS.ASSESSMENT.OPEN_ASMT_GEN_MODAL);

      import(/*webpackChunkName: "mapper"*/ '../../controllers/mapper/mapper')
        .then((mapper) => {
          mapper.ObjectGenerator.launch(el, {
            object: 'Audit',
            type: 'Control',
            'join-object-id': instance.id,
            'join-mapping': 'program_controls',
            relevantTo: [{
              readOnly: true,
              type: instance.type,
              id: instance.id,
              title: instance.title,
            }],
            callback: this.generateAssessments.bind(this),
          });
        });
    },
    showFlash: function (statuses) {
      let flash = {};
      let type;
      let redirectLink;
      let messages = {
        error: 'Assessment generation has failed.',
        progress: 'Assessment generation is in progress. This may take ' +
        'several minutes.',
        success: 'Assessment was generated successfully. {reload_link}',
      };
      if (statuses.Failure > 0) {
        type = 'error';
      } else if (statuses.Pending > 0 || statuses.Running > 0) {
        type = 'progress';
      } else {
        type = 'success';
        redirectLink = window.location.pathname + '#assessment';
      }

      flash[type] = messages[type];
      $('body').trigger('ajax:flash', [flash, redirectLink]);
    },
    updateStatus: function (ids, count) {
      let wait = [2, 4, 8, 16, 32, 64];
      if (count >= wait.length) {
        count = wait.length - 1;
      }

      let isSingle = ids.length == 1;
      let handler = isSingle ? 'findOne' : 'findAll';
      let param = isSingle ? {id: ids[0]} : {id__in: ids.join(',')};
      CMS.Models.BackgroundTask[handler](param)
        .then(function (tasks) {
          let statuses = _.countBy(tasks, function (task) {
            return task.status;
          });
          this.showFlash(statuses);
          if (statuses.Pending || statuses.Running) {
            setTimeout(function () {
              this.updateStatus(ids, ++count);
            }.bind(this), wait[count] * 1000);
          }
        }.bind(this));
    },
    generateAssessments: function (list, options) {
      let que = new RefreshQueue();

      this._results = null;
      que.enqueue(list).trigger().then(function (items) {
        let results = _.map(items, function (item) {
          let id = options.assessmentTemplate.split('-')[0];
          return this.generateModel(item, id, options.type);
        }.bind(this));
        this._results = results;
        $.when.apply($, results)
          .then(function () {
            let tasks = arguments;
            let ids;
            this.showFlash({Pending: 1});
            options.context.closeModal();
            if (!tasks.length || tasks[0] instanceof CMS.Models.Assessment) {
              // We did not create a task
              window.location.reload();
              return;
            }
            ids = _.uniq(_.map(arguments, function (task) {
              return task.id;
            }));
            this.updateStatus(ids, 0);
          }.bind(this));
      }.bind(this));
    },
    generateModel: function (object, template, type) {
      let assessmentModel;
      let audit = this.viewModel.attr('audit');
      let title = 'Generated Assessment for ' + audit.title;
      let data = {
        _generated: true,
        audit,
        // Provide actual Snapshot Object for Assessment
        object: {
          id: object.id,
          type: 'Snapshot',
          href: object.selfLink,
        },
        context: audit.context,
        title: title,
        assessment_type: type,
      };
      data.run_in_background = true;

      if (template) {
        data.template = {
          id: Number(template),
          type: 'AssessmentTemplate',
        };
      }
      assessmentModel = new CMS.Models.Assessment(data);

      // force remove issue_tracker field
      delete assessmentModel.issue_tracker;

      return assessmentModel.save();
    },
    notify: function () {
      let success;
      let errors;
      let msg;

      if (!this._results) {
        return;
      }
      success = _.filter(this._results, function (assessment) {
        return !_.isNull(assessment) &&
          !(assessment.state && assessment.state() === 'rejected');
      }).length;
      errors = _.filter(this._results, function (assessment) {
        return assessment.state && assessment.state() === 'rejected';
      }).length;

      if (errors < 1) {
        if (success === 0) {
          msg = {
            success: 'Every Control already has an Assessment!',
          };
        } else {
          msg = {
            success: success + ' Assessments successfully created.',
          };
        }
      } else {
        msg = {
          error: 'An error occurred when creating Assessments.',
        };
      }

      $(document.body).trigger('ajax:flash', msg);
    },
  },
});
