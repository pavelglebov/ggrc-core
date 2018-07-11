/*
 * Copyright (C) 2018 Google Inc.
 * Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

(function (can, $) {
  can.Control('GGRC.Controllers.PbcWorkflows', {}, {
    '{CMS.Models.AssessmentTemplate} updated': function (model, ev, instance) {
      // Make sure instance.custom_attribute_definitions cache is cleared
      if (!(instance instanceof CMS.Models.AssessmentTemplate)) {
        return;
      }
      instance.custom_attribute_definitions.splice(0,
        instance.custom_attribute_definitions.length);
    },
    '{CMS.Models.Issue} created': function (model, ev, instance) {
      let dfd;

      if (!(instance instanceof CMS.Models.Issue)) {
        return;
      }

      this._after_pending_joins(instance, function () {
        dfd = instance.relatedSnapshots ?
          instance.relatedSnapshots.map(function (item) {
            return this._create_relationship(instance, item);
          }.bind(this)) :
          [];
        instance.delay_resolving_save_until($.when.apply($, dfd));
      }.bind(this));
    },
    '{CMS.Models.Requirement} created': function (model, ev, instance) {
      let directiveDfd;

      if (!(instance instanceof CMS.Models.Requirement)) {
        return;
      }

      this._after_pending_joins(instance, function () {
        directiveDfd = this._create_relationship(instance, instance.directive);
        instance.delay_resolving_save_until($.when(directiveDfd));
      }.bind(this));
    },
    _after_pending_joins: function (instance, callback) {
      let dfd = instance.attr('_pending_joins_dfd');
      if (!dfd) {
        dfd = new $.Deferred().resolve();
      }
      dfd.then(callback);
    },
    _create_relationship: function (source, destination, context) {
      if (!destination || !destination.id) {
        return $.Deferred().resolve();
      }
      if (!context) {
        context = source.context;
      }
      return new CMS.Models.Relationship({
        source: source.stub(),
        destination: destination,
        context: context,
      }).save();
    },
  });

  $(function () {
    $(document.body).ggrc_controllers_pbc_workflows();
  });
})(window.can, window.can.$);
