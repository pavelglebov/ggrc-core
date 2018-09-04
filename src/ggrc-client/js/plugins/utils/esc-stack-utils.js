/*
 Copyright (C) 2018 Google Inc.
 Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
 */

/*
  EscStack class to store all modals order
  to handle closing by Esc key in correct order
*/

// Emulate private
const initHandler = Symbol('initHandler');

class EscStack {
  constructor() {
    this.stack = [];
    this.gdriveOpened = false;

    this[initHandler]();
  }

  [initHandler]() {
    window.addEventListener('keyup', (event) => {
      // gdrive handles Esc by itself
      if (event.keyCode === 27 && !this.gdriveOpened) {
        this.removeOne(event);
        event.stopPropagation();
      }
    }, true);
  }

  // Add one closing callback for modal
  add(closeCallBack) {
    this.stack.push(closeCallBack);
  }

  // Remove one item from stack and
  // call attached closing callback if approved
  removeOne(event) {
    let targetCb = this.stack[this.stack.length - 1];

    if (typeof targetCb === 'function') {
      let approved = targetCb(event);

      if (approved) {
        this.stack.pop();
      }
    }
  }

  // Remove one item from stack,
  // don't execute any handlers.
  // E.g. when modal was closed manually.
  silentRemove() {
    this.stack.pop();
  }

  // Is gdrive picker opened or not
  setGdriveState(state) {
    this.gdriveOpened = state;
  }
}

let escStack = new EscStack();

export default escStack;
