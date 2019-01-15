/*
    Copyright (C) 2019 Google Inc.
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

import Clipboard from 'clipboard';
import {notifier} from '../../plugins/utils/notifiers-utils';

export default can.Component.extend({
  tag: 'clipboard-link',
  leakScope: true,
  viewModel: {
    text: '',
  },
  template:
    `<a type="button" data-clipboard-text="{{text}}">
       <content/>
     </a>`,
  events: {
    inserted(el, evnt) {
      new Clipboard(el.find('a')[0]).on('success', () => {
        notifier('info', 'Link has been copied to your clipboard.');
      });
    },
  },
});
