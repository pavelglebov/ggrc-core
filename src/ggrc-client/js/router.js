/*
  Copyright (C) 2018 Google Inc.
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
*/

const router = new can.Map();

class RouterConfig {
  static setupRoutes(routes) {
    routes.forEach((route) => {
      can.route(route.template, route.defaults);
    });
    can.route.map(router);
    can.route.ready();
  }
}

const buildUrl = (data) => {
  let url = can.route.url(data);
  return url;
};

const getUrlParams = (data) => {
  if (typeof data === 'string') {
    let widget;

    // trim first and last slashes if so
    // so can.route.deparam can parse it
    let params = _.compact(data.split('/'));

    // if params missing 'widget' part
    if (params.length === 2) {
      widget = window.location.hash.split('/')[0].replace('#!', '');

      if (widget) {
        params.unshift(widget);
      }
    }

    data = params.join('/');

    return can.route.deparam(data);
  }
};

const changeHash = (data) => {
  can.route.attr(data);
};

const changeUrl = (url) => {
  if (typeof url === 'string') {
    window.location.href = url;
  }
};

const reloadPage = () => {
  window.location.reload();
};

export default router;
export {
  RouterConfig,
  buildUrl,
  getUrlParams,
  changeHash,
  changeUrl,
  reloadPage,
};
