/*
  Copyright (C) 2019 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import './clipboard-link';

export default can.Component.extend({
  tag: 'shortlink',
  leakScope: true,
  viewModel: {
    instance: null,
    define: {
      text: {
        type: String,
        get() {
          let instance = this.attr('instance');
          let prefix = GGRC.config.ASSESSMENT_SHORT_URL_PREFIX;
          if (prefix && !prefix.endsWith('/')) {
            prefix += '/';
          }

          return (prefix && instance.id) ? `${prefix}${instance.id}` : '';
        },
      },
    },
  },
  template:
    `<clipboard-link {text}="text">
       <i class="fa fa-google"></i>
       Get Short Url
     </clipboard-link>`,
});
