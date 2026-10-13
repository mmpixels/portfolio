/*
  dc-lite: a tiny template runtime for this site.
  Each page's markup uses {{holes}}, <sc-for> and <sc-if>, and one
  `class Component extends DCLogic` that returns values from renderVals().
  This file binds those once, then updates only what changed on setState.
*/
(function () {
  'use strict';

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return parseFloat(path);
    if (/^'.*'$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }

  var EVENT_MAP = {
    onclick: 'click', onmousemove: 'mousemove', onmouseleave: 'mouseleave',
    onmouseenter: 'mouseenter', onkeydown: 'keydown', onchange: 'change', oninput: 'input'
  };

  // Bind a list of live nodes. Returns an array of updaters: fn(scope).
  function bindNodes(nodes) {
    var ups = [];
    nodes.forEach(function (n) { bindNode(n, ups); });
    return ups;
  }

  function bindNode(node, ups) {
    if (node.nodeType === 3) {
      if (HOLE.test(node.nodeValue)) {
        HOLE.lastIndex = 0;
        var tpl = node.nodeValue;
        ups.push(function (scope) {
          var v = interp(tpl, scope);
          if (node.nodeValue !== v) node.nodeValue = v;
        });
      }
      HOLE.lastIndex = 0;
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'template') return;
    if (tag === 'sc-for') { ups.push(makeFor(node)); return; }
    if (tag === 'sc-if') { ups.push(makeIf(node)); return; }

    Array.prototype.slice.call(node.attributes).forEach(function (a) {
      var name = a.name, val = a.value;
      if (name.indexOf('hint-') === 0) { node.removeAttribute(name); return; }
      if (EVENT_MAP[name]) {
        var m = WHOLE.exec(val);
        node.removeAttribute(name);
        if (!m) return;
        var ev = EVENT_MAP[name], path = m[1], cur = { scope: null };
        node.addEventListener(ev, function (e) {
          var fn = lookup(cur.scope, path);
          if (typeof fn === 'function') fn(e);
        });
        ups.push(function (scope) { cur.scope = scope; });
        return;
      }
      if (!/\{\{/.test(val)) return;
      var real = name === 'data-dc-src' ? 'src' : name;
      if (real !== name) node.removeAttribute(name);
      node.setAttribute(real, '');
      ups.push(function (scope) {
        var v = interp(val, scope);
        if (node.getAttribute(real) !== v) node.setAttribute(real, v);
      });
    });

    Array.prototype.slice.call(node.childNodes).forEach(function (c) { bindNode(c, ups); });
  }

  function templateNodes(el) {
    var t = document.createElement('template');
    t.innerHTML = el.innerHTML;
    return t;
  }

  function makeFor(el) {
    var listPath = (WHOLE.exec(el.getAttribute('list') || '') || [])[1];
    var as = el.getAttribute('as') || 'item';
    var anchor = document.createComment('for');
    var tpl = templateNodes(el);
    el.parentNode.replaceChild(anchor, el);
    var items = [];
    return function (scope) {
      var list = (listPath && lookup(scope, listPath)) || [];
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope);
        s[as] = list[i];
        s.$index = i;
        if (!items[i]) {
          var frag = tpl.content.cloneNode(true);
          var nodes = Array.prototype.slice.call(frag.childNodes);
          var ups = bindNodes(nodes);
          anchor.parentNode.insertBefore(frag, anchor);
          items[i] = { nodes: nodes, ups: ups };
        }
        items[i].ups.forEach(function (u) { u(s); });
      }
      while (items.length > list.length) {
        items.pop().nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
      }
    };
  }

  function makeIf(el) {
    var path = (WHOLE.exec(el.getAttribute('value') || '') || [])[1];
    var anchor = document.createComment('if');
    var tpl = templateNodes(el);
    el.parentNode.replaceChild(anchor, el);
    var inst = null;
    return function (scope) {
      var on = !!(path && lookup(scope, path));
      if (on) {
        if (!inst) {
          var frag = tpl.content.cloneNode(true);
          var nodes = Array.prototype.slice.call(frag.childNodes);
          var ups = bindNodes(nodes);
          anchor.parentNode.insertBefore(frag, anchor);
          inst = { nodes: nodes, ups: ups };
        }
        inst.ups.forEach(function (u) { u(scope); });
      } else if (inst) {
        inst.nodes.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        inst = null;
      }
    };
  }

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var p = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    Object.assign(this.state, p);
    this._schedule && this._schedule();
  };
  DCLogic.prototype.forceUpdate = function () { this._schedule && this._schedule(); };
  DCLogic.prototype.renderVals = function () { return {}; };

  function mount(Component, root, props) {
    root = root || document.querySelector('[data-dc-root]') || document.body;
    var c = new Component(props || {});
    if (!c.state) c.state = {};
    var ups = bindNodes(Array.prototype.slice.call(root.childNodes));
    var queued = false;
    function render() {
      queued = false;
      var vals = c.renderVals() || {};
      ups.forEach(function (u) { u(vals); });
    }
    // state changes inside the same frame batch into one update
    c._schedule = function () {
      if (queued) return;
      queued = true;
      Promise.resolve().then(render);
    };
    render();
    root.removeAttribute('data-dc-cloak');
    if (typeof c.componentDidMount === 'function') c.componentDidMount();
    window.addEventListener('pagehide', function () {
      if (typeof c.componentWillUnmount === 'function') c.componentWillUnmount();
    });
    return c;
  }

  window.DCLogic = DCLogic;
  window.DC = { mount: mount };
})();
