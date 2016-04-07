(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { 'default': obj };
}

/**
 * Inherits the prototype methods from one constructor into another.
 * The parent will be accessible through the obj.super_ property. Fully
 * compatible with standard node.js inherits.
 *
 * @memberof tiny
 * @param {Function} obj An object that will have the new members.
 * @param {Function} superConstructor The constructor Class.
 * @returns {Object}
 * @exampleDescription
 *
 * @example
 * tiny.inherits(obj, parent);
 */
exports['default'] = _events2['default'];

},{"events":1}],3:[function(require,module,exports){
'use strict';

var _autocomplete = require('./modules/autocomplete');

var _autocomplete2 = _interopRequireDefault(_autocomplete);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var searchText = document.querySelector('.nav-search-input'); //import Dumb from './modules/dumb';

var suggestionsMock = { "paging": { "total": 8400, "limit": 10, "offset": 0 }, "filters": { "country": "MLM", "query_category": "classified", "q": "san", "wildcard": "true" }, "suggestions": [{
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Del Valle Centro",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Benito Juárez",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Del Valle Norte",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Benito Juárez",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Del Valle",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Benito Juárez",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Del Valle Sur",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Benito Juárez",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Letrán Valle",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Benito Juárez",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Tlacoquemecatl del Valle",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Benito Juárez",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Nápoles",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Benito Juárez",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Roma Norte",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Roma Sur",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Hipódromo de la Condesa",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Condesa",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Hipódromo",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "San Rafael",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Santa María la Ribera",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Tabacalera",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Juárez",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Doctores",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Cuauhtémoc",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Buenos Aires",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Cuauhtemoc",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Bosques de las Lomas",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Lomas de Chapultepec",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Lomas Altas",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Lomas Barrilaco",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Lomas de Bezares",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Lomas de Reforma",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Lomas de Sotelo",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Lomas Virreyes",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Polanco Chapultepec",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Polanco I Sección",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Polanco II Sección",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Polanco III Sección",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Polanco IV Sección",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Polanco V Sección",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Polanco Reforma",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Granada",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Anahuac",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Nueva Anzures",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Verónica Anzueres",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }, {
        "id": "B-MX-BCA-ENS-SS1",
        "legacy_classified_id": "TUxNQlNBTjg1MDY",
        "name": "Anahuac I Sección",
        "type": "neighborhood",
        "filters_to_apply": [{
            "country_id": "P-MX",
            "country_name": "Mexico",
            "country_legacy_core_id": "MX",
            "country_legacy_classified_id": "MX",
            "state_id": "E-MX-DIF",
            "state_name": "Distrito Federal",
            "state_legacy_core_id": "MX-DIF",
            "state_legacy_classified_id": "TUxNUEJBSjc0NzU",
            "city_id": "C-MX-BCA-ENS",
            "city_name": "Miguel Hidalgo",
            "city_legacy_core_id": "TUxNQ0VOUzU2ODE",
            "city_legacy_classified_id": "TUxNQ0VOUzU2ODE"
        }]
    }]
};

window.autocomplete = new _autocomplete2.default(searchText, {
    wrapper: 'autocomplete-wrapper',
    multiple: true
}).on('type', function (searchText) {
    if (searchText.length >= 2) {
        getSuggestion(searchText);
    } else {
        autocomplete.suggest([]);
    }
}).on('select', function (val, pos) {
    var f = autocomplete._suggestionsData[pos].filters_to_apply[0];

    if (!autocomplete.getFilters().length) {
        autocomplete.setFilters([{ key: 'state_name', name: f.state_name, value: f.state_name }, { key: 'city_name', name: f.city_name, value: f.city_name }]);
    }
});

function getSuggestion(searchText) {
    function remove_accents(s) {
        var r = s.toLowerCase();
        var non_asciis = { 'a': '[àáâãäå]', 'ae': 'æ', 'c': 'ç', 'e': '[èéêë]', 'i': '[ìíîï]', 'n': 'ñ', 'o': '[òóôõö]', 'oe': 'œ', 'u': '[ùúûűü]', 'y': '[ýÿ]' };
        for (var i in non_asciis) {
            r = r.replace(new RegExp(non_asciis[i], 'g'), i);
        }
        return r;
    }

    searchText = remove_accents(searchText);

    var filters = autocomplete.getFilters();
    var values = autocomplete.getValue();
    var suggestionsList = [];
    var suggestions = [];

    if (filters.length) {
        suggestionsMock.suggestions.forEach(function (s) {
            if (s.filters_to_apply[0][filters[0].key] == filters[0].value && s.filters_to_apply[0][filters[1].key] == filters[1].value) {
                suggestionsList.push(s);
            }
        });
    } else {
        suggestionsList = suggestionsMock.suggestions;
    }

    suggestionsList.forEach(function (s) {
        var val = remove_accents(s.name);
        if (values.indexOf(s.name) == -1 && val.indexOf(searchText) !== -1) {
            suggestions.push(s);
        }
    });

    return parseResults(suggestions);
}

function parseResults(suggestions) {
    var s = suggestions.map(function (s) {
        var nameParts = [s.name],
            filter;

        if (s.filters_to_apply.length) {
            filter = s.filters_to_apply[0];

            if (s.type === 'neighborhood') {
                nameParts.push(filter.city_name);
            }
            if (s.type !== 'state') {
                nameParts.push(filter.state_name);
            }
        }

        return nameParts.join(', ');
    }).slice(0, 10);

    autocomplete.suggest(s, suggestions.slice(0, 10));
}

tiny.on('.nav-search', 'submit', function (e) {
    e.preventDefault();
});

tiny.on('.nav-search-submit', 'click', function (e) {
    e.preventDefault();
    //setTimeout(() => {window.location.reload(true)}, 1000);
});

},{"./modules/autocomplete":6}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
 * The Collapsible class gives to components the ability to shown or hidden its container.
 * @memberOf ch
 * @mixin
 * @returns {Function} Returns a private function.
 */
function Collapsible() {
    var _this = this;

    /**
     * Reference to context of an instance.
     * @type {Object}
     * @private
     */
    var that = this,
        triggerClass = this.getClassname(this.constructor.name.toLowerCase() + '-trigger-on'),
        fx = this._options.fx,
        useEffects = tiny.support.transition && fx !== 'none' && fx !== false,
        pt = void 0,
        pb = void 0;

    var toggleEffects = {
        'slideDown': 'slideUp',
        'slideUp': 'slideDown',
        'fadeIn': 'fadeOut',
        'fadeOut': 'fadeIn'
    };

    function showCallback(e) {
        var container = that.container;


        if (useEffects) {
            tiny.removeClass(container, that.getClassname('fx-' + fx));

            // TODO: Use original height when it is defined
            if (/^slide/.test(fx)) {
                container.style.height = '';
            }
        }
        tiny.removeClass(container, that.getClassname('hide'));
        container.setAttribute('aria-hidden', 'false');

        if (e) {
            e.target.removeEventListener(e.type, showCallback);
        }

        /**
         * Event emitted when the component is shown.
         * @event ch.Collapsible#show
         * @example
         * // Subscribe to "show" event.
         * collapsible.on('show', function () {
             *     // Some code here!
             * });
         */
        that.emit('show');
    }

    function hideCallback(e) {
        var container = that.container;


        if (useEffects) {
            tiny.removeClass(container, that.getClassname('fx-' + toggleEffects[fx]));
            container.style.display = '';
            if (/^slide/.test(fx)) {
                container.style.height = '';
            }
        }
        tiny.addClass(container, that.getClassname('hide'));
        container.setAttribute('aria-hidden', 'true');

        if (e) {
            e.target.removeEventListener(e.type, hideCallback);
        }

        /**
         * Event emitted when the component is hidden.
         * @event ch.Collapsible#hide
         * @example
         * // Subscribe to "hide" event.
         * collapsible.on('hide', function () {
             *     // Some code here!
             * });
         */
        that.emit('hide');
    }

    this._shown = false;

    /**
     * Shows the component container.
     * @function
     * @private
     */
    this._show = function () {
        _this._shown = true;

        if (_this.trigger !== undefined) {
            tiny.addClass(_this.trigger, triggerClass);
        }

        /**
         * Event emitted before the component is shown.
         * @event ch.Collapsible#beforeshow
         * @example
         * // Subscribe to "beforeshow" event.
         * collapsible.on('beforeshow', function () {
             *     // Some code here!
             * });
         */
        _this.emit('beforeshow');

        // Animate or not
        if (useEffects) {
            (function () {
                var _h = 0;
                var container = _this.container;

                // Be sure to remove an opposite class that probably exist and
                // transitionend listener for an opposite transition, aka $.fn.stop(true, true)

                tiny.off(container, tiny.support.transition.end, hideCallback);
                tiny.removeClass(container, that.getClassname('fx-' + toggleEffects[fx]));

                tiny.on(container, tiny.support.transition.end, showCallback);

                // Reveal an element before the transition
                container.style.display = 'block';

                // Set margin and padding to 0 to prevent content jumping at the transition end
                if (/^slide/.test(fx)) {
                    // Cache the original paddings for the first time
                    if (!pt || !pb) {
                        pt = tiny.css(container, 'padding-top');
                        pb = tiny.css(container, 'padding-bottom');

                        container.style.marginTop = container.style.marginBottom = container.style.paddingTop = container.style.paddingBottom = '0px';
                    }

                    container.style.opacity = '0.01';
                    _h = container.offsetHeight;
                    container.style.opacity = '';
                    container.style.height = '0px';
                }

                // Transition cannot be applied at the same time when changing the display property
                setTimeout(function () {
                    if (/^slide/.test(fx)) {
                        container.style.height = _h + 'px';
                    }
                    container.style.paddingTop = pt;
                    container.style.paddingBottom = pb;
                    tiny.addClass(container, that.getClassname('fx-' + fx));
                }, 0);
            })();
        } else {
            showCallback();
        }

        _this.emit('_show');

        return _this;
    };

    /**
     * Hides the component container.
     * @function
     * @private
     */
    this._hide = function () {

        that._shown = false;

        if (that.trigger !== undefined) {
            tiny.removeClass(that.trigger, triggerClass);
        }

        /**
         * Event emitted before the component is hidden.
         * @event ch.Collapsible#beforehide
         * @example
         * // Subscribe to "beforehide" event.
         * collapsible.on('beforehide', function () {
             *     // Some code here!
             * });
         */
        that.emit('beforehide');

        // Animate or not
        if (useEffects) {
            // Be sure to remove an opposite class that probably exist and
            // transitionend listener for an opposite transition, aka $.fn.stop(true, true)
            tiny.off(that.container, tiny.support.transition.end, showCallback);
            tiny.removeClass(that.container, that.getClassname('fx-' + fx));

            tiny.on(that.container, tiny.support.transition.end, hideCallback);
            // Set margin and padding to 0 to prevent content jumping at the transition end
            if (/^slide/.test(fx)) {
                that.container.style.height = tiny.css(that.container, 'height');
                // Uses nextTick to trigger the height change
                setTimeout(function () {
                    that.container.style.height = '0px';
                    that.container.style.paddingTop = that.container.style.paddingBottom = '0px';
                    tiny.addClass(that.container, that.getClassname('fx-' + toggleEffects[fx]));
                }, 0);
            } else {
                setTimeout(function () {
                    tiny.addClass(that.container, that.getClassname('fx-' + toggleEffects[fx]));
                }, 0);
            }
        } else {
            hideCallback();
        }

        return that;
    };

    /**
     * Shows or hides the component.
     * @function
     * @private
     */
    this._toggle = function () {

        if (_this._shown) {
            _this.hide();
        } else {
            _this.show();
        }

        return _this;
    };

    // TODO: Use on.ready instead of timeout
    setTimeout(function () {
        _this.on('disable', _this.hide);
    }, 1);
}

exports.default = Collapsible;

},{}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
 * Add a function to manage components content.
 * @mixin
 *
 * @returns {Function}
 */
function Content() {
    var _this = this;

    /**
     * Allows to manage the components content.
     * @function
     * @memberof! ch.Content#
     * @param {(String | HTMLElement)} content The content that will be used by a component.
     * @param {Object} [options] A custom options to be used with content loaded by ajax.
     * @param {String} [options.method] The type of request ("POST" or "GET") to load content by ajax. Default: "GET".
     * @param {String} [options.params] Params like query string to be sent to the server.
     * @param {Boolean} [options.cache] Force to cache the request by the browser. Default: true. false value will work only with HEAD and GET requests
     * @param {(String | HTMLElement)} [options.waiting] Temporary content to use while the ajax request is loading.
     * @example
     * // Update content with some string.
     * component.content('Some new content here!');
     * @example
     * // Update content that will be loaded by ajax with custom options.
     * component.content('http://chico-ui.com.ar/ajax', {
         *     'cache': false,
         *     'params': 'x-request=true'
         * });
     */
    this.content = function (content, options) {
        var parent;

        // Returns the last updated content.
        if (content === undefined) {
            return this._content.innerHTML;
        }

        this._options.content = content;

        if (this._options.cache === undefined) {
            this._options.cache = true;
        }

        if (typeof content === 'string') {
            // Case 1: AJAX call
            if (/^(((https|http|ftp|file):\/\/)|www\.|\.\/|(\.\.\/)+|(\/{1,2})|(\d{1,3}\.){3}\d{1,3})(((\w+|-)(\.?)(\/?))+)(\:\d{1,5}){0,1}(((\w+|-)(\.?)(\/?)(#?))+)((\?)(\w+=(\w?)+(&?))+)?(\w+#\w+)?$/.test(content)) {
                getAsyncContent.call(this, content.replace(/#.+/, ''), options);
                // Case 2: Plain text
            } else {
                    setContent.call(this, content);
                }
            // Case 3: HTML Element
        } else if (content.nodeType !== undefined) {

                tiny.removeClass(content, this.getClassname('hide'));
                parent = tiny.parent(content);

                setContent.call(this, content);

                if (!this._options.cache) {
                    parent.removeChild(content);
                }
            }

        return this;
    };

    // Loads content once. If the cache is disabled the content loads on every show.
    this.once('_show', function () {
        _this.content(_this._options.content);

        _this.on('show', function () {
            if (!_this._options.cache) {
                _this.content(_this._options.content);
            }
        });
    });

    /**
     * Set async content into component's container and emits the current event.
     * @private
     */
    function setAsyncContent(event) {

        this._content.innerHTML = event.response;

        /**
         * Event emitted when the content change.
         * @event ch.Content#contentchange
         * @private
         */
        this.emit('_contentchange');

        /**
         * Event emitted if the content is loaded successfully.
         * @event ch.Content#contentdone
         * @ignore
         */

        /**
         * Event emitted when the content is loading.
         * @event ch.Content#contentwaiting
         * @example
         * // Subscribe to "contentwaiting" event.
         * component.on('contentwaiting', function (event) {
             *     // Some code here!
             * });
         */

        /**
         * Event emitted if the content isn't loaded successfully.
         * @event ch.Content#contenterror
         * @example
         * // Subscribe to "contenterror" event.
         * component.on('contenterror', function (event) {
             *     // Some code here!
             * });
         */

        this.emit('content' + event.status, event);
    }

    /**
     * Set content into component's container and emits the contentdone event.
     * @private
     */
    function setContent(content) {

        if (content.nodeType !== undefined) {
            this._content.innerHTML = '';
            this._content.appendChild(content);
        } else {
            this._content.innerHTML = content;
        }

        this._options.cache = true;

        /**
         * Event emitted when the content change.
         * @event ch.Content#contentchange
         * @private
         */
        this.emit('_contentchange');

        /**
         * Event emitted if the content is loaded successfully.
         * @event ch.Content#contentdone
         * @example
         * // Subscribe to "contentdone" event.
         * component.on('contentdone', function (event) {
             *     // Some code here!
             * });
         */
        this.emit('contentdone');
    }

    /**
     * Get async content with given URL.
     * @private
     */
    function getAsyncContent(url, options) {
        var _this2 = this;

        var requestCfg = void 0,
            defaults = {
            'method': this._options.method,
            'params': this._options.params,
            'cache': this._options.cache,
            'waiting': this._options.waiting
        };

        // Initial options to be merged with the user's options
        options = tiny.extend({
            'method': 'GET',
            'params': '',
            'waiting': 'loading-large'
        }, defaults, options);

        // Set loading
        setAsyncContent.call(this, {
            'status': 'waiting',
            'response': options.waiting.charAt(0) === '<' ? options.waiting : '<div class="' + this.getClassname(options.waiting) + '"></div>'
        });

        requestCfg = {
            method: options.method,
            success: function success(resp) {
                setAsyncContent.call(_this2, {
                    'status': 'done',
                    'response': resp
                });
            },
            error: function error(err) {
                setAsyncContent.call(_this2, {
                    'status': 'error',
                    'response': '<p>Error on ajax call.</p>',
                    'data': err.message || JSON.stringify(err)
                });
            }
        };

        if (options.cache !== undefined) {
            this._options.cache = options.cache;
        }

        if (options.cache === false && ['GET', 'HEAD'].indexOf(options.method.toUpperCase()) !== -1) {
            requestCfg.cache = false;
        }

        if (options.params) {
            if (['GET', 'HEAD'].indexOf(options.method.toUpperCase()) !== -1) {
                url += (url.indexOf('?') !== -1 || options.params[0] === '?' ? '' : '?') + options.params;
            } else {
                requestCfg.data = options.params;
            }
        }

        // Make a request
        tiny.ajax(url, requestCfg);
    }
}

exports.default = Content;

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _component = require('./component');

var _component2 = _interopRequireDefault(_component);

var _popover = require('./popover');

var _popover2 = _interopRequireDefault(_popover);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function highlightSuggestion(target) {
    var posinset = void 0;

    Array.prototype.forEach.call(this._suggestionsList.childNodes, function (e) {
        if (e.contains(target)) {
            posinset = parseInt(target.getAttribute('aria-posinset'), 10) - 1;
        }
    });

    this._highlighted = typeof posinset === 'number' ? posinset : null;

    this._toogleHighlighted();

    return this;
}

var specialKeyCodeMap = {
    9: 'tab',
    27: 'esc',
    37: 'left',
    39: 'right',
    13: 'enter',
    38: 'up',
    40: 'down'
};

var KEYS = {
    BACKSPACE: 8,
    TAB: 9,
    ENTER: 13,
    ESC: 27,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40
    /*
    '8': 'backspace',
    '9': 'tab',
    '13': 'enter',
    '27': 'esc',
    '37': 'left_arrow',
    '38': 'up_arrow',
    '39': 'right_arrow',
    '40': 'down_arrow'
    */
};

// there is no mouseenter to highlight the item, so it happens when the user do mousedown
var highlightEvent = tiny.support.touch ? tiny.onpointerdown : 'mouseover';

/**
 * Autocomplete Component shows a list of suggestions for a HTMLInputElement.
 * @memberof ch
 * @constructor
 * @augments ch.Component
 * @requires ch.Popover
 * @param {HTMLElement} [el] A HTMLElement to create an instance of ch.Autocomplete.
 * @param {Object} [options] Options to customize an instance.
 * @param {String} [options.loadingClass] Default: "ch-autocomplete-loading".
 * @param {String} [options.highlightedClass] Default: "ch-autocomplete-highlighted".
 * @param {String} [options.itemClass] Default: "ch-autocomplete-item".
 * @param {String} [options.addClass] CSS class names that will be added to the container on the component initialization. Default: "ch-box-lite ch-autocomplete".
 * @param {Number} [options.keystrokesTime] Default: 150.
 * @param {Boolean} [options.html] Default: false.
 * @param {String} [options.side] The side option where the target element will be positioned. You must use: "left", "right", "top", "bottom" or "center". Default: "bottom".
 * @param {String} [options.align] The align options where the target element will be positioned. You must use: "left", "right", "top", "bottom" or "center". Default: "left".
 * @param {Number} [options.offsetX] The offsetX option specifies a distance to displace the target horitontally.
 * @param {Number} [options.offsetY] The offsetY option specifies a distance to displace the target vertically.
 * @param {String} [options.positioned] The positioned option specifies the type of positioning used. You must use: "absolute" or "fixed". Default: "absolute".
 * @param {(Boolean | String)} [options.wrapper] Wrap the reference element and place the container into it instead of body. When value is a string it will be applied as additional wrapper class. Default: false.
 *
 * @returns {autocomplete}
 * @example
 * // Create a new AutoComplete.
 * var autocomplete = new AutoComplete([el], [options]);
 * @example
 * // Create a new AutoComplete with configuration.
 * var autocomplete = new AutoComplete('.my-autocomplete', {
     *  'loadingClass': 'custom-loading',
     *  'highlightedClass': 'custom-highlighted',
     *  'itemClass': 'custom-item',
     *  'addClass': 'carousel-cities',
     *  'keystrokesTime': 600,
     *  'html': true,
     *  'side': 'center',
     *  'align': 'center',
     *  'offsetX': 0,
     *  'offsetY': 0,
     *  'positioned': 'fixed'
     * });
 */

var Autocomplete = function (_Component) {
    _inherits(Autocomplete, _Component);

    function Autocomplete(el, options) {
        var _ret;

        _classCallCheck(this, Autocomplete);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Autocomplete).call(this, el, options));

        _this._init(el, options);

        return _ret = _this, _possibleConstructorReturn(_this, _ret);
    }

    /**
     * Configuration by default.
     * @type {Object}
     * @private
     */


    _createClass(Autocomplete, [{
        key: '_init',


        /**
         * Initialize a new instance of Autocomplete and merge custom options with defaults options.
         * @memberof! ch.Autocomplete.prototype
         * @function
         * @private
         * @returns {autocomplete}
         */
        value: function _init(el, options) {
            var _this2 = this;

            tiny.extend(this._options, Autocomplete._defaults, options);

            // creates the basic item template for this instance
            this._options._itemTemplate = this._options._itemTemplate.replace('{{itemClass}}', this.getClassname(this._options.itemClass));

            if (this._options.html) {
                // remove the suggested data space when html is configured
                this._options._itemTemplate = this._options._itemTemplate.replace('{{suggestedData}}', '');
            }

            if (this._options.multiple) {
                // Always use the wrapper when multiple choices is enabled
                if (!this._options.wrapper) {
                    this._options.wrapper = true;
                }
            }

            // The component who shows and manage the suggestions.
            this._popover = new _popover2.default({
                'reference': this._el,
                'content': this._suggestionsList,
                'side': this._options.side,
                'align': this._options.align,
                'addClass': this._options.addClass,
                'hiddenby': this._options._hiddenby,
                'width': this._options.wrapper ? '100%' : this._el.getBoundingClientRect().width + 'px', // IE8 getBoundingClientRect Warning!
                'fx': this._options.fx,
                'wrapper': this._options.wrapper
            });

            /**
             * The autocomplete container.
             * @type {HTMLDivElement}
             * @example
             * // Gets the autocomplete container to append or prepend content.
             * autocomplete.container.appendChild(document.createElement('div'));
             */
            this.container = this._popover.container;

            this.container.setAttribute('aria-hidden', 'true');

            this._wrapper = this._popover._containerWrapper;

            /**
             * The autocomplete choices list.
             * @type {HTMLUListElement}
             * @private
             */
            if (this._options.multiple) {
                this._choicesList = document.createElement('ul');
                tiny.addClass(this._choicesList, this.getClassname(this._options.choicesClass));
                tiny.addClass(this._choicesList, this.getClassname(this._options.choicesClass + '--empty'));
                tiny.addClass(this._wrapper, this.getClassname('autocomplete-multiple'));

                this._choicesList.innerHTML = '<li class="ch-autocomplete-search-field"><input type="text" class="ch-autocomplete-search-input" autocomplete="off"></li>';

                this._searchInput = this._choicesList.querySelector('.ch-autocomplete-search-input');
                this._searchInput.setAttribute('placeholder', this._el.getAttribute('placeholder'));

                this._wrapper.appendChild(this._choicesList);

                this._popover._options.reference = this._choicesList;
                this._popover._positioner.refresh({ reference: this._choicesList });

                tiny.on(this._searchInput, 'keydown', function (e) {
                    _this2._fixInputWidth();
                });
            }

            /**
             * The autocomplete suggestion list.
             * @type {HTMLUListElement}
             * @private
             */
            this._suggestionsList = document.createElement('ul');
            tiny.addClass(this._suggestionsList, this.getClassname('autocomplete-list'));

            this.container.appendChild(this._suggestionsList);

            /**
             * Selects the items
             * @memberof! ch.Autocomplete.prototype
             * @function
             * @private
             * @returns {autocomplete}
             */

            this._highlightSuggestion = function (event) {
                var target = event.target || event.srcElement,
                    item = target.nodeName === 'LI' ? target : target.parentNode.nodeName === 'LI' ? target.parentNode : null;

                if (item !== null) {
                    highlightSuggestion.call(_this2, item);
                }
            };

            tiny.on(this.container, highlightEvent, this._highlightSuggestion);

            tiny.on(this.container, tiny.onpointertap, function (e) {
                var target = e.target || e.srcElement;
                var className = _this2.getClassname(_this2._options.itemClass);

                // completes the value, it is a shortcut to avoid write the complete word
                if (target.nodeName === 'I' && !_this2._options.html) {
                    e.preventDefault();
                    _this2._el.value = _this2._suggestions[_this2._highlighted];
                    _this2.emit('type', _this2._el.value);
                    return;
                }

                if (closestParent(target, '.' + _this2.getClassname('autocomplete-item'))) {
                    _this2._selectSuggestion();
                }
            });

            /**
             * The autocomplete trigger.
             * @type {HTMLElement}
             */
            this.trigger = this._options.multiple ? this._searchInput : this._el;

            this.trigger.setAttribute('aria-autocomplete', 'list');
            this.trigger.setAttribute('aria-haspopup', 'true');
            this.trigger.setAttribute('aria-owns', this.container.getAttribute('id'));
            this.trigger.setAttribute('autocomplete', 'off');

            tiny.on(this.trigger, 'focus', function (e) {
                _this2._turn('on');
            });
            tiny.on(this.trigger, 'blur', function (e) {
                if (_this2._isOn) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    _this2.trigger.focus();
                } else {
                    //this.emit('blur');
                    _this2._turn('off');
                }
            });

            // The number of the selected item or null when no selected item is.
            this._highlighted = null;

            // Collection of suggestions to be shown.
            this._suggestions = [];

            // Original suggestions
            this._suggestionsData = [];

            // The list of applied filters
            this._filters = [];

            // Current selected values
            this._value = this._options.multiple ? [] : '';

            // Used to show when the user cancel the suggestions
            this._originalQuery = this._currentQuery = this._el.value;

            this._configureShortcuts();

            this._isOn = false;

            // Turn on when the input element is already has focus
            if (this.trigger === document.activeElement && !this._enabled) {
                this._turn('on');
            }

            return this;
        }
    }, {
        key: 'clearFilters',
        value: function clearFilters() {
            this._filters = [];

            if (this._options.showFilters) {
                [].concat(_toConsumableArray(this._choicesList.querySelectorAll('.' + this.getClassname('autocomplete-filter')))).forEach(function (f) {
                    return f.parentNode.removeChild(f);
                });
            }
        }
    }, {
        key: 'setFilters',
        value: function setFilters(filters) {
            var _this3 = this;

            this.clearFilters();

            if (filters === undefined) {
                return this;
            }

            this._filters = filters;

            if (this._options.showFilters && this._options.multiple) {
                var filtersLabel = this._filters.map(function (f) {
                    return '<li class="' + _this3.getClassname('autocomplete-filter') + '" data-value="' + f.value + '"><span>' + (f.name || f.value) + '</span></li>';
                }).join('');

                this._choicesList.insertAdjacentHTML('afterbegin', filtersLabel);
            }
        }
    }, {
        key: 'getFilters',
        value: function getFilters() {
            return this._filters;
        }
    }, {
        key: 'getValue',
        value: function getValue() {
            return this._value;
        }
    }, {
        key: 'clear',
        value: function clear() {
            if (this._options.multiple) {
                this._value = [];
                this._clearChoices();
                tiny.addClass(this._choicesList, this.getClassname(this._options.choicesClass + '--empty'));
                this._searchInput.style.width = '';
            } else {
                this._value = '';
            }
            this.clearFilters();

            return this;
        }
    }, {
        key: '_removeChoice',
        value: function _removeChoice(el) {
            var _this4 = this;

            [].concat(_toConsumableArray(this._wrapper.querySelectorAll('.' + this.getClassname('autocomplete-choice')))).forEach(function (f, i) {
                if (el.isEqualNode(f)) {
                    f.parentNode.removeChild(f);
                    _this4._value.splice(i, 1);

                    var summary = _this4._choicesList.querySelector('.ch-autocomplete-choices-summary');

                    if (_this4._value.length === 0) {
                        _this4.clearFilters();
                        var all = _this4._wrapper.querySelector('.ch-autocomplete-choices-all');
                        if (all) {
                            all.parentNode.removeChild(all);
                        }

                        if (summary) {
                            summary.parentNode.removeChild(summary);
                        }
                    } else {
                        if (summary) {
                            var a = summary.querySelector('a');
                            if (!a.getAttribute('data-opened')) {
                                a.innerText = _this4._value.length + ' colonias';
                            }
                        }
                    }

                    return _this4;
                }
            });
        }
    }, {
        key: '_clearChoices',
        value: function _clearChoices() {
            [].concat(_toConsumableArray(this._choicesList.querySelectorAll('.' + this.getClassname('autocomplete-choice')))).forEach(function (f) {
                return f.parentNode.removeChild(f);
            });
            var summary = this._choicesList.querySelector('.ch-autocomplete-choices-summary');
            if (summary) {
                summary.parentNode.removeChild(summary);
            }
            var all = this._wrapper.querySelector('.ch-autocomplete-choices-all');
            if (all) {
                all.parentNode.removeChild(all);
            }
        }
    }, {
        key: '_drawSingleChoice',
        value: function _drawSingleChoice(choice) {
            var _this5 = this;

            var li = document.createElement('li');
            li.className = 'ch-autocomplete-choice';
            li.innerHTML = '<span>' + choice + '</span><a class="ch-autocomplete-choice-remove"></a>';

            tiny.on(li.querySelector('a'), 'click', function (e) {
                e.preventDefault();
                _this5._removeChoice(li);
            });

            return li;
        }
    }, {
        key: '_fixInputWidth',
        value: function _fixInputWidth() {
            this._searchInput.style.width = (this._searchInput.value.length + 2) * .55 + 'em';
        }
    }, {
        key: '_showAllChoices',
        value: function _showAllChoices() {
            var _this6 = this;

            var list = document.createElement('ul');
            list.className = 'ch-autocomplete-choices-all';

            this._value.forEach(function (v) {
                var choice = _this6._drawSingleChoice(v);
                list.appendChild(choice);
            });

            var clear = document.createElement('li');
            clear.className = 'ch-autocomplete-remove-all';
            clear.innerText = 'Limpiar';
            list.appendChild(clear);

            tiny.on(clear, 'click', function (e) {
                _this6.clear();
            });

            this._choicesList.parentNode.insertBefore(list, this._choicesList.nextSibling);
        }

        /**
         * Turns on the ability off listen the keystrokes
         * @memberof! ch.Autocomplete.prototype
         * @function
         * @private
         * @returns {autocomplete}
         */

    }, {
        key: '_turn',
        value: function _turn(turn) {
            var that = this;

            if (!this._enabled || this._isOn) {
                return this;
            }

            function turnOn() {
                that._isOn = true;

                that._currentQuery = that.trigger.value.trim();

                // when the user writes
                window.clearTimeout(that._stopTyping);

                that._stopTyping = window.setTimeout(function () {

                    tiny.addClass(that.trigger, that.getClassname(that._options.loadingClass));
                    /**
                     * Event emitted when the user is typing.
                     * @event ch.Autocomplete#type
                     * @example
                     * // Subscribe to "type" event with ajax call
                     * autocomplete.on('type', function (userInput) {
                     *      $.ajax({
                     *          'url': '/countries?q=' + userInput,
                     *          'dataType': 'json',
                     *          'success': function (response) {
                     *              autocomplete.suggest(response);
                     *          }
                     *      });
                     * });
                     * @example
                     * // Subscribe to "type" event with jsonp
                     * autocomplete.on('type', function (userInput) {
                     *       $.ajax({
                     *           'url': '/countries?q='+ userInput +'&callback=parseResults',
                     *           'dataType': 'jsonp',
                     *           'cache': false,
                     *           'global': true,
                     *           'context': window,
                     *           'jsonp': 'parseResults',
                     *           'crossDomain': true
                     *       });
                     * });
                     */
                    that.emit('type', that._currentQuery);
                }, that._options.keystrokesTime);
            }

            function turnOnFallback(e) {
                if (specialKeyCodeMap[e.which || e.keyCode]) {
                    return;
                }
                // When keydown is fired that.trigger still has an old value
                setTimeout(turnOn, 1);
            }

            this._originalQuery = this.trigger.value;

            // IE8 don't support the input event at all
            // IE9 is the only browser that doesn't fire the input event when characters are removed
            var ua = navigator.userAgent;
            var MSIE = /(msie|trident)/i.test(ua) ? ua.match(/(msie |rv:)(\d+(.\d+)?)/i)[2] : false;

            if (turn === 'on') {
                if (!MSIE || MSIE > 9) {
                    tiny.on(this.trigger, tiny.onkeyinput, turnOn);
                } else {
                    'keydown cut paste'.split(' ').forEach(function (evtName) {
                        tiny.on(that.trigger, evtName, turnOnFallback);
                    });
                }
            } else if (turn === 'off') {
                that._isOn = false;
                this.hide();
                if (!MSIE || MSIE > 9) {
                    tiny.off(this.trigger, tiny.onkeyinput, turnOn);
                } else {
                    'keydown cut paste'.split(' ').forEach(function (evtName) {
                        tiny.off(that.trigger, evtName, turnOnFallback);
                    });
                }
            }

            return this;
        }
    }, {
        key: '_selectSuggestion',


        /**
         * It sets to the HTMLInputElement the selected query and it emits a 'select' event.
         * @memberof! ch.Autocomplete.prototype
         * @function
         * @private
         * @returns {autocomplete}
         */
        value: function _selectSuggestion() {
            var _this7 = this;

            window.clearTimeout(this._stopTyping);

            if (this._highlighted === null) {
                return this;
            }

            if (!this._options.html) {
                // FIXME
                var parts = this._suggestions[this._highlighted].split(',');
                if (this._options.multiple) {
                    this._value.push(parts[0].trim());
                    this.trigger.value = '';

                    tiny.removeClass(this._choicesList, this.getClassname(this._options.choicesClass + '--empty'));

                    if (this._value.length > this._options.visibleChoicesLimit) {
                        this._clearChoices();

                        var summary = this._choicesList.querySelector('.ch-autocomplete-choices-summary');
                        var text = this._value.length + ' colonias';
                        if (summary) {
                            summary.querySelector('a').innerText = text;
                        } else {
                            var li = document.createElement('li');
                            li.className = 'ch-autocomplete-choices-summary';
                            li.innerHTML = '<a>' + text + '</a>';
                            var inputWrapper = this._searchInput.parentNode;
                            inputWrapper.parentNode.insertBefore(li, inputWrapper);

                            tiny.on(li.querySelector('a'), 'click', function (e) {
                                e.preventDefault();
                                var a = e.target;
                                if (a.getAttribute('data-opened')) {
                                    a.removeAttribute('data-opened');
                                    a.innerText = _this7._value.length + ' colonias';
                                    var list = _this7._wrapper.querySelector('.ch-autocomplete-choices-all');
                                    list.parentNode.removeChild(list);
                                } else {
                                    a.setAttribute('data-opened', true);
                                    a.innerText = 'Ocultar selección';
                                    _this7._showAllChoices();
                                }
                            });
                        }
                    } else {
                        var choice = this._drawSingleChoice(parts[0].trim());
                        var _inputWrapper = this._searchInput.parentNode;
                        _inputWrapper.parentNode.insertBefore(choice, _inputWrapper);
                    }
                } else {
                    this._value = parts[0].trim();
                    this.trigger.value = this._value;
                }
            }

            if (this._options.multiple) {
                this.suggest([]);
                this._fixInputWidth();
                this._turn('off');
                setTimeout(function () {
                    _this7._searchInput.focus();
                }, 10);
            } else if (this._options.closeOnSelect) {
                this._isOn = false;
                this.trigger.blur();
            }

            /**
             * Event emitted when a suggestion is selected.
             * @event ch.Autocomplete#select
             * @example
             * // Subscribe to "select" event.
             * autocomplete.on('select', function () {
             *     // Some code here!
             * });
             */
            this.emit('select', this._suggestions[this._highlighted], this._highlighted);

            return this;
        }
    }, {
        key: '_toogleHighlighted',


        /**
         * It highlights the item adding the "ch-autocomplete-highlighted" class name or the class name that you configured as "highlightedClass" option.
         * @memberof! ch.Autocomplete.prototype
         * @function
         * @private
         * @returns {autocomplete}
         */
        value: function _toogleHighlighted() {
            // null is when is not a selected item but,
            // increments 1 _highlighted because aria-posinset starts in 1 instead 0 as the collection that stores the data
            var highlightedClassName = this.getClassname(this._options.highlightedClass),
                current = this._highlighted === null ? null : this._highlighted + 1,
                currentItem = this.container.querySelector('[aria-posinset="' + current + '"]'),
                selectedItem = this.container.querySelector('[aria-posinset].' + highlightedClassName);

            if (selectedItem !== null) {
                // background the highlighted item
                tiny.removeClass(selectedItem, highlightedClassName);
            }

            if (currentItem !== null) {
                // highlight the selected item
                tiny.addClass(currentItem, highlightedClassName);
            }

            return this;
        }
    }, {
        key: '_configureShortcuts',
        value: function _configureShortcuts() {
            var _this8 = this;

            /**
             * Reference to context of an instance.
             * @type {Object}
             * @private
             */
            var that = this;

            tiny.on(this.trigger, 'keyup', function (e) {
                var key = e.which || e.keyCode;
                var value = void 0;

                switch (key) {
                    case KEYS.ENTER:
                        that._selectSuggestion();
                        break;
                    case KEYS.ESC:
                        that.hide();
                        that.trigger.value = that._originalQuery;
                        break;
                    case KEYS.DOWN:
                        // change the selected value & stores the future HTMLInputElement value
                        if (that._highlighted >= that._suggestionsQuantity - 1) {
                            that._highlighted = null;
                            value = that._currentQuery;
                        } else {
                            that._highlighted = that._highlighted === null ? 0 : that._highlighted + 1;
                            value = that._suggestions[that._highlighted];
                        }

                        that._toogleHighlighted();

                        if (!that._options.html && !_this8._options.multiple) {
                            // FIXME
                            var parts = value.split(',');
                            that.trigger.value = parts[0].trim();
                        }
                        break;
                    case KEYS.UP:
                        // change the selected value & stores the future HTMLInputElement value
                        if (that._highlighted === null) {

                            that._highlighted = that._suggestionsQuantity - 1;
                            value = that._suggestions[that._highlighted];
                        } else if (that._highlighted <= 0) {
                            that._highlighted = null;
                            value = that._currentQuery;
                        } else {
                            that._highlighted -= 1;
                            value = that._suggestions[that._highlighted];
                        }

                        that._toogleHighlighted();

                        if (!that._options.html && !_this8._options.multiple) {
                            // FIXME
                            var _parts = value.split(',');
                            that.trigger.value = _parts[0].trim();
                        }
                        break;
                }

                if ([KEYS.ENTER, KEYS.DOWN, KEYS.UP].indexOf(key) > -1) {
                    e.preventDefault();
                }
            });

            tiny.on(this.trigger, 'keydown', function (e) {
                var key = e.which || e.keyCode;

                if (key === KEYS.BACKSPACE && _this8.trigger.value.length === 0) {
                    _this8.clear();
                }
            });

            /*
            // Shortcuts
            ch.shortcuts.add(ch.onkeyenter, this.uid, function (event) {
                event.preventDefault();
                that._selectSuggestion();
            });
             ch.shortcuts.add(ch.onkeyesc, this.uid, function () {
                that.hide();
                that._el.value = that._originalQuery;
            });
             ch.shortcuts.add(ch.onkeyuparrow, this.uid, function (event) {
                event.preventDefault();
                 var value;
                 // change the selected value & stores the future HTMLInputElement value
                if (that._highlighted === null) {
                     that._highlighted = that._suggestionsQuantity - 1;
                    value = that._suggestions[that._highlighted];
                 } else if (that._highlighted <= 0) {
                     this._prevHighlighted = this._currentHighlighted = null;
                    value = that._currentQuery;
                 } else {
                     that._highlighted -= 1;
                    value = that._suggestions[that._highlighted];
                 }
                 that._toogleHighlighted();
                 if (!that._options.html) {
                    that._el.value = value;
                }
             });
             ch.shortcuts.add(ch.onkeydownarrow, this.uid, function () {
                var value;
                 // change the selected value & stores the future HTMLInputElement value
                if (that._highlighted === null) {
                     that._highlighted = 0;
                     value = that._suggestions[that._highlighted];
                 } else if (that._highlighted >= that._suggestionsQuantity - 1) {
                     that._highlighted = null;
                    value = that._currentQuery;
                 } else {
                     that._highlighted += 1;
                    value = that._suggestions[that._highlighted];
                 }
                 that._toogleHighlighted();
                 if (!that._options.html) {
                    that._el.value = value;
                }
             });
            */

            // Activate the shortcuts for this instance
            this._popover.on('show', function () {
                console.log('show');
            });

            // Deactivate the shortcuts for this instance
            this._popover.on('hide', function () {
                console.log('hide');
            });

            this.on('destroy', function () {
                ch.shortcuts.remove(this.uid);
            });

            return this;
        }
    }, {
        key: 'suggest',


        /**
         * Add suggestions to be shown.
         * @memberof! ch.Autocomplete.prototype
         * @function
         * @returns {autocomplete}
         * @example
         * // The suggest method needs an Array of strings to work with default configuration
         * autocomplete.suggest(['Aruba','Armenia','Argentina']);
         * @example
         * // To work with html configuration, it needs an Array of strings. Each string must to be as you wish you watch it
         * autocomplete.suggest([
         *  '<strong>Ar</strong>uba <i class="flag-aruba"></i>',
         *  '<strong>Ar</strong>menia <i class="flag-armenia"></i>',
         *  '<strong>Ar</strong>gentina <i class="flag-argentina"></i>'
         * ]);
         */
        value: function suggest(suggestions, data) {
            var _this9 = this;

            /**
             * Reference to context of an instance.
             * @type {Object}
             * @private
             */
            var that = this,
                items = [],
                matchedRegExp = new RegExp('(' + this._currentQuery.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1') + ')', 'ig'),
                totalItems = void 0,
                itemDOMCollection = void 0,
                itemTemplate = this._options._itemTemplate,
                suggestedItem = void 0,
                term = void 0,
                suggestionsLength = suggestions.length,
                el = void 0,
                highlightedClassName = this.getClassname(this._options.highlightedClass),
                itemSelected = this.container.querySelector('.' + highlightedClassName);

            // hide the loading feedback
            tiny.removeClass(this.trigger, that.getClassname(that._options.loadingClass));

            // hides the suggestions list
            if (suggestionsLength === 0) {
                this._popover.hide();

                setTimeout(function () {
                    // Reset suggestions collection.
                    _this9._suggestions = [];
                    _this9._suggestionsList.innerHTML = '';
                    that._highlighted = null;
                }, 50);

                return this;
            }

            // shows the suggestions list when the is closed and the element is withs focus
            if (!this._popover.isShown() && window.document.activeElement === this.trigger) {
                this._popover.show();
            }

            // remove the class from the extra added items
            if (itemSelected !== null) {
                tiny.removeClass(itemSelected, highlightedClassName);
            }

            // add each suggested item to the suggestion list
            for (suggestedItem = 0; suggestedItem < suggestionsLength; suggestedItem += 1) {
                // get the term to be replaced
                term = suggestions[suggestedItem];

                // for the html configured component doesn't highlight the term matched it must be done by the user
                if (!that._options.html) {
                    term = term.replace(matchedRegExp, '<strong>$1</strong>');
                    itemTemplate = this._options._itemTemplate.replace('{{suggestedData}}', ' data-suggested="' + suggestions[suggestedItem] + '"');
                }

                items.push(itemTemplate.replace('{{term}}', term));
            }

            this._suggestionsList.innerHTML = items.join('');

            itemDOMCollection = this.container.querySelectorAll('.' + this.getClassname(this._options.itemClass));

            // with this we set the aria-setsize value that counts the total
            totalItems = itemDOMCollection.length;

            // Reset suggestions collection.
            this._suggestions = [];

            for (suggestedItem = 0; suggestedItem < totalItems; suggestedItem += 1) {
                el = itemDOMCollection[suggestedItem];

                // add the data to the suggestions collection
                that._suggestions.push(el.getAttribute('data-suggested'));

                el.setAttribute('aria-posinset', that._suggestions.length);
                el.setAttribute('aria-setsize', totalItems);
            }

            this._suggestionsData = data ? data : this._suggestions;

            this._highlighted = null;

            this._suggestionsQuantity = this._suggestions.length;

            return this;
        }
    }, {
        key: 'hide',


        /**
         * Hides component's container.
         * @memberof! ch.Autocomplete.prototype
         * @function
         * @returns {autocomplete}
         * @example
         * // Hides the autocomplete.
         * autocomplete.hide();
         */
        value: function hide() {

            if (!this._enabled) {
                return this;
            }

            this._popover.hide();

            /**
             * Event emitted when the Autocomplete container is hidden.
             * @event ch.Autocomplete#hide
             * @example
             * // Subscribe to "hide" event.
             * autocomplete.on('hide', function () {
             *  // Some code here!
             * });
             */
            this.emit('hide');

            return this;
        }
    }, {
        key: 'isShown',


        /**
         * Returns a Boolean if the component's core behavior is shown. That means it will return 'true' if the component is on and it will return false otherwise.
         * @memberof! ch.Autocomplete.prototype
         * @function
         * @returns {Boolean}
         * @example
         * // Execute a function if the component is shown.
         * if (autocomplete.isShown()) {
         *     fn();
         * }
         */
        value: function isShown() {
            return this._popover.isShown();
        }
    }, {
        key: 'disable',
        value: function disable() {
            if (this.isShown()) {
                this.hide();
                this._isOn = false;
                this._el.blur();
            }

            _get(Object.getPrototypeOf(Autocomplete.prototype), 'disable', this).call(this);

            return this;
        }
    }, {
        key: 'destroy',


        /**
         * Destroys an Autocomplete instance.
         * @memberof! ch.Autocomplete.prototype
         * @function
         * @example
         * // Destroying an instance of Autocomplete.
         * autocomplete.destroy();
         */
        value: function destroy() {

            tiny.off(this.container, highlightEvent, this._highlightSuggestion);

            this.trigger.removeAttribute('autocomplete');
            this.trigger.removeAttribute('aria-autocomplete');
            this.trigger.removeAttribute('aria-haspopup');
            this.trigger.removeAttribute('aria-owns');

            this._popover.destroy();

            _get(Object.getPrototypeOf(Autocomplete.prototype), 'destroy', this).call(this);

            return;
        }
    }]);

    return Autocomplete;
}(_component2.default);

/**
 * Get closest DOM element up the tree that contains a class, ID, or data attribute
 *
 * @param  {Node} elem The base element
 * @param  {String} selector The class, id, data attribute, or tag to look for
 * @return {Node} Null if no match
 */


Autocomplete._defaults = {
    'loadingClass': 'autocomplete-loading',
    'highlightedClass': 'autocomplete-highlighted',
    'itemClass': 'autocomplete-item',
    'choicesClass': 'autocomplete-choices',
    'addClass': 'box-lite autocomplete',
    'side': 'bottom',
    'align': 'left',
    'html': false,
    '_hiddenby': 'none',
    'keystrokesTime': 150,
    '_itemTemplate': '<li class="{{itemClass}}"{{suggestedData}}>{{term}}<i class="ch-icon-arrow-up" data-js="ch-autocomplete-complete-query"></i></li>',
    'wrapper': false,
    'multiple': false,
    'visibleChoicesLimit': 1,
    'closeOnSelect': true,
    'showFilters': true,
    'i18n': {
        hide_choices: 'Ocultar selección',
        choice: 'colonia',
        choices: 'colonias'
    }
};
var closestParent = function closestParent(elem, selector) {
    var firstChar = selector.charAt(0);

    // Get closest match
    for (; elem && elem !== document; elem = elem.parentNode) {

        // If selector is a class
        if (firstChar === '.') {
            if (elem.classList.contains(selector.substr(1))) {
                return elem;
            }
        }

        // If selector is an ID
        if (firstChar === '#') {
            if (elem.id === selector.substr(1)) {
                return elem;
            }
        }

        // If selector is a data attribute
        if (firstChar === '[') {
            if (elem.hasAttribute(selector.substr(1, selector.length - 2))) {
                return elem;
            }
        }

        // If selector is a tag
        if (elem.tagName.toLowerCase() === selector) {
            return elem;
        }
    }

    return null;
};

exports.default = Autocomplete;

},{"./component":7,"./popover":8}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventEmitter = require('tiny.js/lib/eventEmitter');

var _eventEmitter2 = _interopRequireDefault(_eventEmitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var uid = 0;

/**
 * Base class for all components.
 *
 * @class
 * @augments tiny.EventEmitter
 * @param {HTMLElement} [el] It must be a HTMLElement.
 * @param {Object} [options] Configuration options.
 * @returns {component} Returns a Component class.
 *
 * @example
 * // Create a new Component.
 * import Component from './modules/component';
 * let component = new Component();
 * let component = new Component('.my-component', {'option': 'value'});
 * let component = new Component('.my-component');
 * let component = new Component({'option': 'value'});
 */

var Component = function (_EventEmitter) {
    _inherits(Component, _EventEmitter);

    function Component(el, options) {
        _classCallCheck(this, Component);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Component).call(this));

        console.log('component init');

        // Set emitter to zero for unlimited listeners to avoid the warning in console
        // @see https://nodejs.org/api/events.html#events_emitter_setmaxlisteners_n
        _this.setMaxListeners(0);

        if (el === null) {
            throw new Error('The "el" parameter is not present in the DOM');
        }

        /**
         * A unique id to identify the instance of a component.
         * @type {Number}
         */
        _this.uid = uid += 1;

        // el is HTMLElement
        // IE8 and earlier don't define the node type constants, 1 === document.ELEMENT_NODE
        if (el !== undefined && el.nodeType === 1) {
            _this._el = el;

            // set the uid to the element to help search for the instance in the collection instances
            _this._el.setAttribute('data-uid', _this.uid);

            _this._options = tiny.extend({}, Component._defaults, options);

            // el is an object configuration
        } else if (el === undefined || el.nodeType === undefined && (typeof el === 'undefined' ? 'undefined' : _typeof(el)) === 'object') {

                // creates a empty element because the user is not set a DOM element to use, but we requires one
                // this._el = document.createElement('div');

                _this._options = tiny.extend({}, Component._defaults, el);
            } else {
                _this._options = tiny.clone(Component._defaults);
            }

        /**
         * Indicates is the component is enabled.
         * @type {Boolean}
         * @private
         */
        _this._enabled = true;

        /**
         * Event emitted when the component is ready to use.
         * @event Component#ready
         * @example
         * // Subscribe to "ready" event.
         * component.on('ready', function () {
         *     // Some code here!
         * });
         */
        setTimeout(function () {
            _this.emit('ready');
        }, 1);
        return _this;
    }

    /**
     * Component default configuration.
     * @type {Object}
     * @private
     */


    _createClass(Component, [{
        key: 'inject',


        /**
         * Inject functionality or abilities from another components.
         *
         * @function
         * @params {...Function} mixins List of mixins to be injected
         * @example
         * let component = new Component();
         * component.inject(Content, Collapsible);
         */
        value: function inject() {
            var _this2 = this;

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            args.forEach(function (arg) {
                if (typeof arg === 'function') {
                    arg.call(_this2);
                }
            });

            return this;
        }
    }, {
        key: 'getClassname',


        /**
         * Generates the complete class name including the namespace
         *
         * @param basename
         * @returns {string}
         */
        value: function getClassname(basename) {
            var _this3 = this;

            var parts = basename.split(' ').map(function (part) {
                return part.trim();
            }).filter(function (part) {
                return !!part;
            }).map(function (part) {
                return _this3._options.ns + part;
            });

            return parts.join(' ');
        }

        /**
         * Enables an instance of Component.
         *
         * @function
         * @returns {component}
         *
         * @example
         * // Enabling an instance of Component.
         * component.enable();
         */

    }, {
        key: 'enable',
        value: function enable() {
            this._enabled = true;

            /**
             * Emits when a component is enabled.
             *
             * @event Component#enable
             *
             * @example
             * // Subscribe to "enable" event.
             * component.on('enable', function () {
             *     // Some code here!
             * });
             */
            this.emit('enable');

            return this;
        }
    }, {
        key: 'disable',


        /**
         * Disables an instance of Component.
         *
         * @function
         * @returns {component}
         *
         * @example
         * // Disabling an instance of Component.
         * component.disable();
         */
        value: function disable() {
            this._enabled = false;

            /**
             * Emits when a component is disable.
             *
             * @event Component#disable
             *
             * @example
             * // Subscribe to "disable" event.
             * component.on('disable', function () {
             *     // Some code here!
             * });
             */
            this.emit('disable');

            return this;
        }
    }, {
        key: 'destroy',


        /**
         * Destroys an instance of Component and remove its data from asociated element.
         *
         * @function
         *
         * @example
         * // Destroy a component
         * component.destroy();
         * // Empty the component reference
         * component = undefined;
         */
        value: function destroy() {
            this.disable();

            if (this._el) {
                this._el.removeAttribute('data-uid');
            }

            /**
             * Emits when a component is destroyed.
             *
             * @event Component#destroy
             *
             * @example
             * // Subscribe to "destroy" event.
             * component.on('destroy', function () {
             *     // Some code here!
             * });
             */
            this.emit('destroy');

            return;
        }
    }]);

    return Component;
}(_eventEmitter2.default);

Component._defaults = {
    ns: 'ch-'
};
exports.default = Component;

},{"tiny.js/lib/eventEmitter":2}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _component = require('./component');

var _component2 = _interopRequireDefault(_component);

var _positioner = require('./positioner');

var _positioner2 = _interopRequireDefault(_positioner);

var _viewport = require('./viewport');

var _viewport2 = _interopRequireDefault(_viewport);

var _collapsible = require('../mixins/collapsible');

var _collapsible2 = _interopRequireDefault(_collapsible);

var _content = require('../mixins/content');

var _content2 = _interopRequireDefault(_content);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var shownbyEvent = {
    'pointertap': tiny.onpointertap,
    'pointerenter': tiny.onpointerenter
};

/**
 * Popover is the basic unit of a dialog window.

 * @constructor
 * @augments Component
 * @mixes Collapsible
 * @mixes Content
 * @requires Positioner
 * @param {HTMLElement} el A HTMLElement to create an instance of Popover.
 * @param {Object} [options] Options to customize an instance.
 * @param {String} [options.addClass] CSS class names that will be added to the container on the component initialization.
 * @param {String} [options.fx] Enable or disable UI effects. You must use: "slideDown", "fadeIn" or "none". Default: "fadeIn".
 * @param {String} [options.width] Set a width for the container. Default: "auto".
 * @param {String} [options.height] Set a height for the container. Default: "auto".
 * @param {String} [options.shownby] Determines how to interact with the trigger to show the container. You must use: "pointertap", "pointerenter" or "none". Default: "pointertap".
 * @param {String} [options.hiddenby] Determines how to hide the component. You must use: "button", "pointers", "pointerleave", "all" or "none". Default: "button".
 * @param {HTMLElement} [options.reference] It's a HTMLElement reference to position and size of element that will be considered to carry out the position. Default: the trigger element.
 * @param {String} [options.side] The side option where the target element will be positioned. Its value can be: "left", "right", "top", "bottom" or "center". Default: "center".
 * @param {String} [options.align] The align options where the target element will be positioned. Its value can be: "left", "right", "top", "bottom" or "center". Default: "center".
 * @param {Number} [options.offsetX] Distance to displace the target horizontally. Default: 0.
 * @param {Number} [options.offsetY] Distance to displace the target vertically. Default: 0.
 * @param {String} [options.position] The type of positioning used. Its value must be "absolute" or "fixed". Default: "absolute".
 * @param {String} [options.method] The type of request ("POST" or "GET") to load content by ajax. Default: "GET".
 * @param {String} [options.params] Params like query string to be sent to the server.
 * @param {Boolean} [options.cache] Force to cache the request by the browser. Default: true.
 * @param {Boolean} [options.async] Force to sent request asynchronously. Default: true.
 * @param {(String | HTMLElement)} [options.waiting] Temporary content to use while the ajax request is loading. Default: '&lt;div class="ch-loading ch-loading-centered"&gt;&lt;/div&gt;'.
 * @param {(String | HTMLElement)} [options.content] The content to be shown into the Popover container.
 * @param {(Boolean | String)} [options.wrapper] Wrap the reference element and place the container into it instead of body. When value is a string it will be applied as additional wrapper class. Default: false.
 *
 * @returns {popover} Returns a new instance of Popover.
 *
 * @example
 * // Create a new Popover.
 * var popover = new Popover([el], [options]);
 * @example
 * // Create a new Popover with disabled effects.
 * var popover = new Popover(el, {
     *     'fx': 'none'
     * });
 * @example
 * // Create a new Popover using the shorthand way (content as parameter).
 * var popover = new Popover(document.querySelector('.popover'), {'content': 'http://ui.ml.com:3040/ajax'});
 */

var Popover = function (_Component) {
    _inherits(Popover, _Component);

    function Popover(el, options) {
        _classCallCheck(this, Popover);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Popover).call(this, el, options));

        _this.hide = function () {
            var self = _this;
            // Don't execute when it's disabled
            if (!_this._enabled || !_this._shown) {
                return _this;
            }

            // Detach the container from the DOM when it is hidden
            _this.once('hide', function () {
                // Due to transitions this._shown can be outdated here
                var parent = self.container.parentNode;
                if (parent !== null) {
                    parent.removeChild(self.container);
                }
            });

            // Close the collapsible
            _this._hide();

            return _this;
        };

        _this._init(el, options);
        return _this;
    }

    /**
     * Default Popover configuration.
     *
     * @type {Object}
     * @private
     */


    _createClass(Popover, [{
        key: '_init',


        /**
         * Initialize a new instance of Popover and merge custom options with defaults options.
         * @memberof! Popover.prototype
         * @function
         * @private
         * @returns {popover}
         */
        value: function _init(el, options) {
            var _this2 = this;

            if (el === undefined || !el.nodeType && (typeof el === 'undefined' ? 'undefined' : _typeof(el)) === 'object') {
                options = el;
            }

            tiny.extend(this._options, Popover._defaults, options);

            console.log(this._options, options);

            this.inject(_collapsible2.default, _content2.default);

            /**
             * Reference to context of an instance.
             * @type {Object}
             * @private
             */
            var container = document.createElement('div');

            this._configureWrapper();

            container.innerHTML = ['<div', ' class="' + this.getClassname('popover hide') + ' ' + this.getClassname(this._options._className) + ' ' + this.getClassname(this._options.addClass) + ' ' + (tiny.support.transition && this._options.fx !== 'none' && this._options.fx !== false ? this.getClassname('fx') : '') + '"', ' role="' + this._options._ariaRole + '"', ' id="' + this.getClassname(this.constructor.name.toLowerCase() + '-' + this.uid) + '"', ' style="width:' + this._options.width + ';height:' + this._options.height + '"', '></div>'].join('');

            /**
             * The popover container. It's the element that will be shown and hidden.
             * @type {HTMLDivElement}
             */
            this.container = container.querySelector('div');

            tiny.on(this.container, tiny.onpointertap, function (event) {
                event.stopPropagation();
            });

            /**
             * Element where the content will be added.
             * @private
             * @type {HTMLDivElement}
             */
            this._content = document.createElement('div');

            tiny.addClass(this._content, this.getClassname('popover-content'));

            this.container.appendChild(this._content);

            // Add functionality to the trigger if it exists
            this._configureTrigger();

            var positionerOpts = {
                'target': this.container,
                'reference': this._options.reference,
                'side': this._options.side,
                'align': this._options.align,
                'offsetX': this._options.offsetX,
                'offsetY': this._options.offsetY,
                'position': this._options.position
            };

            this._positioner = new _positioner2.default(positionerOpts);

            /**
             * Handler to execute the positioner refresh() method on layout changes.
             * @private
             * @function
             * @todo Define this function on prototype and use bind(): $document.on(ch.onlayoutchange, this.refreshPosition.bind(this));
             */
            this._refreshPositionListener = function () {
                if (_this2._shown) {
                    _this2._positioner.refresh(positionerOpts);
                }

                return _this2;
            };

            this._hideTimer = function () {
                _this2._timeout = window.setTimeout(function () {
                    _this2.hide();
                }, _this2._options._hideDelay);
            };

            this._hideTimerCleaner = function () {
                window.clearTimeout(_this2._timeout);
            };

            // Configure the way it hides
            this._configureHiding();

            // Refresh position:
            // on layout change
            tiny.on(document, tiny.onlayoutchange, this._refreshPositionListener);
            // on resize
            _viewport2.default.on(tiny.onresize, this._refreshPositionListener);

            this.once('_show', this._refreshPositionListener)
            // on content change
            .on('_contentchange', this._refreshPositionListener);

            return this;
        }
    }, {
        key: '_configureTrigger',


        /**
         * Adds functionality to the trigger. When a non-trigger popover is initialized, this method isn't executed.
         * @memberof! Popover.prototype
         * @private
         * @function
         */
        value: function _configureTrigger() {

            if (this._el === undefined) {
                return;
            }

            /**
             * Reference to context of an instance.
             * @type {Object}
             * @private
             */
            // It will be triggered on pointertap/pointerenter of the $trigger
            // It can toggle, show, or do nothing (in specific cases)
            var showHandler = function () {
                var _this3 = this;

                // Toggle as default
                var fn = this._toggle;
                // When a Popover is shown on pointerenter, it will set a timeout to manage when
                // to close the component. Avoid to toggle and let choise when to close to the timer
                if (this._options.shownby === 'pointerenter' || this._options.hiddenby === 'none' || this._options.hiddenby === 'button') {
                    fn = function fn() {
                        if (!_this3._shown) {
                            _this3.show();
                        }
                    };
                }

                return fn;
            }.bind(this)();

            /**
             * The original and entire element and its state, before initialization.
             * @private
             * @type {HTMLDivElement}
             */
            // cloneNode(true) > parameters is required. Opera & IE throws and internal error. Opera mobile breaks.
            this._snippet = this._el.cloneNode(true);

            // Use the trigger as the positioning reference
            this._options.reference = this._options.reference || this._el;

            // Open event when configured as able to shown anyway
            if (this._options.shownby !== 'none') {

                tiny.addClass(this._el, this.getClassname('shownby-' + this._options.shownby));

                if (this._options.shownby === shownbyEvent.pointertap && navigator.pointerEnabled) {
                    tiny.on(this._el, 'click', function (e) {
                        e.preventDefault();
                    });
                }

                tiny.on(this._el, shownbyEvent[this._options.shownby], function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    showHandler();
                });
            }

            // Get a content if it's not defined
            if (this._options.content === undefined) {
                // Content from anchor href
                // IE defines the href attribute equal to src attribute on images.
                if (this._el.nodeName === 'A' && this._el.href !== '') {
                    this._options.content = this._el.href;

                    // Content from title or alt
                } else if (this._el.title !== '' || this._el.alt !== '') {
                        // Set the configuration parameter
                        this._options.content = this._el.title || this._el.alt;
                        // Keep the attributes content into the element for possible usage
                        this._el.setAttribute('data-title', this._options.content);
                        // Avoid to trigger the native tooltip
                        this._el.title = this._el.alt = '';
                    }
            }

            // Set WAI-ARIA
            this._el.setAttribute('aria-owns', this.getClassname(this.constructor.name.toLowerCase() + '-' + this.uid));
            this._el.setAttribute('aria-haspopup', 'true');

            /**
             * The popover trigger. It's the element that will show and hide the container.
             * @type {HTMLElement}
             */
            this.trigger = this._el;
        }
    }, {
        key: '_configureHiding',


        /**
         * Determines how to hide the component.
         * @memberof! Popover.prototype
         * @private
         * @function
         */
        value: function _configureHiding() {
            var _this4 = this;

            /**
             * Reference to context of an instance.
             * @type {Object}
             * @private
             */
            var hiddenby = this._options.hiddenby,
                dummy,
                button;

            // Don't hide anytime
            if (hiddenby === 'none') {
                return;
            }

            // Hide by leaving the component
            if (hiddenby === 'pointerleave' && this.trigger !== undefined) {

                [this.trigger, this.container].forEach(function (el) {
                    tiny.on(el, tiny.onpointerenter, _this4._hideTimerCleaner);
                });
                [this.trigger, this.container].forEach(function (el) {
                    tiny.on(el, tiny.onpointerleave, _this4._hideTimer);
                });
            }

            // Hide with the button Close
            if (hiddenby === 'button' || hiddenby === 'all') {
                dummy = document.createElement('div');
                dummy.innerHTML = '<i class="' + this.getClassname('close') + '" role="button" aria-label="Close"></i>';
                button = dummy.querySelector('i');

                tiny.on(button, tiny.onpointertap, function () {
                    _this4.hide();
                });

                this.container.insertBefore(button, this.container.firstChild);
            }

            if ((hiddenby === 'pointers' || hiddenby === 'all') && this._hidingShortcuts !== undefined) {
                this._hidingShortcuts();
            }
        }
    }, {
        key: '_normalizeOptions',


        /**
         * Creates an options object from the parameters arriving to the constructor method.
         * @memberof! Popover.prototype
         * @private
         * @function
         */
        value: function _normalizeOptions(options) {
            // IE8 and earlier don't define the node type constants, 1 === document.ELEMENT_NODE
            if (typeof options === 'string' || (typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object' && options.nodeType === 1) {
                options = {
                    'content': options
                };
            }
            return options;
        }
    }, {
        key: '_configureWrapper',


        /**
         * Wraps the target element and use the wrapper as the placement for container
         * @memberof! Popover.prototype
         * @private
         * @function
         */
        value: function _configureWrapper() {
            var _this5 = this;

            var target = this._el || this._options.reference,
                wrapper = this._options.wrapper;

            if (wrapper && target && target.nodeType === 1) {
                // Create the wrapper element and append to it
                wrapper = document.createElement('span');
                tiny.addClass(wrapper, this.getClassname('popover-wrapper'));

                if (typeof this._options.wrapper === 'string') {
                    this._options.wrapper.split(' ').forEach(function (className) {
                        tiny.addClass(wrapper, _this5.getClassname(className));
                    });
                }

                tiny.parent(target).insertBefore(wrapper, target);
                wrapper.appendChild(target);
                if (tiny.css(wrapper, 'position') === 'static') {
                    tiny.css(wrapper, {
                        display: 'inline-block',
                        position: 'relative'
                    });
                }

                this._containerWrapper = wrapper;
            } else {
                this._containerWrapper = document.body;
            }
        }
    }, {
        key: 'show',


        /**
         * Shows the popover container and appends it to the body.
         * @memberof! Popover.prototype
         * @function
         * @param {(String | HTMLElement)} [content] The content that will be used by popover.
         * @param {Object} [options] A custom options to be used with content loaded by ajax.
         * @param {String} [options.method] The type of request ("POST" or "GET") to load content by ajax. Default: "GET".
         * @param {String} [options.params] Params like query string to be sent to the server.
         * @param {Boolean} [options.cache] Force to cache the request by the browser. Default: true.
         * @param {Boolean} [options.async] Force to sent request asynchronously. Default: true.
         * @param {(String | HTMLElement)} [options.waiting] Temporary content to use while the ajax request is loading.
         * @returns {popover}
         * @example
         * // Shows a basic popover.
         * popover.show();
         * @example
         * // Shows a popover with new content
         * popover.show('Some new content here!');
         * @example
         * // Shows a popover with a new content that will be loaded by ajax with some custom options
         * popover.show('http://domain.com/ajax/url', {
         *     'cache': false,
         *     'params': 'x-request=true'
         * });
         */
        value: function show(content, options) {
            // Don't execute when it's disabled
            if (!this._enabled || this._shown) {
                return this;
            }

            // Append to the configured holder
            this._containerWrapper.appendChild(this.container);

            // Open the collapsible
            this._show();

            // Request the content
            if (content !== undefined) {
                this.content(content, options);
            }

            return this;
        }

        /**
         * Hides the popover container and deletes it from the body.
         * @memberof! Popover.prototype
         * @function
         * @returns {popover}
         * @example
         * // Close a popover
         * popover.hide();
         */

    }, {
        key: 'isShown',


        /**
         * Returns a Boolean specifying if the container is shown or not.
         * @memberof! Popover.prototype
         * @function
         * @returns {Boolean}
         * @example
         * // Check the popover status
         * popover.isShown();
         * @example
         * // Check the popover status after an user action
         * $(window).on(tiny.onpointertap, function () {
         *     if (popover.isShown()) {
         *         alert('Popover: visible');
         *     } else {
         *         alert('Popover: not visible');
         *     }
         * });
         */
        value: function isShown() {
            return this._shown;
        }
    }, {
        key: 'width',


        /**
         * Sets or gets the width of the container.
         * @memberof! Popover.prototype
         * @function
         * @param {String} [data] Set a width for the container.
         * @returns {(Number | popover)}
         * @example
         * // Set a new popover width
         * component.width('300px');
         * @example
         * // Get the current popover width
         * component.width(); // '300px'
         */
        value: function width(data) {

            if (data === undefined) {
                return this._options.width;
            }

            this.container.style.width = data;

            this._options.width = data;

            this.refreshPosition();

            return this;
        }
    }, {
        key: 'height',


        /**
         * Sets or gets the height of the container.
         * @memberof! Popover.prototype
         * @function
         * @param {String} [data] Set a height for the container.
         * @returns {(Number | popover)}
         * @example
         * // Set a new popover height
         * component.height('300px');
         * @example
         * // Get the current popover height
         * component.height(); // '300px'
         */
        value: function height(data) {

            if (data === undefined) {
                return this._options.height;
            }

            this.container.style.height = data;

            this._options.height = data;

            this.refreshPosition();

            return this;
        }
    }, {
        key: 'refreshPosition',


        /**
         * Updates the current position of the container with given options or defaults.
         * @memberof! Popover.prototype
         * @function
         * @params {Object} [options] A configuration object.
         * @returns {popover}
         * @example
         * // Update the current position
         * popover.refreshPosition();
         * @example
         * // Update the current position with a new offsetX and offsetY
         * popover.refreshPosition({
         *     'offestX': 100,
         *     'offestY': 10
         * });
         */
        value: function refreshPosition(options) {

            if (this._shown) {
                // Refresh its position.
                this._positioner.refresh(options);
            } else {
                // Update its options. It will update position the next time to be shown.
                this._positioner._configure(options);
            }

            return this;
        }
    }, {
        key: 'enable',


        /**
         * Enables a Popover instance.
         * @memberof! Popover.prototype
         * @function
         * @returns {popover}
         * @example
         * // Enable a popover
         * popover.enable();
         */
        value: function enable() {

            if (this._el !== undefined) {
                this._el.setAttribute('aria-disabled', false);
            }

            _get(Object.getPrototypeOf(Popover.prototype), 'enable', this).call(this);

            return this;
        }
    }, {
        key: 'disable',


        /**
         * Disables a Popover instance.
         * @memberof! Popover.prototype
         * @function
         * @returns {popover}
         * @example
         * // Disable a popover
         * popover.disable();
         */
        value: function disable() {

            if (this._el !== undefined) {
                this._el.setAttribute('aria-disabled', true);
            }

            if (this._shown) {
                this.hide();
            }

            _get(Object.getPrototypeOf(Popover.prototype), 'disable', this).call(this);

            return this;
        }
    }, {
        key: 'destroy',


        /**
         * Destroys a Popover instance.
         * @memberof! Popover.prototype
         * @function
         * @returns {popover}
         * @example
         * // Destroy a popover
         * popover.destroy();
         * // Empty the popover reference
         * popover = undefined;
         */
        value: function destroy() {
            var _this6 = this;

            if (this.trigger !== undefined) {

                tiny.off(this.trigger, tiny.onpointerenter, this._hideTimerCleaner);
                tiny.off(this.trigger, tiny.onpointerleave, this._hideTimer);

                ['data-title', 'aria-owns', 'aria-haspopup', 'data-side', 'data-align', 'role'].forEach(function (attr) {
                    _this6.trigger.removeAttribute(attr);
                });

                this._snippet.alt ? this.trigger.setAttribute('alt', this._snippet.alt) : null;
                this._snippet.title ? this.trigger.setAttribute('title', this._snippet.title) : null;
            }

            tiny.off(document, tiny.onlayoutchange, this._refreshPositionListener);

            _viewport2.default.removeListener(tiny.onresize, this._refreshPositionListener);

            _get(Object.getPrototypeOf(Popover.prototype), 'destroy', this).call(this);

            return;
        }
    }]);

    return Popover;
}(_component2.default);

Popover._defaults = {
    '_ariaRole': 'dialog',
    '_className': '',
    '_hideDelay': 400,
    'addClass': '',
    'fx': 'fadeIn',
    'width': 'auto',
    'height': 'auto',
    'shownby': 'pointertap',
    'hiddenby': 'button',
    'waiting': 'loading loading-centered',
    'position': 'absolute',
    'wrapper': false
};
exports.default = Popover;

},{"../mixins/collapsible":4,"../mixins/content":5,"./component":7,"./positioner":9,"./viewport":10}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _viewport = require('./viewport');

var _viewport2 = _interopRequireDefault(_viewport);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The Positioner lets you position elements on the screen and changes its positions.
 * @memberof ch
 * @constructor
 * @param {Object} options Configuration object.
 * @param {String} options.target A HTMLElement that reference to the element to be positioned.
 * @param {String} [options.reference] A HTMLElement that it's a reference to position and size of element that will be considered to carry out the position. If it isn't defined through configuration, it will be the viewport.
 * @param {String} [options.side] The side option where the target element will be positioned. You must use: "left", "right", "top", "bottom" or "center". Default: "center".
 * @param {String} [options.align] The align options where the target element will be positioned. You must use: "left", "right", "top", "bottom" or "center". Default: "center".
 * @param {Number} [options.offsetX] Distance to displace the target horizontally. Default: 0.
 * @param {Number} [options.offsetY] Distance to displace the target vertically. Default: 0.
 * @param {String} [options.position] Thethe type of positioning used. You must use: "absolute" or "fixed". Default: "fixed".
 * @requires ch.Viewport
 * @returns {positioner} Returns a new instance of Positioner.
 * @example
 * // Instance the Positioner It requires a little configuration.
 * // The default behavior place an element center into the Viewport.
 * var positioned = new ch.Positioner({
     *     'target': document.querySelector('.target'),
     *     'reference': document.querySelector('.reference'),
     *     'side': 'top',
     *     'align': 'left',
     *     'offsetX': 20,
     *     'offsetY': 10
     * });
 * @example
 * // offsetX: The Positioner could be configurated with an offsetX.
 * // This example show an element displaced horizontally by 10px of defined position.
 * var positioned = new ch.Positioner({
     *     'target': document.querySelector('.target'),
     *     'reference': document.querySelector('.reference'),
     *     'side': 'top',
     *     'align': 'left',
     *     'offsetX': 10
     * });
 * @example
 * // offsetY: The Positioner could be configurated with an offsetY.
 * // This example show an element displaced vertically by 10px of defined position.
 * var positioned = new ch.Positioner({
     *     'target': document.querySelector('.target'),
     *     'reference': document.querySelector('.reference'),
     *     'side': 'top',
     *     'align': 'left',
     *     'offsetY': 10
     * });
 * @example
 * // positioned: The positioner could be configured to work with fixed or absolute position value.
 * var positioned = new ch.Positioner({
     *     'target': document.querySelector('.target'),
     *     'reference': document.querySelector('.reference'),
     *     'position': 'fixed'
     * });
 */

var Positioner = function () {
    function Positioner(options) {
        _classCallCheck(this, Positioner);

        if (options === undefined) {
            throw new window.Error('Positioner: Expected options to be defined.');
        }
        this._options = {};

        // Init
        this._configure(options);
    }

    /**
     * Configuration by default.
     * @type {Object}
     * @private
     */


    _createClass(Positioner, [{
        key: '_configure',


        /**
         * Configures the positioner instance with a given options.
         * @memberof! ch.Positioner.prototype
         * @function
         * @private
         * @returns {positioner}
         * @params {Object} options A configuration object.
         */
        value: function _configure(options) {
            var defaults = tiny.clone(Positioner._defaults);

            this._options = tiny.extend(defaults, this._options, options);

            this._options.offsetX = parseInt(this._options.offsetX, 10);
            this._options.offsetY = parseInt(this._options.offsetY, 10);

            /**
             * Reference to the element to be positioned.
             * @type {HTMLElement}
             */
            this.target = options.target || this.target;

            /**
             * It's a reference to position and size of element that will be considered to carry out the position.
             * @type {HTMLElement}
             */
            this.reference = options.reference || this.reference;
            this._reference = this._options.reference;

            this.target.style.position = this._options.position;

            return this;
        }
    }, {
        key: 'refresh',


        /**
         * Updates the current position with a given options
         * @memberof! ch.Positioner.prototype
         * @function
         * @returns {positioner}
         * @params {Object} options A configuration object.
         * @example
         * // Updates the current position.
         * positioned.refresh();
         * @example
         * // Updates the current position with new offsetX and offsetY.
         * positioned.refresh({
         *     'offestX': 100,
         *     'offestY': 10
         * });
         */
        value: function refresh(options) {

            if (options !== undefined) {
                this._configure(options);
            }

            if (this._reference !== _viewport2.default) {
                this._calculateReference();
            }

            this._calculateTarget();

            // the object that stores the top, left reference to set to the target
            this._setPoint();

            return this;
        }
    }, {
        key: '_calculateReference',


        /**
         * Calculates the reference (element or viewport) of the position.
         * @memberof! ch.Positioner.prototype
         * @function
         * @private
         * @returns {positioner}
         */
        value: function _calculateReference() {

            var reference = this.reference,
                offset;

            reference.setAttribute('data-side', this._options.side);
            reference.setAttribute('data-align', this._options.align);

            this._reference = this._getOuterDimensions(reference);

            if (reference.offsetParent === this.target.offsetParent) {
                this._reference.left = reference.offsetLeft;
                this._reference.top = reference.offsetTop;
            } else {
                offset = tiny.offset(reference);
                this._reference.left = offset.left;
                this._reference.top = offset.top;
            }

            return this;
        }
    }, {
        key: '_calculateTarget',


        /**
         * Calculates the positioned element.
         * @memberof! ch.Positioner.prototype
         * @function
         * @private
         * @returns {positioner}
         */
        value: function _calculateTarget() {

            var target = this.target;
            target.setAttribute('data-side', this._options.side);
            target.setAttribute('data-align', this._options.align);

            this._target = this._getOuterDimensions(target);

            return this;
        }
    }, {
        key: '_getOuterDimensions',


        /**
         * Get the current outer dimensions of an element.
         *
         * @memberof ch.Positioner.prototype
         * @param {HTMLElement} el A given HTMLElement.
         * @returns {Object}
         */
        value: function _getOuterDimensions(el) {
            var obj = el.getBoundingClientRect();

            return {
                'width': obj.right - obj.left,
                'height': obj.bottom - obj.top
            };
        }
    }, {
        key: '_setPoint',


        /**
         * Calculates the points.
         * @memberof! ch.Positioner.prototype
         * @function
         * @private
         * @returns {positioner}
         */
        value: function _setPoint() {
            var side = this._options.side,
                orientation = side === 'top' || side === 'bottom' ? 'horizontal' : side === 'right' || side === 'left' ? 'vertical' : 'center',
                coors,
                orientationMap;

            // take the side and calculate the alignment and make the CSSpoint
            if (orientation === 'center') {
                // calculates the coordinates related to the center side to locate the target
                coors = {
                    'top': this._reference.top + (this._reference.height / 2 - this._target.height / 2),
                    'left': this._reference.left + (this._reference.width / 2 - this._target.width / 2)
                };
            } else if (orientation === 'horizontal') {
                // calculates the coordinates related to the top or bottom side to locate the target
                orientationMap = {
                    'left': this._reference.left,
                    'center': this._reference.left + (this._reference.width / 2 - this._target.width / 2),
                    'right': this._reference.left + this._reference.width - this._target.width,
                    'top': this._reference.top - this._target.height,
                    'bottom': this._reference.top + this._reference.height
                };

                coors = {
                    'top': orientationMap[side],
                    'left': orientationMap[this._options.align]
                };
            } else {
                // calculates the coordinates related to the right or left side to locate the target
                orientationMap = {
                    'top': this._reference.top,
                    'center': this._reference.top + (this._reference.height / 2 - this._target.height / 2),
                    'bottom': this._reference.top + this._reference.height - this._target.height,
                    'right': this._reference.left + this._reference.width,
                    'left': this._reference.left - this._target.width
                };

                coors = {
                    'top': orientationMap[this._options.align],
                    'left': orientationMap[side]
                };
            }

            coors.top += this._options.offsetY;
            coors.left += this._options.offsetX;

            this.target.style.top = coors.top + 'px';
            this.target.style.left = coors.left + 'px';

            return this;
        }
    }]);

    return Positioner;
}();

Positioner._defaults = {
    'offsetX': 0,
    'offsetY': 0,
    'side': 'center',
    'align': 'center',
    'reference': _viewport2.default,
    'position': 'fixed'
};
exports.default = Positioner;

},{"./viewport":10}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventEmitter = require('tiny.js/lib/eventEmitter');

var _eventEmitter2 = _interopRequireDefault(_eventEmitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var resized = false,
    scrolled = false,
    requestAnimFrame = function () {
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };
}();

function update() {

  var eve = resized ? tiny.onresize : tiny.onscroll;

  // Refresh viewport
  this.refresh();

  // Change status
  resized = false;
  scrolled = false;

  /**
   * Event emitted when the dimensions of the viewport changes.
   * @event viewport#resize
   * @example
   * viewport.on('resize', function () {
       *     // Some code here!
       * });
   */

  /**
   * Event emitted when the viewport is scrolled.
   * @event viewport#scroll
   * @example
   * viewport.on('scroll', function () {
       *     // Some code here!
       * });
   */

  // Emits the current event
  this.emit(eve);
}

/**
 * The Viewport is a component to ease viewport management. You can get the dimensions of the viewport and beyond, which can be quite helpful to perform some checks with JavaScript.
 * @constructor
 * @augments tiny.EventEmitter
 * @returns {viewport} Returns a new instance of Viewport.
 */

var Viewport = function (_EventEmitter) {
  _inherits(Viewport, _EventEmitter);

  function Viewport() {
    _classCallCheck(this, Viewport);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Viewport).call(this));

    _this._init();
    return _this;
  }

  /**
   * Initialize a new instance of Viewport.
   * @memberof! Viewport.prototype
   * @function
   * @private
   * @returns {viewport}
   */


  _createClass(Viewport, [{
    key: '_init',
    value: function _init() {
      // Set emitter to zero for unlimited listeners to avoid the warning in console
      // @see https://nodejs.org/api/events.html#events_emitter_setmaxlisteners_n
      this.setMaxListeners(0);

      /**
       * Reference to context of an instance.
       * @type {Object}
       * @private
       */
      var that = this;

      /**
       * Element representing the visible area.
       * @memberof! viewport#element
       * @type {Object}
       */
      this.el = window;

      this.refresh();

      function viewportResize() {
        // No changing, exit
        if (!resized) {
          resized = true;

          /**
           * requestAnimationFrame
           */
          requestAnimFrame(function updateResize() {
            update.call(that);
          });
        }
      }

      function viewportScroll() {
        // No changing, exit
        if (!scrolled) {
          scrolled = true;

          /**
           * requestAnimationFrame
           */
          requestAnimFrame(function updateScroll() {
            update.call(that);
          });
        }
      }

      window.addEventListener(tiny.onscroll, viewportScroll, false);
      window.addEventListener(tiny.onresize, viewportResize, false);
    }
  }, {
    key: 'calculateClientRect',


    /**
     * Calculates/updates the client rects of viewport (in pixels).
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Update the client rects of the viewport.
     * viewport.calculateClientRect();
     */
    value: function calculateClientRect() {
      /**
       * The current top client rect of the viewport (in pixels).
       * @public
       * @name Viewport#top
       * @type {Number}
       * @example
       * // Checks if the top client rect of the viewport is equal to 0.
       * (viewport.top === 0) ? 'Yes': 'No';
       */

      /**
       * The current left client rect of the viewport (in pixels).
       * @public
       * @name Viewport#left
       * @type {Number}
       * @example
       * // Checks if the left client rect of the viewport is equal to 0.
       * (viewport.left === 0) ? 'Yes': 'No';
       */
      this.top = this.left = 0;

      /**
       * The current bottom client rect of the viewport (in pixels).
       * @public
       * @name Viewport#bottom
       * @type {Number}
       * @example
       * // Checks if the bottom client rect of the viewport is equal to a number.
       * (viewport.bottom === 900) ? 'Yes': 'No';
       */
      this.bottom = Math.max(this.el.innerHeight || 0, document.documentElement.clientHeight);

      /**
       * The current right client rect of the viewport (in pixels).
       * @public
       * @name Viewport#right
       * @type {Number}
       * @example
       * // Checks if the right client rect of the viewport is equal to a number.
       * (viewport.bottom === 1200) ? 'Yes': 'No';
       */
      this.right = Math.max(this.el.innerWidth || 0, document.documentElement.clientWidth);

      return this;
    }
  }, {
    key: 'calculateDimensions',


    /**
     * Calculates/updates the dimensions (width and height) of the viewport (in pixels).
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Update the dimensions values of the viewport.
     * viewport.calculateDimensions();
     */
    value: function calculateDimensions() {
      this.calculateClientRect();

      /**
       * The current height of the viewport (in pixels).
       * @public
       * @name Viewport#height
       * @type Number
       * @example
       * // Checks if the height of the viewport is equal to a number.
       * (viewport.height === 700) ? 'Yes': 'No';
       */
      this.height = this.bottom;

      /**
       * The current width of the viewport (in pixels).
       * @public
       * @name Viewport#width
       * @type Number
       * @example
       * // Checks if the height of the viewport is equal to a number.
       * (viewport.width === 1200) ? 'Yes': 'No';
       */
      this.width = this.right;

      return this;
    }
  }, {
    key: 'calculateOffset',


    /**
     * Calculates/updates the viewport position.
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Update the offest values of the viewport.
     * viewport.calculateOffset();
     */
    value: function calculateOffset() {

      /**
       * Reference to context of an instance.
       * @type {Object}
       * @private
       */
      var scroll = tiny.scroll();

      /**
       * The offset top of the viewport.
       * @memberof! Viewport#offsetTop
       * @type {Number}
       * @example
       * // Checks if the offset top of the viewport is equal to a number.
       * (viewport.offsetTop === 200) ? 'Yes': 'No';
       */
      this.offsetTop = scroll.top;

      /**
       * The offset left of the viewport.
       * @memberof! Viewport#offsetLeft
       * @type {Number}
       * @example
       * // Checks if the offset left of the viewport is equal to a number.
       * (viewport.offsetLeft === 200) ? 'Yes': 'No';
       */
      this.offsetLeft = scroll.left;

      /**
       * The offset right of the viewport.
       * @memberof! Viewport#offsetRight
       * @type {Number}
       * @example
       * // Checks if the offset right of the viewport is equal to a number.
       * (viewport.offsetRight === 200) ? 'Yes': 'No';
       */
      this.offsetRight = this.left + this.width;

      /**
       * The offset bottom of the viewport.
       * @memberof! Viewport#offsetBottom
       * @type {Number}
       * @example
       * // Checks if the offset bottom of the viewport is equal to a number.
       * (viewport.offsetBottom === 200) ? 'Yes': 'No';
       */
      this.offsetBottom = this.offsetTop + this.height;

      return this;
    }
  }, {
    key: 'calculateOrientation',


    /**
     * Rertuns/updates the viewport orientation: landscape or portrait.
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Update the dimensions values of the viewport.
     * viewport.calculateDimensions();
     */
    value: function calculateOrientation() {
      /** The viewport orientation: landscape or portrait.
       * @memberof! Viewport#orientation
       * @type {String}
       * @example
       * // Checks if the orientation is "landscape".
       * (viewport.orientation === 'landscape') ? 'Yes': 'No';
       */
      this.orientation = Math.abs(this.el.orientation) === 90 ? 'landscape' : 'portrait';

      return this;
    }
  }, {
    key: 'inViewport',


    /**
     * Calculates if an element is completely located in the viewport.
     * @memberof! Viewport.prototype
     * @function
     * @returns {Boolean}
     * @params {HTMLElement} el A given HMTLElement.
     * @example
     * // Checks if an element is in the viewport.
     * viewport.inViewport(HTMLElement) ? 'Yes': 'No';
     */
    value: function inViewport(el) {
      var r = el.getBoundingClientRect();

      return r.top > 0 && r.right < this.width && r.bottom < this.height && r.left > 0;
    }
  }, {
    key: 'isVisible',


    /**
     * Calculates if an element is visible in the viewport.
     * @memberof! Viewport.prototype
     * @function
     * @returns {Boolean}
     * @params {HTMLElement} el A given HTMLElement.
     * @example
     * // Checks if an element is visible.
     * viewport.isVisisble(HTMLElement) ? 'Yes': 'No';
     */
    value: function isVisible(el) {
      var r = el.getBoundingClientRect();

      return r.height >= this.offsetTop;
    }
  }, {
    key: 'refresh',


    /**
     * Upadtes the viewport dimension, viewport positions and orietation.
     * @memberof! Viewport.prototype
     * @function
     * @returns {viewport}
     * @example
     * // Refreshs the viewport.
     * viewport.refresh();
     */
    value: function refresh() {
      this.calculateDimensions();
      this.calculateOffset();
      this.calculateOrientation();

      return this;
    }
  }]);

  return Viewport;
}(_eventEmitter2.default);

var viewport = new Viewport();

exports.default = viewport;

},{"tiny.js/lib/eventEmitter":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy90aW55LmpzL2xpYi9ldmVudEVtaXR0ZXIuanMiLCJzcmMvc2NyaXB0cy9tYWluLmpzIiwic3JjL3NjcmlwdHMvbWl4aW5zL2NvbGxhcHNpYmxlLmpzIiwic3JjL3NjcmlwdHMvbWl4aW5zL2NvbnRlbnQuanMiLCJzcmMvc2NyaXB0cy9tb2R1bGVzL2F1dG9jb21wbGV0ZS5qcyIsInNyYy9zY3JpcHRzL21vZHVsZXMvY29tcG9uZW50LmpzIiwic3JjL3NjcmlwdHMvbW9kdWxlcy9wb3BvdmVyLmpzIiwic3JjL3NjcmlwdHMvbW9kdWxlcy9wb3NpdGlvbmVyLmpzIiwic3JjL3NjcmlwdHMvbW9kdWxlcy92aWV3cG9ydC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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SUFBSSxRQUFKLEVBQVg7O2tCQUVXIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSBpZiAobGlzdGVuZXJzKSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgdmFyIGV2bGlzdGVuZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgICBpZiAoaXNGdW5jdGlvbihldmxpc3RlbmVyKSlcbiAgICAgIHJldHVybiAxO1xuICAgIGVsc2UgaWYgKGV2bGlzdGVuZXIpXG4gICAgICByZXR1cm4gZXZsaXN0ZW5lci5sZW5ndGg7XG4gIH1cbiAgcmV0dXJuIDA7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudCh0eXBlKTtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIF9ldmVudHMgPSByZXF1aXJlKCdldmVudHMnKTtcblxudmFyIF9ldmVudHMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfZXZlbnRzKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgJ2RlZmF1bHQnOiBvYmogfTsgfVxuXG4vKipcbiAqIEluaGVyaXRzIHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKiBUaGUgcGFyZW50IHdpbGwgYmUgYWNjZXNzaWJsZSB0aHJvdWdoIHRoZSBvYmouc3VwZXJfIHByb3BlcnR5LiBGdWxseVxuICogY29tcGF0aWJsZSB3aXRoIHN0YW5kYXJkIG5vZGUuanMgaW5oZXJpdHMuXG4gKlxuICogQG1lbWJlcm9mIHRpbnlcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9iaiBBbiBvYmplY3QgdGhhdCB3aWxsIGhhdmUgdGhlIG5ldyBtZW1iZXJzLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gc3VwZXJDb25zdHJ1Y3RvciBUaGUgY29uc3RydWN0b3IgQ2xhc3MuXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICogQGV4YW1wbGVEZXNjcmlwdGlvblxuICpcbiAqIEBleGFtcGxlXG4gKiB0aW55LmluaGVyaXRzKG9iaiwgcGFyZW50KTtcbiAqL1xuZXhwb3J0c1snZGVmYXVsdCddID0gX2V2ZW50czJbJ2RlZmF1bHQnXTsiLCIvL2ltcG9ydCBEdW1iIGZyb20gJy4vbW9kdWxlcy9kdW1iJztcblxuaW1wb3J0IEF1dG9jb21wbGV0ZSBmcm9tICcuL21vZHVsZXMvYXV0b2NvbXBsZXRlJztcblxubGV0IHNlYXJjaFRleHQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmF2LXNlYXJjaC1pbnB1dCcpO1xubGV0IHN1Z2dlc3Rpb25zTW9jayA9IHtcInBhZ2luZ1wiOntcInRvdGFsXCI6ODQwMCxcImxpbWl0XCI6MTAsXCJvZmZzZXRcIjowfSxcImZpbHRlcnNcIjp7XCJjb3VudHJ5XCI6XCJNTE1cIixcInF1ZXJ5X2NhdGVnb3J5XCI6XCJjbGFzc2lmaWVkXCIsXCJxXCI6XCJzYW5cIixcIndpbGRjYXJkXCI6XCJ0cnVlXCJ9LFwic3VnZ2VzdGlvbnNcIjogW1xuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVsIFZhbGxlIENlbnRyb1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJCZW5pdG8gSnXDoXJlelwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiRGVsIFZhbGxlIE5vcnRlXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIkJlbml0byBKdcOhcmV6XCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCJcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiaWRcIjogXCJCLU1YLUJDQS1FTlMtU1MxXCIsXG4gICAgICAgICAgICBcImxlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlFsTkJUamcxTURZXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJEZWwgVmFsbGVcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiQmVuaXRvIEp1w6FyZXpcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkRlbCBWYWxsZSBTdXJcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiQmVuaXRvIEp1w6FyZXpcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkxldHLDoW4gVmFsbGVcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiQmVuaXRvIEp1w6FyZXpcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlRsYWNvcXVlbWVjYXRsIGRlbCBWYWxsZVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJCZW5pdG8gSnXDoXJlelwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTsOhcG9sZXNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiQmVuaXRvIEp1w6FyZXpcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlJvbWEgTm9ydGVcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiQ3VhdWh0ZW1vY1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUm9tYSBTdXJcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiQ3VhdWh0ZW1vY1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSGlww7Nkcm9tbyBkZSBsYSBDb25kZXNhXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIkN1YXVodGVtb2NcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkNvbmRlc2FcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiQ3VhdWh0ZW1vY1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiSGlww7Nkcm9tb1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJDdWF1aHRlbW9jXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCJcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiaWRcIjogXCJCLU1YLUJDQS1FTlMtU1MxXCIsXG4gICAgICAgICAgICBcImxlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlFsTkJUamcxTURZXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJTYW4gUmFmYWVsXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIkN1YXVodGVtb2NcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlNhbnRhIE1hcsOtYSBsYSBSaWJlcmFcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiQ3VhdWh0ZW1vY1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiVGFiYWNhbGVyYVwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJDdWF1aHRlbW9jXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCJcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiaWRcIjogXCJCLU1YLUJDQS1FTlMtU1MxXCIsXG4gICAgICAgICAgICBcImxlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlFsTkJUamcxTURZXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJKdcOhcmV6XCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIkN1YXVodGVtb2NcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkRvY3RvcmVzXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIkN1YXVodGVtb2NcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkN1YXVodMOpbW9jXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIkN1YXVodGVtb2NcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkJ1ZW5vcyBBaXJlc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJDdWF1aHRlbW9jXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCJcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiaWRcIjogXCJCLU1YLUJDQS1FTlMtU1MxXCIsXG4gICAgICAgICAgICBcImxlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlFsTkJUamcxTURZXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJCb3NxdWVzIGRlIGxhcyBMb21hc1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJNaWd1ZWwgSGlkYWxnb1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTG9tYXMgZGUgQ2hhcHVsdGVwZWNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiTWlndWVsIEhpZGFsZ29cIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvbWFzIEFsdGFzXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIk1pZ3VlbCBIaWRhbGdvXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCJcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiaWRcIjogXCJCLU1YLUJDQS1FTlMtU1MxXCIsXG4gICAgICAgICAgICBcImxlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlFsTkJUamcxTURZXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJMb21hcyBCYXJyaWxhY29cIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiTWlndWVsIEhpZGFsZ29cIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvbWFzIGRlIEJlemFyZXNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiTWlndWVsIEhpZGFsZ29cIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvbWFzIGRlIFJlZm9ybWFcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiTWlndWVsIEhpZGFsZ29cIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkxvbWFzIGRlIFNvdGVsb1wiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJNaWd1ZWwgSGlkYWxnb1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiTG9tYXMgVmlycmV5ZXNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiTWlndWVsIEhpZGFsZ29cIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlBvbGFuY28gQ2hhcHVsdGVwZWNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiTWlndWVsIEhpZGFsZ29cIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlBvbGFuY28gSSBTZWNjacOzblwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJNaWd1ZWwgSGlkYWxnb1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUG9sYW5jbyBJSSBTZWNjacOzblwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJNaWd1ZWwgSGlkYWxnb1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUG9sYW5jbyBJSUkgU2VjY2nDs25cIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiTWlndWVsIEhpZGFsZ29cIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlBvbGFuY28gSVYgU2VjY2nDs25cIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiTWlndWVsIEhpZGFsZ29cIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIlBvbGFuY28gViBTZWNjacOzblwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJNaWd1ZWwgSGlkYWxnb1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBcImlkXCI6IFwiQi1NWC1CQ0EtRU5TLVNTMVwiLFxuICAgICAgICAgICAgXCJsZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RbE5CVGpnMU1EWVwiLFxuICAgICAgICAgICAgXCJuYW1lXCI6IFwiUG9sYW5jbyBSZWZvcm1hXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIk1pZ3VlbCBIaWRhbGdvXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCJcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiaWRcIjogXCJCLU1YLUJDQS1FTlMtU1MxXCIsXG4gICAgICAgICAgICBcImxlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlFsTkJUamcxTURZXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJHcmFuYWRhXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIk1pZ3VlbCBIaWRhbGdvXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCJcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiaWRcIjogXCJCLU1YLUJDQS1FTlMtU1MxXCIsXG4gICAgICAgICAgICBcImxlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlFsTkJUamcxTURZXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJBbmFodWFjXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIk1pZ3VlbCBIaWRhbGdvXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCJcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiaWRcIjogXCJCLU1YLUJDQS1FTlMtU1MxXCIsXG4gICAgICAgICAgICBcImxlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlFsTkJUamcxTURZXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJOdWV2YSBBbnp1cmVzXCIsXG4gICAgICAgICAgICBcInR5cGVcIjogXCJuZWlnaGJvcmhvb2RcIixcbiAgICAgICAgICAgIFwiZmlsdGVyc190b19hcHBseVwiOiBbe1xuICAgICAgICAgICAgICAgIFwiY291bnRyeV9pZFwiOiBcIlAtTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbmFtZVwiOiBcIk1leGljb1wiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2lkXCI6IFwiRS1NWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX25hbWVcIjogXCJEaXN0cml0byBGZWRlcmFsXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY29yZV9pZFwiOiBcIk1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOVUVKQlNqYzBOelVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfaWRcIjogXCJDLU1YLUJDQS1FTlNcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbmFtZVwiOiBcIk1pZ3VlbCBIaWRhbGdvXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlEwVk9VelUyT0RFXCJcbiAgICAgICAgICAgIH1dXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIFwiaWRcIjogXCJCLU1YLUJDQS1FTlMtU1MxXCIsXG4gICAgICAgICAgICBcImxlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlFsTkJUamcxTURZXCIsXG4gICAgICAgICAgICBcIm5hbWVcIjogXCJWZXLDs25pY2EgQW56dWVyZXNcIixcbiAgICAgICAgICAgIFwidHlwZVwiOiBcIm5laWdoYm9yaG9vZFwiLFxuICAgICAgICAgICAgXCJmaWx0ZXJzX3RvX2FwcGx5XCI6IFt7XG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2lkXCI6IFwiUC1NWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9uYW1lXCI6IFwiTWV4aWNvXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVhcIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfaWRcIjogXCJFLU1YLURJRlwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbmFtZVwiOiBcIkRpc3RyaXRvIEZlZGVyYWxcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jb3JlX2lkXCI6IFwiTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5VRUpCU2pjME56VVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9pZFwiOiBcIkMtTVgtQkNBLUVOU1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9uYW1lXCI6IFwiTWlndWVsIEhpZGFsZ29cIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NvcmVfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIixcbiAgICAgICAgICAgICAgICBcImNpdHlfbGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUTBWT1V6VTJPREVcIlxuICAgICAgICAgICAgfV1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgXCJpZFwiOiBcIkItTVgtQkNBLUVOUy1TUzFcIixcbiAgICAgICAgICAgIFwibGVnYWN5X2NsYXNzaWZpZWRfaWRcIjogXCJUVXhOUWxOQlRqZzFNRFlcIixcbiAgICAgICAgICAgIFwibmFtZVwiOiBcIkFuYWh1YWMgSSBTZWNjacOzblwiLFxuICAgICAgICAgICAgXCJ0eXBlXCI6IFwibmVpZ2hib3Job29kXCIsXG4gICAgICAgICAgICBcImZpbHRlcnNfdG9fYXBwbHlcIjogW3tcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfaWRcIjogXCJQLU1YXCIsXG4gICAgICAgICAgICAgICAgXCJjb3VudHJ5X25hbWVcIjogXCJNZXhpY29cIixcbiAgICAgICAgICAgICAgICBcImNvdW50cnlfbGVnYWN5X2NvcmVfaWRcIjogXCJNWFwiLFxuICAgICAgICAgICAgICAgIFwiY291bnRyeV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIk1YXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9pZFwiOiBcIkUtTVgtRElGXCIsXG4gICAgICAgICAgICAgICAgXCJzdGF0ZV9uYW1lXCI6IFwiRGlzdHJpdG8gRmVkZXJhbFwiLFxuICAgICAgICAgICAgICAgIFwic3RhdGVfbGVnYWN5X2NvcmVfaWRcIjogXCJNWC1ESUZcIixcbiAgICAgICAgICAgICAgICBcInN0YXRlX2xlZ2FjeV9jbGFzc2lmaWVkX2lkXCI6IFwiVFV4TlVFSkJTamMwTnpVXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X2lkXCI6IFwiQy1NWC1CQ0EtRU5TXCIsXG4gICAgICAgICAgICAgICAgXCJjaXR5X25hbWVcIjogXCJNaWd1ZWwgSGlkYWxnb1wiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY29yZV9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiLFxuICAgICAgICAgICAgICAgIFwiY2l0eV9sZWdhY3lfY2xhc3NpZmllZF9pZFwiOiBcIlRVeE5RMFZPVXpVMk9ERVwiXG4gICAgICAgICAgICB9XVxuICAgICAgICB9XG4gICAgXVxufTtcblxud2luZG93LmF1dG9jb21wbGV0ZSA9IG5ldyBBdXRvY29tcGxldGUoc2VhcmNoVGV4dCwge1xuICAgICAgICB3cmFwcGVyOiAnYXV0b2NvbXBsZXRlLXdyYXBwZXInLFxuICAgICAgICBtdWx0aXBsZTogdHJ1ZVxuICAgIH0pXG4gICAgLm9uKCd0eXBlJywgc2VhcmNoVGV4dCA9PiB7XG4gICAgICAgIGlmIChzZWFyY2hUZXh0Lmxlbmd0aCA+PSAyKSB7XG4gICAgICAgICAgICBnZXRTdWdnZXN0aW9uKHNlYXJjaFRleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXV0b2NvbXBsZXRlLnN1Z2dlc3QoW10pO1xuICAgICAgICB9XG4gICAgfSlcbiAgICAub24oJ3NlbGVjdCcsICh2YWwsIHBvcykgPT4ge1xuICAgICAgICBjb25zdCBmID0gYXV0b2NvbXBsZXRlLl9zdWdnZXN0aW9uc0RhdGFbcG9zXS5maWx0ZXJzX3RvX2FwcGx5WzBdO1xuXG4gICAgICAgIGlmICghYXV0b2NvbXBsZXRlLmdldEZpbHRlcnMoKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGF1dG9jb21wbGV0ZS5zZXRGaWx0ZXJzKFtcbiAgICAgICAgICAgICAgICB7a2V5OiAnc3RhdGVfbmFtZScsIG5hbWU6IGYuc3RhdGVfbmFtZSwgdmFsdWU6IGYuc3RhdGVfbmFtZX0sXG4gICAgICAgICAgICAgICAge2tleTogJ2NpdHlfbmFtZScsIG5hbWU6IGYuY2l0eV9uYW1lLCB2YWx1ZTogZi5jaXR5X25hbWV9XG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG5mdW5jdGlvbiBnZXRTdWdnZXN0aW9uKHNlYXJjaFRleHQpIHtcbiAgICBmdW5jdGlvbiByZW1vdmVfYWNjZW50cyhzKSB7XG4gICAgICAgIGxldCByID0gcy50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBjb25zdCBub25fYXNjaWlzID0geydhJzogJ1vDoMOhw6LDo8Okw6VdJywgJ2FlJzogJ8OmJywgJ2MnOiAnw6cnLCAnZSc6ICdbw6jDqcOqw6tdJywgJ2knOiAnW8Osw63DrsOvXScsICduJzogJ8OxJywgJ28nOiAnW8Oyw7PDtMO1w7ZdJywgJ29lJzogJ8WTJywgJ3UnOiAnW8O5w7rDu8Wxw7xdJywgJ3knOiAnW8O9w79dJ307XG4gICAgICAgIGZvciAobGV0IGkgaW4gbm9uX2FzY2lpcykgeyByID0gci5yZXBsYWNlKG5ldyBSZWdFeHAobm9uX2FzY2lpc1tpXSwgJ2cnKSwgaSk7IH1cbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfVxuXG4gICAgc2VhcmNoVGV4dCA9IHJlbW92ZV9hY2NlbnRzKHNlYXJjaFRleHQpO1xuXG4gICAgY29uc3QgZmlsdGVycyA9IGF1dG9jb21wbGV0ZS5nZXRGaWx0ZXJzKCk7XG4gICAgY29uc3QgdmFsdWVzID0gYXV0b2NvbXBsZXRlLmdldFZhbHVlKCk7XG4gICAgbGV0IHN1Z2dlc3Rpb25zTGlzdCA9IFtdO1xuICAgIGxldCBzdWdnZXN0aW9ucyA9IFtdO1xuXG4gICAgaWYgKGZpbHRlcnMubGVuZ3RoKSB7XG4gICAgICAgIHN1Z2dlc3Rpb25zTW9jay5zdWdnZXN0aW9ucy5mb3JFYWNoKHMgPT4ge1xuICAgICAgICAgICAgaWYgKHMuZmlsdGVyc190b19hcHBseVswXVtmaWx0ZXJzWzBdLmtleV0gPT0gZmlsdGVyc1swXS52YWx1ZSAmJiBzLmZpbHRlcnNfdG9fYXBwbHlbMF1bZmlsdGVyc1sxXS5rZXldID09IGZpbHRlcnNbMV0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICBzdWdnZXN0aW9uc0xpc3QucHVzaChzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3VnZ2VzdGlvbnNMaXN0ID0gc3VnZ2VzdGlvbnNNb2NrLnN1Z2dlc3Rpb25zO1xuICAgIH1cblxuICAgIHN1Z2dlc3Rpb25zTGlzdC5mb3JFYWNoKHMgPT4ge1xuICAgICAgICBjb25zdCB2YWwgPSByZW1vdmVfYWNjZW50cyhzLm5hbWUpO1xuICAgICAgICBpZiAodmFsdWVzLmluZGV4T2Yocy5uYW1lKSA9PSAtMSAmJiB2YWwuaW5kZXhPZihzZWFyY2hUZXh0KSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zLnB1c2gocyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBwYXJzZVJlc3VsdHMoc3VnZ2VzdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBwYXJzZVJlc3VsdHMoc3VnZ2VzdGlvbnMpIHtcbiAgICBjb25zdCBzID0gc3VnZ2VzdGlvbnMubWFwKGZ1bmN0aW9uKHMpIHtcbiAgICAgICAgdmFyIG5hbWVQYXJ0cyA9IFtzLm5hbWVdLFxuICAgICAgICAgICAgZmlsdGVyO1xuXG4gICAgICAgIGlmIChzLmZpbHRlcnNfdG9fYXBwbHkubGVuZ3RoKSB7XG4gICAgICAgICAgICBmaWx0ZXIgPSBzLmZpbHRlcnNfdG9fYXBwbHlbMF07XG5cbiAgICAgICAgICAgIGlmIChzLnR5cGUgPT09ICduZWlnaGJvcmhvb2QnKSB7XG4gICAgICAgICAgICAgICAgbmFtZVBhcnRzLnB1c2goZmlsdGVyLmNpdHlfbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocy50eXBlICE9PSAnc3RhdGUnKSB7XG4gICAgICAgICAgICAgICAgbmFtZVBhcnRzLnB1c2goZmlsdGVyLnN0YXRlX25hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5hbWVQYXJ0cy5qb2luKCcsICcpO1xuICAgIH0pLnNsaWNlKDAsIDEwKTtcblxuICAgIGF1dG9jb21wbGV0ZS5zdWdnZXN0KHMsIHN1Z2dlc3Rpb25zLnNsaWNlKDAsIDEwKSk7XG59XG5cbnRpbnkub24oJy5uYXYtc2VhcmNoJywgJ3N1Ym1pdCcsIGUgPT4ge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbn0pO1xuXG50aW55Lm9uKCcubmF2LXNlYXJjaC1zdWJtaXQnLCAnY2xpY2snLCBlID0+IHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgLy9zZXRUaW1lb3V0KCgpID0+IHt3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpfSwgMTAwMCk7XG59KTtcbiIsIi8qKlxuICogVGhlIENvbGxhcHNpYmxlIGNsYXNzIGdpdmVzIHRvIGNvbXBvbmVudHMgdGhlIGFiaWxpdHkgdG8gc2hvd24gb3IgaGlkZGVuIGl0cyBjb250YWluZXIuXG4gKiBAbWVtYmVyT2YgY2hcbiAqIEBtaXhpblxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIGEgcHJpdmF0ZSBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gQ29sbGFwc2libGUoKSB7XG5cbiAgICAvKipcbiAgICAgKiBSZWZlcmVuY2UgdG8gY29udGV4dCBvZiBhbiBpbnN0YW5jZS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgbGV0IHRoYXQgPSB0aGlzLFxuICAgICAgICB0cmlnZ2VyQ2xhc3MgPSB0aGlzLmdldENsYXNzbmFtZSh0aGlzLmNvbnN0cnVjdG9yLm5hbWUudG9Mb3dlckNhc2UoKSArICctdHJpZ2dlci1vbicpLFxuICAgICAgICBmeCA9IHRoaXMuX29wdGlvbnMuZngsXG4gICAgICAgIHVzZUVmZmVjdHMgPSAodGlueS5zdXBwb3J0LnRyYW5zaXRpb24gJiYgZnggIT09ICdub25lJyAmJiBmeCAhPT0gZmFsc2UpLFxuICAgICAgICBwdCwgcGI7XG5cbiAgICBsZXQgdG9nZ2xlRWZmZWN0cyA9IHtcbiAgICAgICAgJ3NsaWRlRG93bic6ICdzbGlkZVVwJyxcbiAgICAgICAgJ3NsaWRlVXAnOiAnc2xpZGVEb3duJyxcbiAgICAgICAgJ2ZhZGVJbic6ICdmYWRlT3V0JyxcbiAgICAgICAgJ2ZhZGVPdXQnOiAnZmFkZUluJ1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBzaG93Q2FsbGJhY2soZSkge1xuICAgICAgICBsZXQgeyBjb250YWluZXIgfSA9IHRoYXQ7XG5cbiAgICAgICAgaWYgKHVzZUVmZmVjdHMpIHtcbiAgICAgICAgICAgIHRpbnkucmVtb3ZlQ2xhc3MoY29udGFpbmVyLCB0aGF0LmdldENsYXNzbmFtZSgnZngtJyArIGZ4KSk7XG5cbiAgICAgICAgICAgIC8vIFRPRE86IFVzZSBvcmlnaW5hbCBoZWlnaHQgd2hlbiBpdCBpcyBkZWZpbmVkXG4gICAgICAgICAgICBpZiAoL15zbGlkZS8udGVzdChmeCkpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGlueS5yZW1vdmVDbGFzcyhjb250YWluZXIsIHRoYXQuZ2V0Q2xhc3NuYW1lKCdoaWRlJykpO1xuICAgICAgICBjb250YWluZXIuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuXG4gICAgICAgIGlmIChlKSB7XG4gICAgICAgICAgICBlLnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGUudHlwZSwgc2hvd0NhbGxiYWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBlbWl0dGVkIHdoZW4gdGhlIGNvbXBvbmVudCBpcyBzaG93bi5cbiAgICAgICAgICogQGV2ZW50IGNoLkNvbGxhcHNpYmxlI3Nob3dcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gU3Vic2NyaWJlIHRvIFwic2hvd1wiIGV2ZW50LlxuICAgICAgICAgKiBjb2xsYXBzaWJsZS5vbignc2hvdycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAqICAgICAvLyBTb21lIGNvZGUgaGVyZSFcbiAgICAgICAgICAgICAqIH0pO1xuICAgICAgICAgKi9cbiAgICAgICAgdGhhdC5lbWl0KCdzaG93Jyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGlkZUNhbGxiYWNrKGUpIHtcbiAgICAgICAgbGV0IHsgY29udGFpbmVyIH0gPSB0aGF0O1xuXG4gICAgICAgIGlmICh1c2VFZmZlY3RzKSB7XG4gICAgICAgICAgICB0aW55LnJlbW92ZUNsYXNzKGNvbnRhaW5lciwgdGhhdC5nZXRDbGFzc25hbWUoJ2Z4LScgKyB0b2dnbGVFZmZlY3RzW2Z4XSkpO1xuICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgICAgIGlmICgvXnNsaWRlLy50ZXN0KGZ4KSkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aW55LmFkZENsYXNzKGNvbnRhaW5lciwgdGhhdC5nZXRDbGFzc25hbWUoJ2hpZGUnKSk7XG4gICAgICAgIGNvbnRhaW5lci5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcblxuICAgICAgICBpZiAoZSkge1xuICAgICAgICAgICAgZS50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihlLnR5cGUsIGhpZGVDYWxsYmFjayk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgZW1pdHRlZCB3aGVuIHRoZSBjb21wb25lbnQgaXMgaGlkZGVuLlxuICAgICAgICAgKiBAZXZlbnQgY2guQ29sbGFwc2libGUjaGlkZVxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiAvLyBTdWJzY3JpYmUgdG8gXCJoaWRlXCIgZXZlbnQuXG4gICAgICAgICAqIGNvbGxhcHNpYmxlLm9uKCdoaWRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICogICAgIC8vIFNvbWUgY29kZSBoZXJlIVxuICAgICAgICAgICAgICogfSk7XG4gICAgICAgICAqL1xuICAgICAgICB0aGF0LmVtaXQoJ2hpZGUnKTtcbiAgICB9XG5cbiAgICB0aGlzLl9zaG93biA9IGZhbHNlO1xuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIGNvbXBvbmVudCBjb250YWluZXIuXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB0aGlzLl9zaG93ID0gKCkgPT4ge1xuICAgICAgICB0aGlzLl9zaG93biA9IHRydWU7XG5cbiAgICAgICAgaWYgKHRoaXMudHJpZ2dlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aW55LmFkZENsYXNzKHRoaXMudHJpZ2dlciwgdHJpZ2dlckNsYXNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBlbWl0dGVkIGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIHNob3duLlxuICAgICAgICAgKiBAZXZlbnQgY2guQ29sbGFwc2libGUjYmVmb3Jlc2hvd1xuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiAvLyBTdWJzY3JpYmUgdG8gXCJiZWZvcmVzaG93XCIgZXZlbnQuXG4gICAgICAgICAqIGNvbGxhcHNpYmxlLm9uKCdiZWZvcmVzaG93JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICogICAgIC8vIFNvbWUgY29kZSBoZXJlIVxuICAgICAgICAgICAgICogfSk7XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ2JlZm9yZXNob3cnKTtcblxuICAgICAgICAvLyBBbmltYXRlIG9yIG5vdFxuICAgICAgICBpZiAodXNlRWZmZWN0cykge1xuICAgICAgICAgICAgbGV0IF9oID0gMDtcbiAgICAgICAgICAgIGxldCB7IGNvbnRhaW5lciB9ID0gdGhpcztcblxuICAgICAgICAgICAgLy8gQmUgc3VyZSB0byByZW1vdmUgYW4gb3Bwb3NpdGUgY2xhc3MgdGhhdCBwcm9iYWJseSBleGlzdCBhbmRcbiAgICAgICAgICAgIC8vIHRyYW5zaXRpb25lbmQgbGlzdGVuZXIgZm9yIGFuIG9wcG9zaXRlIHRyYW5zaXRpb24sIGFrYSAkLmZuLnN0b3AodHJ1ZSwgdHJ1ZSlcbiAgICAgICAgICAgIHRpbnkub2ZmKGNvbnRhaW5lciwgdGlueS5zdXBwb3J0LnRyYW5zaXRpb24uZW5kLCBoaWRlQ2FsbGJhY2spO1xuICAgICAgICAgICAgdGlueS5yZW1vdmVDbGFzcyhjb250YWluZXIsIHRoYXQuZ2V0Q2xhc3NuYW1lKCdmeC0nICsgdG9nZ2xlRWZmZWN0c1tmeF0pKTtcblxuICAgICAgICAgICAgdGlueS5vbihjb250YWluZXIsIHRpbnkuc3VwcG9ydC50cmFuc2l0aW9uLmVuZCwgc2hvd0NhbGxiYWNrKTtcblxuICAgICAgICAgICAgLy8gUmV2ZWFsIGFuIGVsZW1lbnQgYmVmb3JlIHRoZSB0cmFuc2l0aW9uXG4gICAgICAgICAgICBjb250YWluZXIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cbiAgICAgICAgICAgIC8vIFNldCBtYXJnaW4gYW5kIHBhZGRpbmcgdG8gMCB0byBwcmV2ZW50IGNvbnRlbnQganVtcGluZyBhdCB0aGUgdHJhbnNpdGlvbiBlbmRcbiAgICAgICAgICAgIGlmICgvXnNsaWRlLy50ZXN0KGZ4KSkge1xuICAgICAgICAgICAgICAgIC8vIENhY2hlIHRoZSBvcmlnaW5hbCBwYWRkaW5ncyBmb3IgdGhlIGZpcnN0IHRpbWVcbiAgICAgICAgICAgICAgICBpZiAoIXB0IHx8ICFwYikge1xuICAgICAgICAgICAgICAgICAgICBwdCA9IHRpbnkuY3NzKGNvbnRhaW5lciwgJ3BhZGRpbmctdG9wJyk7XG4gICAgICAgICAgICAgICAgICAgIHBiID0gdGlueS5jc3MoY29udGFpbmVyLCAncGFkZGluZy1ib3R0b20nKTtcblxuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuc3R5bGUubWFyZ2luVG9wID0gY29udGFpbmVyLnN0eWxlLm1hcmdpbkJvdHRvbSA9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuc3R5bGUucGFkZGluZ1RvcCA9IGNvbnRhaW5lci5zdHlsZS5wYWRkaW5nQm90dG9tID0gJzBweCc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLm9wYWNpdHkgPSAnMC4wMSc7XG4gICAgICAgICAgICAgICAgX2ggPSBjb250YWluZXIub2Zmc2V0SGVpZ2h0O1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5vcGFjaXR5ID0gJyc7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLmhlaWdodCA9ICcwcHgnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBUcmFuc2l0aW9uIGNhbm5vdCBiZSBhcHBsaWVkIGF0IHRoZSBzYW1lIHRpbWUgd2hlbiBjaGFuZ2luZyB0aGUgZGlzcGxheSBwcm9wZXJ0eVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKC9ec2xpZGUvLnRlc3QoZngpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSBfaCArICdweCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5zdHlsZS5wYWRkaW5nVG9wID0gcHQ7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnN0eWxlLnBhZGRpbmdCb3R0b20gPSBwYjtcbiAgICAgICAgICAgICAgICB0aW55LmFkZENsYXNzKGNvbnRhaW5lciwgdGhhdC5nZXRDbGFzc25hbWUoJ2Z4LScgKyBmeCkpO1xuICAgICAgICAgICAgfSwgMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaG93Q2FsbGJhY2soKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZW1pdCgnX3Nob3cnKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSGlkZXMgdGhlIGNvbXBvbmVudCBjb250YWluZXIuXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICB0aGlzLl9oaWRlID0gKCkgPT4ge1xuXG4gICAgICAgIHRoYXQuX3Nob3duID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHRoYXQudHJpZ2dlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aW55LnJlbW92ZUNsYXNzKHRoYXQudHJpZ2dlciwgdHJpZ2dlckNsYXNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBlbWl0dGVkIGJlZm9yZSB0aGUgY29tcG9uZW50IGlzIGhpZGRlbi5cbiAgICAgICAgICogQGV2ZW50IGNoLkNvbGxhcHNpYmxlI2JlZm9yZWhpZGVcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gU3Vic2NyaWJlIHRvIFwiYmVmb3JlaGlkZVwiIGV2ZW50LlxuICAgICAgICAgKiBjb2xsYXBzaWJsZS5vbignYmVmb3JlaGlkZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAqICAgICAvLyBTb21lIGNvZGUgaGVyZSFcbiAgICAgICAgICAgICAqIH0pO1xuICAgICAgICAgKi9cbiAgICAgICAgdGhhdC5lbWl0KCdiZWZvcmVoaWRlJyk7XG5cbiAgICAgICAgLy8gQW5pbWF0ZSBvciBub3RcbiAgICAgICAgaWYgKHVzZUVmZmVjdHMpIHtcbiAgICAgICAgICAgIC8vIEJlIHN1cmUgdG8gcmVtb3ZlIGFuIG9wcG9zaXRlIGNsYXNzIHRoYXQgcHJvYmFibHkgZXhpc3QgYW5kXG4gICAgICAgICAgICAvLyB0cmFuc2l0aW9uZW5kIGxpc3RlbmVyIGZvciBhbiBvcHBvc2l0ZSB0cmFuc2l0aW9uLCBha2EgJC5mbi5zdG9wKHRydWUsIHRydWUpXG4gICAgICAgICAgICB0aW55Lm9mZih0aGF0LmNvbnRhaW5lciwgdGlueS5zdXBwb3J0LnRyYW5zaXRpb24uZW5kLCBzaG93Q2FsbGJhY2spO1xuICAgICAgICAgICAgdGlueS5yZW1vdmVDbGFzcyh0aGF0LmNvbnRhaW5lciwgdGhhdC5nZXRDbGFzc25hbWUoJ2Z4LScgKyBmeCkpO1xuXG4gICAgICAgICAgICB0aW55Lm9uKHRoYXQuY29udGFpbmVyLCB0aW55LnN1cHBvcnQudHJhbnNpdGlvbi5lbmQsIGhpZGVDYWxsYmFjayk7XG4gICAgICAgICAgICAvLyBTZXQgbWFyZ2luIGFuZCBwYWRkaW5nIHRvIDAgdG8gcHJldmVudCBjb250ZW50IGp1bXBpbmcgYXQgdGhlIHRyYW5zaXRpb24gZW5kXG4gICAgICAgICAgICBpZiAoL15zbGlkZS8udGVzdChmeCkpIHtcbiAgICAgICAgICAgICAgICB0aGF0LmNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSB0aW55LmNzcyh0aGF0LmNvbnRhaW5lciwgJ2hlaWdodCcpO1xuICAgICAgICAgICAgICAgIC8vIFVzZXMgbmV4dFRpY2sgdG8gdHJpZ2dlciB0aGUgaGVpZ2h0IGNoYW5nZVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmNvbnRhaW5lci5zdHlsZS5oZWlnaHQgPSAnMHB4JztcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5jb250YWluZXIuc3R5bGUucGFkZGluZ1RvcCA9IHRoYXQuY29udGFpbmVyLnN0eWxlLnBhZGRpbmdCb3R0b20gPSAnMHB4JztcbiAgICAgICAgICAgICAgICAgICAgdGlueS5hZGRDbGFzcyh0aGF0LmNvbnRhaW5lciwgdGhhdC5nZXRDbGFzc25hbWUoJ2Z4LScgKyB0b2dnbGVFZmZlY3RzW2Z4XSkpO1xuICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGlueS5hZGRDbGFzcyh0aGF0LmNvbnRhaW5lciwgdGhhdC5nZXRDbGFzc25hbWUoJ2Z4LScgKyB0b2dnbGVFZmZlY3RzW2Z4XSkpO1xuICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGlkZUNhbGxiYWNrKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhhdDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2hvd3Mgb3IgaGlkZXMgdGhlIGNvbXBvbmVudC5cbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHRoaXMuX3RvZ2dsZSA9ICgpID0+IHtcblxuICAgICAgICBpZiAodGhpcy5fc2hvd24pIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLy8gVE9ETzogVXNlIG9uLnJlYWR5IGluc3RlYWQgb2YgdGltZW91dFxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICB0aGlzLm9uKCdkaXNhYmxlJywgdGhpcy5oaWRlKTtcbiAgICB9LCAxKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgQ29sbGFwc2libGU7XG4iLCIvKipcbiAqIEFkZCBhIGZ1bmN0aW9uIHRvIG1hbmFnZSBjb21wb25lbnRzIGNvbnRlbnQuXG4gKiBAbWl4aW5cbiAqXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbmZ1bmN0aW9uIENvbnRlbnQoKSB7XG4gICAgLyoqXG4gICAgICogQWxsb3dzIHRvIG1hbmFnZSB0aGUgY29tcG9uZW50cyBjb250ZW50LlxuICAgICAqIEBmdW5jdGlvblxuICAgICAqIEBtZW1iZXJvZiEgY2guQ29udGVudCNcbiAgICAgKiBAcGFyYW0geyhTdHJpbmcgfCBIVE1MRWxlbWVudCl9IGNvbnRlbnQgVGhlIGNvbnRlbnQgdGhhdCB3aWxsIGJlIHVzZWQgYnkgYSBjb21wb25lbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBIGN1c3RvbSBvcHRpb25zIHRvIGJlIHVzZWQgd2l0aCBjb250ZW50IGxvYWRlZCBieSBhamF4LlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5tZXRob2RdIFRoZSB0eXBlIG9mIHJlcXVlc3QgKFwiUE9TVFwiIG9yIFwiR0VUXCIpIHRvIGxvYWQgY29udGVudCBieSBhamF4LiBEZWZhdWx0OiBcIkdFVFwiLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5wYXJhbXNdIFBhcmFtcyBsaWtlIHF1ZXJ5IHN0cmluZyB0byBiZSBzZW50IHRvIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jYWNoZV0gRm9yY2UgdG8gY2FjaGUgdGhlIHJlcXVlc3QgYnkgdGhlIGJyb3dzZXIuIERlZmF1bHQ6IHRydWUuIGZhbHNlIHZhbHVlIHdpbGwgd29yayBvbmx5IHdpdGggSEVBRCBhbmQgR0VUIHJlcXVlc3RzXG4gICAgICogQHBhcmFtIHsoU3RyaW5nIHwgSFRNTEVsZW1lbnQpfSBbb3B0aW9ucy53YWl0aW5nXSBUZW1wb3JhcnkgY29udGVudCB0byB1c2Ugd2hpbGUgdGhlIGFqYXggcmVxdWVzdCBpcyBsb2FkaW5nLlxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gVXBkYXRlIGNvbnRlbnQgd2l0aCBzb21lIHN0cmluZy5cbiAgICAgKiBjb21wb25lbnQuY29udGVudCgnU29tZSBuZXcgY29udGVudCBoZXJlIScpO1xuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gVXBkYXRlIGNvbnRlbnQgdGhhdCB3aWxsIGJlIGxvYWRlZCBieSBhamF4IHdpdGggY3VzdG9tIG9wdGlvbnMuXG4gICAgICogY29tcG9uZW50LmNvbnRlbnQoJ2h0dHA6Ly9jaGljby11aS5jb20uYXIvYWpheCcsIHtcbiAgICAgICAgICogICAgICdjYWNoZSc6IGZhbHNlLFxuICAgICAgICAgKiAgICAgJ3BhcmFtcyc6ICd4LXJlcXVlc3Q9dHJ1ZSdcbiAgICAgICAgICogfSk7XG4gICAgICovXG4gICAgdGhpcy5jb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHBhcmVudDtcblxuICAgICAgICAvLyBSZXR1cm5zIHRoZSBsYXN0IHVwZGF0ZWQgY29udGVudC5cbiAgICAgICAgaWYgKGNvbnRlbnQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRlbnQuaW5uZXJIVE1MO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fb3B0aW9ucy5jb250ZW50ID0gY29udGVudDtcblxuICAgICAgICBpZiAodGhpcy5fb3B0aW9ucy5jYWNoZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLl9vcHRpb25zLmNhY2hlID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgY29udGVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIENhc2UgMTogQUpBWCBjYWxsXG4gICAgICAgICAgICBpZiAoKC9eKCgoaHR0cHN8aHR0cHxmdHB8ZmlsZSk6XFwvXFwvKXx3d3dcXC58XFwuXFwvfChcXC5cXC5cXC8pK3woXFwvezEsMn0pfChcXGR7MSwzfVxcLil7M31cXGR7MSwzfSkoKChcXHcrfC0pKFxcLj8pKFxcLz8pKSspKFxcOlxcZHsxLDV9KXswLDF9KCgoXFx3K3wtKShcXC4/KShcXC8/KSgjPykpKykoKFxcPykoXFx3Kz0oXFx3PykrKCY/KSkrKT8oXFx3KyNcXHcrKT8kLykudGVzdChjb250ZW50KSkge1xuICAgICAgICAgICAgICAgIGdldEFzeW5jQ29udGVudC5jYWxsKHRoaXMsIGNvbnRlbnQucmVwbGFjZSgvIy4rLywgJycpLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAvLyBDYXNlIDI6IFBsYWluIHRleHRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0Q29udGVudC5jYWxsKHRoaXMsIGNvbnRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ2FzZSAzOiBIVE1MIEVsZW1lbnRcbiAgICAgICAgfSBlbHNlIGlmIChjb250ZW50Lm5vZGVUeXBlICE9PSB1bmRlZmluZWQpIHtcblxuICAgICAgICAgICAgdGlueS5yZW1vdmVDbGFzcyhjb250ZW50LCB0aGlzLmdldENsYXNzbmFtZSgnaGlkZScpKTtcbiAgICAgICAgICAgIHBhcmVudCA9IHRpbnkucGFyZW50KGNvbnRlbnQpO1xuXG4gICAgICAgICAgICBzZXRDb250ZW50LmNhbGwodGhpcywgY29udGVudCk7XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5fb3B0aW9ucy5jYWNoZSkge1xuICAgICAgICAgICAgICAgIHBhcmVudC5yZW1vdmVDaGlsZChjb250ZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8vIExvYWRzIGNvbnRlbnQgb25jZS4gSWYgdGhlIGNhY2hlIGlzIGRpc2FibGVkIHRoZSBjb250ZW50IGxvYWRzIG9uIGV2ZXJ5IHNob3cuXG4gICAgdGhpcy5vbmNlKCdfc2hvdycsICgpID0+IHtcbiAgICAgICAgdGhpcy5jb250ZW50KHRoaXMuX29wdGlvbnMuY29udGVudCk7XG5cbiAgICAgICAgdGhpcy5vbignc2hvdycsICgpID0+IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5fb3B0aW9ucy5jYWNoZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29udGVudCh0aGlzLl9vcHRpb25zLmNvbnRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcblxuXG4gICAgLyoqXG4gICAgICogU2V0IGFzeW5jIGNvbnRlbnQgaW50byBjb21wb25lbnQncyBjb250YWluZXIgYW5kIGVtaXRzIHRoZSBjdXJyZW50IGV2ZW50LlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0QXN5bmNDb250ZW50KGV2ZW50KSB7XG5cbiAgICAgICAgdGhpcy5fY29udGVudC5pbm5lckhUTUwgPSBldmVudC5yZXNwb25zZTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgZW1pdHRlZCB3aGVuIHRoZSBjb250ZW50IGNoYW5nZS5cbiAgICAgICAgICogQGV2ZW50IGNoLkNvbnRlbnQjY29udGVudGNoYW5nZVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbWl0KCdfY29udGVudGNoYW5nZScpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBlbWl0dGVkIGlmIHRoZSBjb250ZW50IGlzIGxvYWRlZCBzdWNjZXNzZnVsbHkuXG4gICAgICAgICAqIEBldmVudCBjaC5Db250ZW50I2NvbnRlbnRkb25lXG4gICAgICAgICAqIEBpZ25vcmVcbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGVtaXR0ZWQgd2hlbiB0aGUgY29udGVudCBpcyBsb2FkaW5nLlxuICAgICAgICAgKiBAZXZlbnQgY2guQ29udGVudCNjb250ZW50d2FpdGluZ1xuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiAvLyBTdWJzY3JpYmUgdG8gXCJjb250ZW50d2FpdGluZ1wiIGV2ZW50LlxuICAgICAgICAgKiBjb21wb25lbnQub24oJ2NvbnRlbnR3YWl0aW5nJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgKiAgICAgLy8gU29tZSBjb2RlIGhlcmUhXG4gICAgICAgICAgICAgKiB9KTtcbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGVtaXR0ZWQgaWYgdGhlIGNvbnRlbnQgaXNuJ3QgbG9hZGVkIHN1Y2Nlc3NmdWxseS5cbiAgICAgICAgICogQGV2ZW50IGNoLkNvbnRlbnQjY29udGVudGVycm9yXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIC8vIFN1YnNjcmliZSB0byBcImNvbnRlbnRlcnJvclwiIGV2ZW50LlxuICAgICAgICAgKiBjb21wb25lbnQub24oJ2NvbnRlbnRlcnJvcicsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICogICAgIC8vIFNvbWUgY29kZSBoZXJlIVxuICAgICAgICAgICAgICogfSk7XG4gICAgICAgICAqL1xuXG4gICAgICAgIHRoaXMuZW1pdCgnY29udGVudCcgKyBldmVudC5zdGF0dXMsIGV2ZW50KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTZXQgY29udGVudCBpbnRvIGNvbXBvbmVudCdzIGNvbnRhaW5lciBhbmQgZW1pdHMgdGhlIGNvbnRlbnRkb25lIGV2ZW50LlxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0Q29udGVudChjb250ZW50KSB7XG5cbiAgICAgICAgaWYgKGNvbnRlbnQubm9kZVR5cGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5fY29udGVudC5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgIHRoaXMuX2NvbnRlbnQuYXBwZW5kQ2hpbGQoY29udGVudCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9jb250ZW50LmlubmVySFRNTCA9IGNvbnRlbnQ7XG4gICAgICAgIH1cblxuXG4gICAgICAgIHRoaXMuX29wdGlvbnMuY2FjaGUgPSB0cnVlO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBlbWl0dGVkIHdoZW4gdGhlIGNvbnRlbnQgY2hhbmdlLlxuICAgICAgICAgKiBAZXZlbnQgY2guQ29udGVudCNjb250ZW50Y2hhbmdlXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ19jb250ZW50Y2hhbmdlJyk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGVtaXR0ZWQgaWYgdGhlIGNvbnRlbnQgaXMgbG9hZGVkIHN1Y2Nlc3NmdWxseS5cbiAgICAgICAgICogQGV2ZW50IGNoLkNvbnRlbnQjY29udGVudGRvbmVcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gU3Vic2NyaWJlIHRvIFwiY29udGVudGRvbmVcIiBldmVudC5cbiAgICAgICAgICogY29tcG9uZW50Lm9uKCdjb250ZW50ZG9uZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICogICAgIC8vIFNvbWUgY29kZSBoZXJlIVxuICAgICAgICAgICAgICogfSk7XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ2NvbnRlbnRkb25lJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFzeW5jIGNvbnRlbnQgd2l0aCBnaXZlbiBVUkwuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRBc3luY0NvbnRlbnQodXJsLCBvcHRpb25zKSB7XG4gICAgICAgIGxldCByZXF1ZXN0Q2ZnLFxuICAgICAgICAgICAgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICAgICAgJ21ldGhvZCc6IHRoaXMuX29wdGlvbnMubWV0aG9kLFxuICAgICAgICAgICAgICAgICdwYXJhbXMnOiB0aGlzLl9vcHRpb25zLnBhcmFtcyxcbiAgICAgICAgICAgICAgICAnY2FjaGUnOiB0aGlzLl9vcHRpb25zLmNhY2hlLFxuICAgICAgICAgICAgICAgICd3YWl0aW5nJzogdGhpcy5fb3B0aW9ucy53YWl0aW5nXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluaXRpYWwgb3B0aW9ucyB0byBiZSBtZXJnZWQgd2l0aCB0aGUgdXNlcidzIG9wdGlvbnNcbiAgICAgICAgb3B0aW9ucyA9IHRpbnkuZXh0ZW5kKHtcbiAgICAgICAgICAgICdtZXRob2QnOiAnR0VUJyxcbiAgICAgICAgICAgICdwYXJhbXMnOiAnJyxcbiAgICAgICAgICAgICd3YWl0aW5nJzogJ2xvYWRpbmctbGFyZ2UnXG4gICAgICAgIH0sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAvLyBTZXQgbG9hZGluZ1xuICAgICAgICBzZXRBc3luY0NvbnRlbnQuY2FsbCh0aGlzLCB7XG4gICAgICAgICAgICAnc3RhdHVzJzogJ3dhaXRpbmcnLFxuICAgICAgICAgICAgJ3Jlc3BvbnNlJzogb3B0aW9ucy53YWl0aW5nLmNoYXJBdCgwKSA9PT0gJzwnID8gb3B0aW9ucy53YWl0aW5nIDogYDxkaXYgY2xhc3M9XCIke3RoaXMuZ2V0Q2xhc3NuYW1lKG9wdGlvbnMud2FpdGluZyl9XCI+PC9kaXY+YFxuICAgICAgICB9KTtcblxuICAgICAgICByZXF1ZXN0Q2ZnID0ge1xuICAgICAgICAgICAgbWV0aG9kOiBvcHRpb25zLm1ldGhvZCxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IChyZXNwKSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0QXN5bmNDb250ZW50LmNhbGwodGhpcywge1xuICAgICAgICAgICAgICAgICAgICAnc3RhdHVzJzogJ2RvbmUnLFxuICAgICAgICAgICAgICAgICAgICAncmVzcG9uc2UnOiByZXNwXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBzZXRBc3luY0NvbnRlbnQuY2FsbCh0aGlzLCB7XG4gICAgICAgICAgICAgICAgICAgICdzdGF0dXMnOiAnZXJyb3InLFxuICAgICAgICAgICAgICAgICAgICAncmVzcG9uc2UnOiAnPHA+RXJyb3Igb24gYWpheCBjYWxsLjwvcD4nLFxuICAgICAgICAgICAgICAgICAgICAnZGF0YSc6IGVyci5tZXNzYWdlIHx8IEpTT04uc3RyaW5naWZ5KGVycilcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAob3B0aW9ucy5jYWNoZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLl9vcHRpb25zLmNhY2hlID0gb3B0aW9ucy5jYWNoZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLmNhY2hlID09PSBmYWxzZSAmJiBbJ0dFVCcsICdIRUFEJ10uaW5kZXhPZihvcHRpb25zLm1ldGhvZC50b1VwcGVyQ2FzZSgpKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJlcXVlc3RDZmcuY2FjaGUgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnBhcmFtcykge1xuICAgICAgICAgICAgaWYgKFsnR0VUJywgJ0hFQUQnXS5pbmRleE9mKG9wdGlvbnMubWV0aG9kLnRvVXBwZXJDYXNlKCkpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHVybCArPSAodXJsLmluZGV4T2YoJz8nKSAhPT0gLTEgfHwgb3B0aW9ucy5wYXJhbXNbMF0gPT09ICc/JyA/ICcnIDogJz8nKSArIG9wdGlvbnMucGFyYW1zO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0Q2ZnLmRhdGEgPSBvcHRpb25zLnBhcmFtcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1ha2UgYSByZXF1ZXN0XG4gICAgICAgIHRpbnkuYWpheCh1cmwsIHJlcXVlc3RDZmcpO1xuICAgIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBDb250ZW50XG4iLCJpbXBvcnQgQ29tcG9uZW50IGZyb20gJy4vY29tcG9uZW50JztcbmltcG9ydCBQb3BvdmVyIGZyb20gJy4vcG9wb3Zlcic7XG5cbmZ1bmN0aW9uIGhpZ2hsaWdodFN1Z2dlc3Rpb24odGFyZ2V0KSB7XG4gICAgbGV0IHBvc2luc2V0O1xuXG4gICAgQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbCh0aGlzLl9zdWdnZXN0aW9uc0xpc3QuY2hpbGROb2RlcywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgaWYgKGUuY29udGFpbnModGFyZ2V0KSkge1xuICAgICAgICAgICAgcG9zaW5zZXQgPSBwYXJzZUludCh0YXJnZXQuZ2V0QXR0cmlidXRlKCdhcmlhLXBvc2luc2V0JyksIDEwKSAtIDE7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX2hpZ2hsaWdodGVkID0gKHR5cGVvZiBwb3NpbnNldCA9PT0gJ251bWJlcicpID8gcG9zaW5zZXQgOiBudWxsO1xuXG4gICAgdGhpcy5fdG9vZ2xlSGlnaGxpZ2h0ZWQoKTtcblxuICAgIHJldHVybiB0aGlzO1xufVxuXG5sZXQgc3BlY2lhbEtleUNvZGVNYXAgPSB7XG4gICAgOTogJ3RhYicsXG4gICAgMjc6ICdlc2MnLFxuICAgIDM3OiAnbGVmdCcsXG4gICAgMzk6ICdyaWdodCcsXG4gICAgMTM6ICdlbnRlcicsXG4gICAgMzg6ICd1cCcsXG4gICAgNDA6ICdkb3duJ1xufTtcblxuY29uc3QgS0VZUyA9IHtcbiAgICBCQUNLU1BBQ0U6IDgsXG4gICAgVEFCOiA5LFxuICAgIEVOVEVSOiAxMyxcbiAgICBFU0M6IDI3LFxuICAgIExFRlQ6IDM3LFxuICAgIFVQOiAzOCxcbiAgICBSSUdIVDogMzksXG4gICAgRE9XTjogNDBcbiAgICAvKlxuICAgICc4JzogJ2JhY2tzcGFjZScsXG4gICAgJzknOiAndGFiJyxcbiAgICAnMTMnOiAnZW50ZXInLFxuICAgICcyNyc6ICdlc2MnLFxuICAgICczNyc6ICdsZWZ0X2Fycm93JyxcbiAgICAnMzgnOiAndXBfYXJyb3cnLFxuICAgICczOSc6ICdyaWdodF9hcnJvdycsXG4gICAgJzQwJzogJ2Rvd25fYXJyb3cnXG4gICAgKi9cbn07XG5cbi8vIHRoZXJlIGlzIG5vIG1vdXNlZW50ZXIgdG8gaGlnaGxpZ2h0IHRoZSBpdGVtLCBzbyBpdCBoYXBwZW5zIHdoZW4gdGhlIHVzZXIgZG8gbW91c2Vkb3duXG5sZXQgaGlnaGxpZ2h0RXZlbnQgPSAodGlueS5zdXBwb3J0LnRvdWNoKSA/IHRpbnkub25wb2ludGVyZG93biA6ICdtb3VzZW92ZXInO1xuXG4vKipcbiAqIEF1dG9jb21wbGV0ZSBDb21wb25lbnQgc2hvd3MgYSBsaXN0IG9mIHN1Z2dlc3Rpb25zIGZvciBhIEhUTUxJbnB1dEVsZW1lbnQuXG4gKiBAbWVtYmVyb2YgY2hcbiAqIEBjb25zdHJ1Y3RvclxuICogQGF1Z21lbnRzIGNoLkNvbXBvbmVudFxuICogQHJlcXVpcmVzIGNoLlBvcG92ZXJcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFtlbF0gQSBIVE1MRWxlbWVudCB0byBjcmVhdGUgYW4gaW5zdGFuY2Ugb2YgY2guQXV0b2NvbXBsZXRlLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBPcHRpb25zIHRvIGN1c3RvbWl6ZSBhbiBpbnN0YW5jZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5sb2FkaW5nQ2xhc3NdIERlZmF1bHQ6IFwiY2gtYXV0b2NvbXBsZXRlLWxvYWRpbmdcIi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5oaWdobGlnaHRlZENsYXNzXSBEZWZhdWx0OiBcImNoLWF1dG9jb21wbGV0ZS1oaWdobGlnaHRlZFwiLlxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLml0ZW1DbGFzc10gRGVmYXVsdDogXCJjaC1hdXRvY29tcGxldGUtaXRlbVwiLlxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLmFkZENsYXNzXSBDU1MgY2xhc3MgbmFtZXMgdGhhdCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBjb250YWluZXIgb24gdGhlIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbi4gRGVmYXVsdDogXCJjaC1ib3gtbGl0ZSBjaC1hdXRvY29tcGxldGVcIi5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5rZXlzdHJva2VzVGltZV0gRGVmYXVsdDogMTUwLlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5odG1sXSBEZWZhdWx0OiBmYWxzZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5zaWRlXSBUaGUgc2lkZSBvcHRpb24gd2hlcmUgdGhlIHRhcmdldCBlbGVtZW50IHdpbGwgYmUgcG9zaXRpb25lZC4gWW91IG11c3QgdXNlOiBcImxlZnRcIiwgXCJyaWdodFwiLCBcInRvcFwiLCBcImJvdHRvbVwiIG9yIFwiY2VudGVyXCIuIERlZmF1bHQ6IFwiYm90dG9tXCIuXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuYWxpZ25dIFRoZSBhbGlnbiBvcHRpb25zIHdoZXJlIHRoZSB0YXJnZXQgZWxlbWVudCB3aWxsIGJlIHBvc2l0aW9uZWQuIFlvdSBtdXN0IHVzZTogXCJsZWZ0XCIsIFwicmlnaHRcIiwgXCJ0b3BcIiwgXCJib3R0b21cIiBvciBcImNlbnRlclwiLiBEZWZhdWx0OiBcImxlZnRcIi5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5vZmZzZXRYXSBUaGUgb2Zmc2V0WCBvcHRpb24gc3BlY2lmaWVzIGEgZGlzdGFuY2UgdG8gZGlzcGxhY2UgdGhlIHRhcmdldCBob3JpdG9udGFsbHkuXG4gKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMub2Zmc2V0WV0gVGhlIG9mZnNldFkgb3B0aW9uIHNwZWNpZmllcyBhIGRpc3RhbmNlIHRvIGRpc3BsYWNlIHRoZSB0YXJnZXQgdmVydGljYWxseS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5wb3NpdGlvbmVkXSBUaGUgcG9zaXRpb25lZCBvcHRpb24gc3BlY2lmaWVzIHRoZSB0eXBlIG9mIHBvc2l0aW9uaW5nIHVzZWQuIFlvdSBtdXN0IHVzZTogXCJhYnNvbHV0ZVwiIG9yIFwiZml4ZWRcIi4gRGVmYXVsdDogXCJhYnNvbHV0ZVwiLlxuICogQHBhcmFtIHsoQm9vbGVhbiB8IFN0cmluZyl9IFtvcHRpb25zLndyYXBwZXJdIFdyYXAgdGhlIHJlZmVyZW5jZSBlbGVtZW50IGFuZCBwbGFjZSB0aGUgY29udGFpbmVyIGludG8gaXQgaW5zdGVhZCBvZiBib2R5LiBXaGVuIHZhbHVlIGlzIGEgc3RyaW5nIGl0IHdpbGwgYmUgYXBwbGllZCBhcyBhZGRpdGlvbmFsIHdyYXBwZXIgY2xhc3MuIERlZmF1bHQ6IGZhbHNlLlxuICpcbiAqIEByZXR1cm5zIHthdXRvY29tcGxldGV9XG4gKiBAZXhhbXBsZVxuICogLy8gQ3JlYXRlIGEgbmV3IEF1dG9Db21wbGV0ZS5cbiAqIHZhciBhdXRvY29tcGxldGUgPSBuZXcgQXV0b0NvbXBsZXRlKFtlbF0sIFtvcHRpb25zXSk7XG4gKiBAZXhhbXBsZVxuICogLy8gQ3JlYXRlIGEgbmV3IEF1dG9Db21wbGV0ZSB3aXRoIGNvbmZpZ3VyYXRpb24uXG4gKiB2YXIgYXV0b2NvbXBsZXRlID0gbmV3IEF1dG9Db21wbGV0ZSgnLm15LWF1dG9jb21wbGV0ZScsIHtcbiAgICAgKiAgJ2xvYWRpbmdDbGFzcyc6ICdjdXN0b20tbG9hZGluZycsXG4gICAgICogICdoaWdobGlnaHRlZENsYXNzJzogJ2N1c3RvbS1oaWdobGlnaHRlZCcsXG4gICAgICogICdpdGVtQ2xhc3MnOiAnY3VzdG9tLWl0ZW0nLFxuICAgICAqICAnYWRkQ2xhc3MnOiAnY2Fyb3VzZWwtY2l0aWVzJyxcbiAgICAgKiAgJ2tleXN0cm9rZXNUaW1lJzogNjAwLFxuICAgICAqICAnaHRtbCc6IHRydWUsXG4gICAgICogICdzaWRlJzogJ2NlbnRlcicsXG4gICAgICogICdhbGlnbic6ICdjZW50ZXInLFxuICAgICAqICAnb2Zmc2V0WCc6IDAsXG4gICAgICogICdvZmZzZXRZJzogMCxcbiAgICAgKiAgJ3Bvc2l0aW9uZWQnOiAnZml4ZWQnXG4gICAgICogfSk7XG4gKi9cbmNsYXNzIEF1dG9jb21wbGV0ZSBleHRlbmRzIENvbXBvbmVudCB7XG4gICAgY29uc3RydWN0b3IoZWwsIG9wdGlvbnMpIHtcbiAgICAgICAgc3VwZXIoZWwsIG9wdGlvbnMpO1xuXG4gICAgICAgIHRoaXMuX2luaXQoZWwsIG9wdGlvbnMpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbmZpZ3VyYXRpb24gYnkgZGVmYXVsdC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgc3RhdGljIF9kZWZhdWx0cyA9IHtcbiAgICAgICAgJ2xvYWRpbmdDbGFzcyc6ICdhdXRvY29tcGxldGUtbG9hZGluZycsXG4gICAgICAgICdoaWdobGlnaHRlZENsYXNzJzogJ2F1dG9jb21wbGV0ZS1oaWdobGlnaHRlZCcsXG4gICAgICAgICdpdGVtQ2xhc3MnOiAnYXV0b2NvbXBsZXRlLWl0ZW0nLFxuICAgICAgICAnY2hvaWNlc0NsYXNzJzogJ2F1dG9jb21wbGV0ZS1jaG9pY2VzJyxcbiAgICAgICAgJ2FkZENsYXNzJzogJ2JveC1saXRlIGF1dG9jb21wbGV0ZScsXG4gICAgICAgICdzaWRlJzogJ2JvdHRvbScsXG4gICAgICAgICdhbGlnbic6ICdsZWZ0JyxcbiAgICAgICAgJ2h0bWwnOiBmYWxzZSxcbiAgICAgICAgJ19oaWRkZW5ieSc6ICdub25lJyxcbiAgICAgICAgJ2tleXN0cm9rZXNUaW1lJzogMTUwLFxuICAgICAgICAnX2l0ZW1UZW1wbGF0ZSc6ICc8bGkgY2xhc3M9XCJ7e2l0ZW1DbGFzc319XCJ7e3N1Z2dlc3RlZERhdGF9fT57e3Rlcm19fTxpIGNsYXNzPVwiY2gtaWNvbi1hcnJvdy11cFwiIGRhdGEtanM9XCJjaC1hdXRvY29tcGxldGUtY29tcGxldGUtcXVlcnlcIj48L2k+PC9saT4nLFxuICAgICAgICAnd3JhcHBlcic6IGZhbHNlLFxuICAgICAgICAnbXVsdGlwbGUnOiBmYWxzZSxcbiAgICAgICAgJ3Zpc2libGVDaG9pY2VzTGltaXQnOiAxLFxuICAgICAgICAnY2xvc2VPblNlbGVjdCc6IHRydWUsXG4gICAgICAgICdzaG93RmlsdGVycyc6IHRydWUsXG4gICAgICAgICdpMThuJzoge1xuICAgICAgICAgICAgaGlkZV9jaG9pY2VzOiAnT2N1bHRhciBzZWxlY2Npw7NuJyxcbiAgICAgICAgICAgIGNob2ljZTogJ2NvbG9uaWEnLFxuICAgICAgICAgICAgY2hvaWNlczogJ2NvbG9uaWFzJ1xuICAgICAgICB9XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhIG5ldyBpbnN0YW5jZSBvZiBBdXRvY29tcGxldGUgYW5kIG1lcmdlIGN1c3RvbSBvcHRpb25zIHdpdGggZGVmYXVsdHMgb3B0aW9ucy5cbiAgICAgKiBAbWVtYmVyb2YhIGNoLkF1dG9jb21wbGV0ZS5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEByZXR1cm5zIHthdXRvY29tcGxldGV9XG4gICAgICovXG4gICAgX2luaXQoZWwsIG9wdGlvbnMpIHtcbiAgICAgICAgdGlueS5leHRlbmQodGhpcy5fb3B0aW9ucywgQXV0b2NvbXBsZXRlLl9kZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgICAgICAgLy8gY3JlYXRlcyB0aGUgYmFzaWMgaXRlbSB0ZW1wbGF0ZSBmb3IgdGhpcyBpbnN0YW5jZVxuICAgICAgICB0aGlzLl9vcHRpb25zLl9pdGVtVGVtcGxhdGUgPSB0aGlzLl9vcHRpb25zLl9pdGVtVGVtcGxhdGUucmVwbGFjZSgne3tpdGVtQ2xhc3N9fScsIHRoaXMuZ2V0Q2xhc3NuYW1lKHRoaXMuX29wdGlvbnMuaXRlbUNsYXNzKSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX29wdGlvbnMuaHRtbCkge1xuICAgICAgICAgICAgLy8gcmVtb3ZlIHRoZSBzdWdnZXN0ZWQgZGF0YSBzcGFjZSB3aGVuIGh0bWwgaXMgY29uZmlndXJlZFxuICAgICAgICAgICAgdGhpcy5fb3B0aW9ucy5faXRlbVRlbXBsYXRlID0gdGhpcy5fb3B0aW9ucy5faXRlbVRlbXBsYXRlLnJlcGxhY2UoJ3t7c3VnZ2VzdGVkRGF0YX19JywgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX29wdGlvbnMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgIC8vIEFsd2F5cyB1c2UgdGhlIHdyYXBwZXIgd2hlbiBtdWx0aXBsZSBjaG9pY2VzIGlzIGVuYWJsZWRcbiAgICAgICAgICAgIGlmICghdGhpcy5fb3B0aW9ucy53cmFwcGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb3B0aW9ucy53cmFwcGVyID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRoZSBjb21wb25lbnQgd2hvIHNob3dzIGFuZCBtYW5hZ2UgdGhlIHN1Z2dlc3Rpb25zLlxuICAgICAgICB0aGlzLl9wb3BvdmVyID0gbmV3IFBvcG92ZXIoe1xuICAgICAgICAgICAgJ3JlZmVyZW5jZSc6IHRoaXMuX2VsLFxuICAgICAgICAgICAgJ2NvbnRlbnQnOiB0aGlzLl9zdWdnZXN0aW9uc0xpc3QsXG4gICAgICAgICAgICAnc2lkZSc6IHRoaXMuX29wdGlvbnMuc2lkZSxcbiAgICAgICAgICAgICdhbGlnbic6IHRoaXMuX29wdGlvbnMuYWxpZ24sXG4gICAgICAgICAgICAnYWRkQ2xhc3MnOiB0aGlzLl9vcHRpb25zLmFkZENsYXNzLFxuICAgICAgICAgICAgJ2hpZGRlbmJ5JzogdGhpcy5fb3B0aW9ucy5faGlkZGVuYnksXG4gICAgICAgICAgICAnd2lkdGgnOiB0aGlzLl9vcHRpb25zLndyYXBwZXIgPyAnMTAwJScgOiB0aGlzLl9lbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aCArICdweCcsIC8vIElFOCBnZXRCb3VuZGluZ0NsaWVudFJlY3QgV2FybmluZyFcbiAgICAgICAgICAgICdmeCc6IHRoaXMuX29wdGlvbnMuZngsXG4gICAgICAgICAgICAnd3JhcHBlcic6IHRoaXMuX29wdGlvbnMud3JhcHBlclxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGF1dG9jb21wbGV0ZSBjb250YWluZXIuXG4gICAgICAgICAqIEB0eXBlIHtIVE1MRGl2RWxlbWVudH1cbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gR2V0cyB0aGUgYXV0b2NvbXBsZXRlIGNvbnRhaW5lciB0byBhcHBlbmQgb3IgcHJlcGVuZCBjb250ZW50LlxuICAgICAgICAgKiBhdXRvY29tcGxldGUuY29udGFpbmVyLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpKTtcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuY29udGFpbmVyID0gdGhpcy5fcG9wb3Zlci5jb250YWluZXI7XG5cbiAgICAgICAgdGhpcy5jb250YWluZXIuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG5cbiAgICAgICAgdGhpcy5fd3JhcHBlciA9IHRoaXMuX3BvcG92ZXIuX2NvbnRhaW5lcldyYXBwZXI7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBhdXRvY29tcGxldGUgY2hvaWNlcyBsaXN0LlxuICAgICAgICAgKiBAdHlwZSB7SFRNTFVMaXN0RWxlbWVudH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIGlmICh0aGlzLl9vcHRpb25zLm11bHRpcGxlKSB7XG4gICAgICAgICAgICB0aGlzLl9jaG9pY2VzTGlzdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG4gICAgICAgICAgICB0aW55LmFkZENsYXNzKHRoaXMuX2Nob2ljZXNMaXN0LCB0aGlzLmdldENsYXNzbmFtZSh0aGlzLl9vcHRpb25zLmNob2ljZXNDbGFzcykpO1xuICAgICAgICAgICAgdGlueS5hZGRDbGFzcyh0aGlzLl9jaG9pY2VzTGlzdCwgdGhpcy5nZXRDbGFzc25hbWUodGhpcy5fb3B0aW9ucy5jaG9pY2VzQ2xhc3MrICctLWVtcHR5JykpO1xuICAgICAgICAgICAgdGlueS5hZGRDbGFzcyh0aGlzLl93cmFwcGVyLCB0aGlzLmdldENsYXNzbmFtZSgnYXV0b2NvbXBsZXRlLW11bHRpcGxlJykpO1xuXG4gICAgICAgICAgICB0aGlzLl9jaG9pY2VzTGlzdC5pbm5lckhUTUwgPSAnPGxpIGNsYXNzPVwiY2gtYXV0b2NvbXBsZXRlLXNlYXJjaC1maWVsZFwiPjxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiY2gtYXV0b2NvbXBsZXRlLXNlYXJjaC1pbnB1dFwiIGF1dG9jb21wbGV0ZT1cIm9mZlwiPjwvbGk+JztcblxuICAgICAgICAgICAgdGhpcy5fc2VhcmNoSW5wdXQgPSB0aGlzLl9jaG9pY2VzTGlzdC5xdWVyeVNlbGVjdG9yKCcuY2gtYXV0b2NvbXBsZXRlLXNlYXJjaC1pbnB1dCcpO1xuICAgICAgICAgICAgdGhpcy5fc2VhcmNoSW5wdXQuc2V0QXR0cmlidXRlKCdwbGFjZWhvbGRlcicsIHRoaXMuX2VsLmdldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInKSk7XG5cbiAgICAgICAgICAgIHRoaXMuX3dyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5fY2hvaWNlc0xpc3QpO1xuXG4gICAgICAgICAgICB0aGlzLl9wb3BvdmVyLl9vcHRpb25zLnJlZmVyZW5jZSA9IHRoaXMuX2Nob2ljZXNMaXN0O1xuICAgICAgICAgICAgdGhpcy5fcG9wb3Zlci5fcG9zaXRpb25lci5yZWZyZXNoKHtyZWZlcmVuY2U6IHRoaXMuX2Nob2ljZXNMaXN0fSk7XG5cbiAgICAgICAgICAgIHRpbnkub24odGhpcy5fc2VhcmNoSW5wdXQsICdrZXlkb3duJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9maXhJbnB1dFdpZHRoKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgYXV0b2NvbXBsZXRlIHN1Z2dlc3Rpb24gbGlzdC5cbiAgICAgICAgICogQHR5cGUge0hUTUxVTGlzdEVsZW1lbnR9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9zdWdnZXN0aW9uc0xpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpO1xuICAgICAgICB0aW55LmFkZENsYXNzKHRoaXMuX3N1Z2dlc3Rpb25zTGlzdCwgdGhpcy5nZXRDbGFzc25hbWUoJ2F1dG9jb21wbGV0ZS1saXN0JykpO1xuXG4gICAgICAgIHRoaXMuY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuX3N1Z2dlc3Rpb25zTGlzdCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFNlbGVjdHMgdGhlIGl0ZW1zXG4gICAgICAgICAqIEBtZW1iZXJvZiEgY2guQXV0b2NvbXBsZXRlLnByb3RvdHlwZVxuICAgICAgICAgKiBAZnVuY3Rpb25cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICogQHJldHVybnMge2F1dG9jb21wbGV0ZX1cbiAgICAgICAgICovXG5cbiAgICAgICAgdGhpcy5faGlnaGxpZ2h0U3VnZ2VzdGlvbiA9IChldmVudCkgPT4ge1xuICAgICAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50LFxuICAgICAgICAgICAgICAgIGl0ZW0gPSAodGFyZ2V0Lm5vZGVOYW1lID09PSAnTEknKSA/IHRhcmdldCA6ICh0YXJnZXQucGFyZW50Tm9kZS5ub2RlTmFtZSA9PT0gJ0xJJykgPyB0YXJnZXQucGFyZW50Tm9kZSA6IG51bGw7XG5cbiAgICAgICAgICAgIGlmIChpdGVtICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaGlnaGxpZ2h0U3VnZ2VzdGlvbi5jYWxsKHRoaXMsIGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRpbnkub24odGhpcy5jb250YWluZXIsIGhpZ2hsaWdodEV2ZW50LCB0aGlzLl9oaWdobGlnaHRTdWdnZXN0aW9uKTtcblxuXG4gICAgICAgIHRpbnkub24odGhpcy5jb250YWluZXIsIHRpbnkub25wb2ludGVydGFwLCAoZSkgPT4ge1xuICAgICAgICAgICAgbGV0IHRhcmdldCA9IGUudGFyZ2V0IHx8IGUuc3JjRWxlbWVudDtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IHRoaXMuZ2V0Q2xhc3NuYW1lKHRoaXMuX29wdGlvbnMuaXRlbUNsYXNzKTtcblxuICAgICAgICAgICAgLy8gY29tcGxldGVzIHRoZSB2YWx1ZSwgaXQgaXMgYSBzaG9ydGN1dCB0byBhdm9pZCB3cml0ZSB0aGUgY29tcGxldGUgd29yZFxuICAgICAgICAgICAgaWYgKHRhcmdldC5ub2RlTmFtZSA9PT0gJ0knICYmICF0aGlzLl9vcHRpb25zLmh0bWwpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZWwudmFsdWUgPSB0aGlzLl9zdWdnZXN0aW9uc1t0aGlzLl9oaWdobGlnaHRlZF07XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCd0eXBlJywgdGhpcy5fZWwudmFsdWUpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNsb3Nlc3RQYXJlbnQodGFyZ2V0LCBgLiR7dGhpcy5nZXRDbGFzc25hbWUoJ2F1dG9jb21wbGV0ZS1pdGVtJyl9YCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZWxlY3RTdWdnZXN0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgYXV0b2NvbXBsZXRlIHRyaWdnZXIuXG4gICAgICAgICAqIEB0eXBlIHtIVE1MRWxlbWVudH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudHJpZ2dlciA9IHRoaXMuX29wdGlvbnMubXVsdGlwbGUgPyB0aGlzLl9zZWFyY2hJbnB1dCA6IHRoaXMuX2VsO1xuXG4gICAgICAgIHRoaXMudHJpZ2dlci5zZXRBdHRyaWJ1dGUoJ2FyaWEtYXV0b2NvbXBsZXRlJywgJ2xpc3QnKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyLnNldEF0dHJpYnV0ZSgnYXJpYS1oYXNwb3B1cCcsICd0cnVlJyk7XG4gICAgICAgIHRoaXMudHJpZ2dlci5zZXRBdHRyaWJ1dGUoJ2FyaWEtb3ducycsIHRoaXMuY29udGFpbmVyLmdldEF0dHJpYnV0ZSgnaWQnKSk7XG4gICAgICAgIHRoaXMudHJpZ2dlci5zZXRBdHRyaWJ1dGUoJ2F1dG9jb21wbGV0ZScsICdvZmYnKTtcblxuICAgICAgICB0aW55Lm9uKHRoaXMudHJpZ2dlciwgJ2ZvY3VzJywgKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3R1cm4oJ29uJyk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aW55Lm9uKHRoaXMudHJpZ2dlciwgJ2JsdXInLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2lzT24pIHtcbiAgICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIuZm9jdXMoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy90aGlzLmVtaXQoJ2JsdXInKTtcbiAgICAgICAgICAgICAgICB0aGlzLl90dXJuKCdvZmYnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVGhlIG51bWJlciBvZiB0aGUgc2VsZWN0ZWQgaXRlbSBvciBudWxsIHdoZW4gbm8gc2VsZWN0ZWQgaXRlbSBpcy5cbiAgICAgICAgdGhpcy5faGlnaGxpZ2h0ZWQgPSBudWxsO1xuXG4gICAgICAgIC8vIENvbGxlY3Rpb24gb2Ygc3VnZ2VzdGlvbnMgdG8gYmUgc2hvd24uXG4gICAgICAgIHRoaXMuX3N1Z2dlc3Rpb25zID0gW107XG5cbiAgICAgICAgLy8gT3JpZ2luYWwgc3VnZ2VzdGlvbnNcbiAgICAgICAgdGhpcy5fc3VnZ2VzdGlvbnNEYXRhID0gW107XG5cbiAgICAgICAgLy8gVGhlIGxpc3Qgb2YgYXBwbGllZCBmaWx0ZXJzXG4gICAgICAgIHRoaXMuX2ZpbHRlcnMgPSBbXTtcblxuICAgICAgICAvLyBDdXJyZW50IHNlbGVjdGVkIHZhbHVlc1xuICAgICAgICB0aGlzLl92YWx1ZSA9IHRoaXMuX29wdGlvbnMubXVsdGlwbGUgPyBbXSA6ICcnO1xuXG4gICAgICAgIC8vIFVzZWQgdG8gc2hvdyB3aGVuIHRoZSB1c2VyIGNhbmNlbCB0aGUgc3VnZ2VzdGlvbnNcbiAgICAgICAgdGhpcy5fb3JpZ2luYWxRdWVyeSA9IHRoaXMuX2N1cnJlbnRRdWVyeSA9IHRoaXMuX2VsLnZhbHVlO1xuXG4gICAgICAgIHRoaXMuX2NvbmZpZ3VyZVNob3J0Y3V0cygpO1xuXG4gICAgICAgIHRoaXMuX2lzT24gPSBmYWxzZTtcblxuICAgICAgICAvLyBUdXJuIG9uIHdoZW4gdGhlIGlucHV0IGVsZW1lbnQgaXMgYWxyZWFkeSBoYXMgZm9jdXNcbiAgICAgICAgaWYgKHRoaXMudHJpZ2dlciA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAmJiAhdGhpcy5fZW5hYmxlZCkge1xuICAgICAgICAgICAgdGhpcy5fdHVybignb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICBjbGVhckZpbHRlcnMoKSB7XG4gICAgICAgIHRoaXMuX2ZpbHRlcnMgPSBbXTtcblxuICAgICAgICBpZiAodGhpcy5fb3B0aW9ucy5zaG93RmlsdGVycykge1xuICAgICAgICAgICAgWy4uLnRoaXMuX2Nob2ljZXNMaXN0LnF1ZXJ5U2VsZWN0b3JBbGwoYC4ke3RoaXMuZ2V0Q2xhc3NuYW1lKCdhdXRvY29tcGxldGUtZmlsdGVyJyl9YCldLmZvckVhY2goZiA9PiBmLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZikpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc2V0RmlsdGVycyhmaWx0ZXJzKSB7XG4gICAgICAgIHRoaXMuY2xlYXJGaWx0ZXJzKCk7XG5cbiAgICAgICAgaWYgKGZpbHRlcnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9maWx0ZXJzID0gZmlsdGVycztcblxuICAgICAgICBpZiAodGhpcy5fb3B0aW9ucy5zaG93RmlsdGVycyAmJiB0aGlzLl9vcHRpb25zLm11bHRpcGxlKSB7XG4gICAgICAgICAgICBjb25zdCBmaWx0ZXJzTGFiZWwgPSB0aGlzLl9maWx0ZXJzLm1hcChmID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYDxsaSBjbGFzcz1cIiR7dGhpcy5nZXRDbGFzc25hbWUoJ2F1dG9jb21wbGV0ZS1maWx0ZXInKX1cIiBkYXRhLXZhbHVlPVwiJHtmLnZhbHVlfVwiPjxzcGFuPiR7Zi5uYW1lIHx8IGYudmFsdWV9PC9zcGFuPjwvbGk+YDtcbiAgICAgICAgICAgIH0pLmpvaW4oJycpO1xuXG4gICAgICAgICAgICB0aGlzLl9jaG9pY2VzTGlzdC5pbnNlcnRBZGphY2VudEhUTUwoJ2FmdGVyYmVnaW4nLCBmaWx0ZXJzTGFiZWwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0RmlsdGVycygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZpbHRlcnM7XG4gICAgfVxuXG4gICAgZ2V0VmFsdWUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgICB9XG5cbiAgICBjbGVhcigpIHtcbiAgICAgICAgaWYgKHRoaXMuX29wdGlvbnMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgIHRoaXMuX3ZhbHVlID0gW107XG4gICAgICAgICAgICB0aGlzLl9jbGVhckNob2ljZXMoKTtcbiAgICAgICAgICAgIHRpbnkuYWRkQ2xhc3ModGhpcy5fY2hvaWNlc0xpc3QsIHRoaXMuZ2V0Q2xhc3NuYW1lKHRoaXMuX29wdGlvbnMuY2hvaWNlc0NsYXNzKyAnLS1lbXB0eScpKTtcbiAgICAgICAgICAgIHRoaXMuX3NlYXJjaElucHV0LnN0eWxlLndpZHRoID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl92YWx1ZSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY2xlYXJGaWx0ZXJzKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgX3JlbW92ZUNob2ljZShlbCkge1xuICAgICAgICBbLi4udGhpcy5fd3JhcHBlci5xdWVyeVNlbGVjdG9yQWxsKGAuJHt0aGlzLmdldENsYXNzbmFtZSgnYXV0b2NvbXBsZXRlLWNob2ljZScpfWApXS5mb3JFYWNoKChmLCBpKSA9PiB7XG4gICAgICAgICAgICBpZiAoZWwuaXNFcXVhbE5vZGUoZikpIHtcbiAgICAgICAgICAgICAgICBmLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZik7XG4gICAgICAgICAgICAgICAgdGhpcy5fdmFsdWUuc3BsaWNlKGksIDEpO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc3VtbWFyeSA9IHRoaXMuX2Nob2ljZXNMaXN0LnF1ZXJ5U2VsZWN0b3IoJy5jaC1hdXRvY29tcGxldGUtY2hvaWNlcy1zdW1tYXJ5Jyk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xlYXJGaWx0ZXJzKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsbCA9IHRoaXMuX3dyYXBwZXIucXVlcnlTZWxlY3RvcignLmNoLWF1dG9jb21wbGV0ZS1jaG9pY2VzLWFsbCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChhbGwpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1bW1hcnkucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChzdW1tYXJ5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gc3VtbWFyeS5xdWVyeVNlbGVjdG9yKCdhJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWEuZ2V0QXR0cmlidXRlKCdkYXRhLW9wZW5lZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYS5pbm5lclRleHQgPSBgJHt0aGlzLl92YWx1ZS5sZW5ndGh9IGNvbG9uaWFzYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBfY2xlYXJDaG9pY2VzKCkge1xuICAgICAgICBbLi4udGhpcy5fY2hvaWNlc0xpc3QucXVlcnlTZWxlY3RvckFsbChgLiR7dGhpcy5nZXRDbGFzc25hbWUoJ2F1dG9jb21wbGV0ZS1jaG9pY2UnKX1gKV0uZm9yRWFjaChmID0+IGYucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChmKSk7XG4gICAgICAgIGNvbnN0IHN1bW1hcnkgPSB0aGlzLl9jaG9pY2VzTGlzdC5xdWVyeVNlbGVjdG9yKCcuY2gtYXV0b2NvbXBsZXRlLWNob2ljZXMtc3VtbWFyeScpO1xuICAgICAgICBpZiAoc3VtbWFyeSkge1xuICAgICAgICAgICAgc3VtbWFyeS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHN1bW1hcnkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGFsbCA9IHRoaXMuX3dyYXBwZXIucXVlcnlTZWxlY3RvcignLmNoLWF1dG9jb21wbGV0ZS1jaG9pY2VzLWFsbCcpO1xuICAgICAgICBpZiAoYWxsKSB7XG4gICAgICAgICAgICBhbGwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChhbGwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgX2RyYXdTaW5nbGVDaG9pY2UoY2hvaWNlKSB7XG4gICAgICAgIGNvbnN0IGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICAgICAgbGkuY2xhc3NOYW1lID0gJ2NoLWF1dG9jb21wbGV0ZS1jaG9pY2UnO1xuICAgICAgICBsaS5pbm5lckhUTUwgPSBgPHNwYW4+JHtjaG9pY2V9PC9zcGFuPjxhIGNsYXNzPVwiY2gtYXV0b2NvbXBsZXRlLWNob2ljZS1yZW1vdmVcIj48L2E+YDtcblxuICAgICAgICB0aW55Lm9uKGxpLnF1ZXJ5U2VsZWN0b3IoJ2EnKSwgJ2NsaWNrJywgZSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLl9yZW1vdmVDaG9pY2UobGkpO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gbGk7XG4gICAgfVxuXG4gICAgX2ZpeElucHV0V2lkdGgoKSB7XG4gICAgICAgIHRoaXMuX3NlYXJjaElucHV0LnN0eWxlLndpZHRoID0gYCR7KHRoaXMuX3NlYXJjaElucHV0LnZhbHVlLmxlbmd0aCArIDIpICogLjU1fWVtYDtcbiAgICB9XG5cbiAgICBfc2hvd0FsbENob2ljZXMoKSB7XG4gICAgICAgIGNvbnN0IGxpc3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpO1xuICAgICAgICBsaXN0LmNsYXNzTmFtZSA9ICdjaC1hdXRvY29tcGxldGUtY2hvaWNlcy1hbGwnO1xuXG4gICAgICAgIHRoaXMuX3ZhbHVlLmZvckVhY2godiA9PiB7XG4gICAgICAgICAgICBjb25zdCBjaG9pY2UgPSB0aGlzLl9kcmF3U2luZ2xlQ2hvaWNlKHYpO1xuICAgICAgICAgICAgbGlzdC5hcHBlbmRDaGlsZChjaG9pY2UpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBjbGVhciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIGNsZWFyLmNsYXNzTmFtZSA9ICdjaC1hdXRvY29tcGxldGUtcmVtb3ZlLWFsbCc7XG4gICAgICAgIGNsZWFyLmlubmVyVGV4dCA9IGBMaW1waWFyYDtcbiAgICAgICAgbGlzdC5hcHBlbmRDaGlsZChjbGVhcik7XG5cbiAgICAgICAgdGlueS5vbihjbGVhciwgJ2NsaWNrJywgZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX2Nob2ljZXNMaXN0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGxpc3QsIHRoaXMuX2Nob2ljZXNMaXN0Lm5leHRTaWJsaW5nKTtcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqIFR1cm5zIG9uIHRoZSBhYmlsaXR5IG9mZiBsaXN0ZW4gdGhlIGtleXN0cm9rZXNcbiAgICAgKiBAbWVtYmVyb2YhIGNoLkF1dG9jb21wbGV0ZS5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEByZXR1cm5zIHthdXRvY29tcGxldGV9XG4gICAgICovXG4gICAgX3R1cm4gKHR1cm4pIHtcbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIGlmICghdGhpcy5fZW5hYmxlZCB8fCB0aGlzLl9pc09uKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG5cbiAgICAgICAgZnVuY3Rpb24gdHVybk9uKCkge1xuICAgICAgICAgICAgdGhhdC5faXNPbiA9IHRydWU7XG5cbiAgICAgICAgICAgIHRoYXQuX2N1cnJlbnRRdWVyeSA9IHRoYXQudHJpZ2dlci52YWx1ZS50cmltKCk7XG5cbiAgICAgICAgICAgIC8vIHdoZW4gdGhlIHVzZXIgd3JpdGVzXG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoYXQuX3N0b3BUeXBpbmcpO1xuXG4gICAgICAgICAgICB0aGF0Ll9zdG9wVHlwaW5nID0gd2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgdGlueS5hZGRDbGFzcyh0aGF0LnRyaWdnZXIsIHRoYXQuZ2V0Q2xhc3NuYW1lKHRoYXQuX29wdGlvbnMubG9hZGluZ0NsYXNzKSk7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogRXZlbnQgZW1pdHRlZCB3aGVuIHRoZSB1c2VyIGlzIHR5cGluZy5cbiAgICAgICAgICAgICAgICAgKiBAZXZlbnQgY2guQXV0b2NvbXBsZXRlI3R5cGVcbiAgICAgICAgICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgICAgICAgICAqIC8vIFN1YnNjcmliZSB0byBcInR5cGVcIiBldmVudCB3aXRoIGFqYXggY2FsbFxuICAgICAgICAgICAgICAgICAqIGF1dG9jb21wbGV0ZS5vbigndHlwZScsIGZ1bmN0aW9uICh1c2VySW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgKiAgICAgICQuYWpheCh7XG4gICAgICAgICAgICAgICAgICogICAgICAgICAgJ3VybCc6ICcvY291bnRyaWVzP3E9JyArIHVzZXJJbnB1dCxcbiAgICAgICAgICAgICAgICAgKiAgICAgICAgICAnZGF0YVR5cGUnOiAnanNvbicsXG4gICAgICAgICAgICAgICAgICogICAgICAgICAgJ3N1Y2Nlc3MnOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgKiAgICAgICAgICAgICAgYXV0b2NvbXBsZXRlLnN1Z2dlc3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAqICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgKiAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAqIH0pO1xuICAgICAgICAgICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAgICAgICAgICogLy8gU3Vic2NyaWJlIHRvIFwidHlwZVwiIGV2ZW50IHdpdGgganNvbnBcbiAgICAgICAgICAgICAgICAgKiBhdXRvY29tcGxldGUub24oJ3R5cGUnLCBmdW5jdGlvbiAodXNlcklucHV0KSB7XG4gICAgICAgICAgICAgICAgICogICAgICAgJC5hamF4KHtcbiAgICAgICAgICAgICAgICAgKiAgICAgICAgICAgJ3VybCc6ICcvY291bnRyaWVzP3E9JysgdXNlcklucHV0ICsnJmNhbGxiYWNrPXBhcnNlUmVzdWx0cycsXG4gICAgICAgICAgICAgICAgICogICAgICAgICAgICdkYXRhVHlwZSc6ICdqc29ucCcsXG4gICAgICAgICAgICAgICAgICogICAgICAgICAgICdjYWNoZSc6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAqICAgICAgICAgICAnZ2xvYmFsJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgKiAgICAgICAgICAgJ2NvbnRleHQnOiB3aW5kb3csXG4gICAgICAgICAgICAgICAgICogICAgICAgICAgICdqc29ucCc6ICdwYXJzZVJlc3VsdHMnLFxuICAgICAgICAgICAgICAgICAqICAgICAgICAgICAnY3Jvc3NEb21haW4nOiB0cnVlXG4gICAgICAgICAgICAgICAgICogICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICogfSk7XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdGhhdC5lbWl0KCd0eXBlJywgdGhhdC5fY3VycmVudFF1ZXJ5KTtcbiAgICAgICAgICAgIH0sIHRoYXQuX29wdGlvbnMua2V5c3Ryb2tlc1RpbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdHVybk9uRmFsbGJhY2soZSkge1xuICAgICAgICAgICAgaWYgKHNwZWNpYWxLZXlDb2RlTWFwW2Uud2hpY2ggfHwgZS5rZXlDb2RlXSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFdoZW4ga2V5ZG93biBpcyBmaXJlZCB0aGF0LnRyaWdnZXIgc3RpbGwgaGFzIGFuIG9sZCB2YWx1ZVxuICAgICAgICAgICAgc2V0VGltZW91dCh0dXJuT24sIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fb3JpZ2luYWxRdWVyeSA9IHRoaXMudHJpZ2dlci52YWx1ZTtcblxuICAgICAgICAvLyBJRTggZG9uJ3Qgc3VwcG9ydCB0aGUgaW5wdXQgZXZlbnQgYXQgYWxsXG4gICAgICAgIC8vIElFOSBpcyB0aGUgb25seSBicm93c2VyIHRoYXQgZG9lc24ndCBmaXJlIHRoZSBpbnB1dCBldmVudCB3aGVuIGNoYXJhY3RlcnMgYXJlIHJlbW92ZWRcbiAgICAgICAgdmFyIHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICAgICAgdmFyIE1TSUUgPSAoLyhtc2llfHRyaWRlbnQpL2kpLnRlc3QodWEpID9cbiAgICAgICAgICAgIHVhLm1hdGNoKC8obXNpZSB8cnY6KShcXGQrKC5cXGQrKT8pL2kpWzJdIDogZmFsc2U7XG5cbiAgICAgICAgaWYgKHR1cm4gPT09ICdvbicpIHtcbiAgICAgICAgICAgIGlmICghTVNJRSB8fCBNU0lFID4gOSkge1xuICAgICAgICAgICAgICAgIHRpbnkub24odGhpcy50cmlnZ2VyLCB0aW55Lm9ua2V5aW5wdXQsIHR1cm5Pbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICdrZXlkb3duIGN1dCBwYXN0ZScuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChldnROYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbnkub24odGhhdC50cmlnZ2VyLCBldnROYW1lLCB0dXJuT25GYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHVybiA9PT0gJ29mZicpIHtcbiAgICAgICAgICAgIHRoYXQuX2lzT24gPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuaGlkZSgpO1xuICAgICAgICAgICAgaWYgKCFNU0lFIHx8IE1TSUUgPiA5KSB7XG4gICAgICAgICAgICAgICAgdGlueS5vZmYodGhpcy50cmlnZ2VyLCB0aW55Lm9ua2V5aW5wdXQsIHR1cm5Pbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICdrZXlkb3duIGN1dCBwYXN0ZScuc3BsaXQoJyAnKS5mb3JFYWNoKGZ1bmN0aW9uIChldnROYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbnkub2ZmKHRoYXQudHJpZ2dlciwgZXZ0TmFtZSwgdHVybk9uRmFsbGJhY2spO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEl0IHNldHMgdG8gdGhlIEhUTUxJbnB1dEVsZW1lbnQgdGhlIHNlbGVjdGVkIHF1ZXJ5IGFuZCBpdCBlbWl0cyBhICdzZWxlY3QnIGV2ZW50LlxuICAgICAqIEBtZW1iZXJvZiEgY2guQXV0b2NvbXBsZXRlLnByb3RvdHlwZVxuICAgICAqIEBmdW5jdGlvblxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHJldHVybnMge2F1dG9jb21wbGV0ZX1cbiAgICAgKi9cbiAgICBfc2VsZWN0U3VnZ2VzdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5fc3RvcFR5cGluZyk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2hpZ2hsaWdodGVkID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5fb3B0aW9ucy5odG1sKSB7XG4gICAgICAgICAgICAvLyBGSVhNRVxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSB0aGlzLl9zdWdnZXN0aW9uc1t0aGlzLl9oaWdobGlnaHRlZF0uc3BsaXQoJywnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9vcHRpb25zLm11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fdmFsdWUucHVzaChwYXJ0c1swXS50cmltKCkpO1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlci52YWx1ZSA9ICcnO1xuXG4gICAgICAgICAgICAgICAgdGlueS5yZW1vdmVDbGFzcyh0aGlzLl9jaG9pY2VzTGlzdCwgdGhpcy5nZXRDbGFzc25hbWUodGhpcy5fb3B0aW9ucy5jaG9pY2VzQ2xhc3MgKyAnLS1lbXB0eScpKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl92YWx1ZS5sZW5ndGggPiB0aGlzLl9vcHRpb25zLnZpc2libGVDaG9pY2VzTGltaXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY2xlYXJDaG9pY2VzKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3VtbWFyeSA9IHRoaXMuX2Nob2ljZXNMaXN0LnF1ZXJ5U2VsZWN0b3IoJy5jaC1hdXRvY29tcGxldGUtY2hvaWNlcy1zdW1tYXJ5Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBgJHt0aGlzLl92YWx1ZS5sZW5ndGh9IGNvbG9uaWFzYDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1bW1hcnkucXVlcnlTZWxlY3RvcignYScpLmlubmVyVGV4dCA9IHRleHQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaS5jbGFzc05hbWUgPSAnY2gtYXV0b2NvbXBsZXRlLWNob2ljZXMtc3VtbWFyeSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBsaS5pbm5lckhUTUwgPSBgPGE+JHt0ZXh0fTwvYT5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXRXcmFwcGVyID0gdGhpcy5fc2VhcmNoSW5wdXQucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0V3JhcHBlci5wYXJlbnROb2RlLmluc2VydEJlZm9yZShsaSwgaW5wdXRXcmFwcGVyKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGlueS5vbihsaS5xdWVyeVNlbGVjdG9yKCdhJyksICdjbGljaycsIGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhID0gZS50YXJnZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEuZ2V0QXR0cmlidXRlKCdkYXRhLW9wZW5lZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEucmVtb3ZlQXR0cmlidXRlKCdkYXRhLW9wZW5lZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhLmlubmVyVGV4dCA9IGAke3RoaXMuX3ZhbHVlLmxlbmd0aH0gY29sb25pYXNgO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gdGhpcy5fd3JhcHBlci5xdWVyeVNlbGVjdG9yKCcuY2gtYXV0b2NvbXBsZXRlLWNob2ljZXMtYWxsJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChsaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhLnNldEF0dHJpYnV0ZSgnZGF0YS1vcGVuZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYS5pbm5lclRleHQgPSBgT2N1bHRhciBzZWxlY2Npw7NuYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc2hvd0FsbENob2ljZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hvaWNlID0gdGhpcy5fZHJhd1NpbmdsZUNob2ljZShwYXJ0c1swXS50cmltKCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnB1dFdyYXBwZXIgPSB0aGlzLl9zZWFyY2hJbnB1dC5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgICAgICBpbnB1dFdyYXBwZXIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY2hvaWNlLCBpbnB1dFdyYXBwZXIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl92YWx1ZSA9IHBhcnRzWzBdLnRyaW0oKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIudmFsdWUgPSB0aGlzLl92YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLl9vcHRpb25zLm11bHRpcGxlKSB7XG4gICAgICAgICAgICB0aGlzLnN1Z2dlc3QoW10pO1xuICAgICAgICAgICAgdGhpcy5fZml4SW5wdXRXaWR0aCgpO1xuICAgICAgICAgICAgdGhpcy5fdHVybignb2ZmJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZWFyY2hJbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgfSwgMTApO1xuXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fb3B0aW9ucy5jbG9zZU9uU2VsZWN0KSB7XG4gICAgICAgICAgICB0aGlzLl9pc09uID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIuYmx1cigpO1xuICAgICAgICB9XG5cblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgZW1pdHRlZCB3aGVuIGEgc3VnZ2VzdGlvbiBpcyBzZWxlY3RlZC5cbiAgICAgICAgICogQGV2ZW50IGNoLkF1dG9jb21wbGV0ZSNzZWxlY3RcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gU3Vic2NyaWJlIHRvIFwic2VsZWN0XCIgZXZlbnQuXG4gICAgICAgICAqIGF1dG9jb21wbGV0ZS5vbignc2VsZWN0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgKiAgICAgLy8gU29tZSBjb2RlIGhlcmUhXG4gICAgICAgICAqIH0pO1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbWl0KCdzZWxlY3QnLCB0aGlzLl9zdWdnZXN0aW9uc1t0aGlzLl9oaWdobGlnaHRlZF0sIHRoaXMuX2hpZ2hsaWdodGVkKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogSXQgaGlnaGxpZ2h0cyB0aGUgaXRlbSBhZGRpbmcgdGhlIFwiY2gtYXV0b2NvbXBsZXRlLWhpZ2hsaWdodGVkXCIgY2xhc3MgbmFtZSBvciB0aGUgY2xhc3MgbmFtZSB0aGF0IHlvdSBjb25maWd1cmVkIGFzIFwiaGlnaGxpZ2h0ZWRDbGFzc1wiIG9wdGlvbi5cbiAgICAgKiBAbWVtYmVyb2YhIGNoLkF1dG9jb21wbGV0ZS5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEByZXR1cm5zIHthdXRvY29tcGxldGV9XG4gICAgICovXG4gICAgX3Rvb2dsZUhpZ2hsaWdodGVkICgpIHtcbiAgICAgICAgLy8gbnVsbCBpcyB3aGVuIGlzIG5vdCBhIHNlbGVjdGVkIGl0ZW0gYnV0LFxuICAgICAgICAvLyBpbmNyZW1lbnRzIDEgX2hpZ2hsaWdodGVkIGJlY2F1c2UgYXJpYS1wb3NpbnNldCBzdGFydHMgaW4gMSBpbnN0ZWFkIDAgYXMgdGhlIGNvbGxlY3Rpb24gdGhhdCBzdG9yZXMgdGhlIGRhdGFcbiAgICAgICAgbGV0IGhpZ2hsaWdodGVkQ2xhc3NOYW1lID0gdGhpcy5nZXRDbGFzc25hbWUodGhpcy5fb3B0aW9ucy5oaWdobGlnaHRlZENsYXNzKSxcbiAgICAgICAgICAgIGN1cnJlbnQgPSAodGhpcy5faGlnaGxpZ2h0ZWQgPT09IG51bGwpID8gbnVsbCA6ICh0aGlzLl9oaWdobGlnaHRlZCArIDEpLFxuICAgICAgICAgICAgY3VycmVudEl0ZW0gPSB0aGlzLmNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGBbYXJpYS1wb3NpbnNldD1cIiR7Y3VycmVudH1cIl1gKSxcbiAgICAgICAgICAgIHNlbGVjdGVkSXRlbSA9IHRoaXMuY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoYFthcmlhLXBvc2luc2V0XS4ke2hpZ2hsaWdodGVkQ2xhc3NOYW1lfWApO1xuXG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW0gIT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIGJhY2tncm91bmQgdGhlIGhpZ2hsaWdodGVkIGl0ZW1cbiAgICAgICAgICAgIHRpbnkucmVtb3ZlQ2xhc3Moc2VsZWN0ZWRJdGVtLCBoaWdobGlnaHRlZENsYXNzTmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudEl0ZW0gIT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIGhpZ2hsaWdodCB0aGUgc2VsZWN0ZWQgaXRlbVxuICAgICAgICAgICAgdGlueS5hZGRDbGFzcyhjdXJyZW50SXRlbSwgaGlnaGxpZ2h0ZWRDbGFzc05hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIF9jb25maWd1cmVTaG9ydGN1dHMgKCkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWZlcmVuY2UgdG8gY29udGV4dCBvZiBhbiBpbnN0YW5jZS5cbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHZhciB0aGF0ID0gdGhpcztcblxuICAgICAgICB0aW55Lm9uKHRoaXMudHJpZ2dlciwgJ2tleXVwJywgKGUpID0+IHtcbiAgICAgICAgICAgIGxldCBrZXkgPSBlLndoaWNoIHx8IGUua2V5Q29kZTtcbiAgICAgICAgICAgIGxldCB2YWx1ZTtcblxuICAgICAgICAgICAgc3dpdGNoIChrZXkpIHtcbiAgICAgICAgICAgICAgICBjYXNlIEtFWVMuRU5URVI6XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX3NlbGVjdFN1Z2dlc3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBLRVlTLkVTQzpcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoYXQudHJpZ2dlci52YWx1ZSA9IHRoYXQuX29yaWdpbmFsUXVlcnk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgS0VZUy5ET1dOOlxuICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2UgdGhlIHNlbGVjdGVkIHZhbHVlICYgc3RvcmVzIHRoZSBmdXR1cmUgSFRNTElucHV0RWxlbWVudCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5faGlnaGxpZ2h0ZWQgPj0gdGhhdC5fc3VnZ2VzdGlvbnNRdWFudGl0eSAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuX2hpZ2hsaWdodGVkID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhhdC5fY3VycmVudFF1ZXJ5O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5faGlnaGxpZ2h0ZWQgPSB0aGF0Ll9oaWdobGlnaHRlZCA9PT0gbnVsbCA/IDAgOiB0aGF0Ll9oaWdobGlnaHRlZCArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoYXQuX3N1Z2dlc3Rpb25zW3RoYXQuX2hpZ2hsaWdodGVkXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHRoYXQuX3Rvb2dsZUhpZ2hsaWdodGVkKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGF0Ll9vcHRpb25zLmh0bWwgJiYgIXRoaXMuX29wdGlvbnMubXVsdGlwbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IHZhbHVlLnNwbGl0KCcsJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0LnRyaWdnZXIudmFsdWUgPSBwYXJ0c1swXS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBLRVlTLlVQOlxuICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2UgdGhlIHNlbGVjdGVkIHZhbHVlICYgc3RvcmVzIHRoZSBmdXR1cmUgSFRNTElucHV0RWxlbWVudCB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5faGlnaGxpZ2h0ZWQgPT09IG51bGwpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5faGlnaGxpZ2h0ZWQgPSB0aGF0Ll9zdWdnZXN0aW9uc1F1YW50aXR5IC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdGhhdC5fc3VnZ2VzdGlvbnNbdGhhdC5faGlnaGxpZ2h0ZWRdO1xuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhhdC5faGlnaGxpZ2h0ZWQgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5faGlnaGxpZ2h0ZWQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGF0Ll9jdXJyZW50UXVlcnk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGF0Ll9oaWdobGlnaHRlZCAtPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSB0aGF0Ll9zdWdnZXN0aW9uc1t0aGF0Ll9oaWdobGlnaHRlZF07XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aGF0Ll90b29nbGVIaWdobGlnaHRlZCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhhdC5fb3B0aW9ucy5odG1sICYmICF0aGlzLl9vcHRpb25zLm11bHRpcGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGSVhNRVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSB2YWx1ZS5zcGxpdCgnLCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC50cmlnZ2VyLnZhbHVlID0gcGFydHNbMF0udHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoW0tFWVMuRU5URVIsIEtFWVMuRE9XTiwgS0VZUy5VUF0uaW5kZXhPZihrZXkpID4gLTEpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRpbnkub24odGhpcy50cmlnZ2VyLCAna2V5ZG93bicsIGUgPT4ge1xuICAgICAgICAgICAgbGV0IGtleSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xuXG4gICAgICAgICAgICBpZiAoa2V5ID09PSBLRVlTLkJBQ0tTUEFDRSAmJiB0aGlzLnRyaWdnZXIudmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGVhcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKlxuICAgICAgICAvLyBTaG9ydGN1dHNcbiAgICAgICAgY2guc2hvcnRjdXRzLmFkZChjaC5vbmtleWVudGVyLCB0aGlzLnVpZCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdGhhdC5fc2VsZWN0U3VnZ2VzdGlvbigpO1xuICAgICAgICB9KTtcblxuICAgICAgICBjaC5zaG9ydGN1dHMuYWRkKGNoLm9ua2V5ZXNjLCB0aGlzLnVpZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhhdC5oaWRlKCk7XG4gICAgICAgICAgICB0aGF0Ll9lbC52YWx1ZSA9IHRoYXQuX29yaWdpbmFsUXVlcnk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNoLnNob3J0Y3V0cy5hZGQoY2gub25rZXl1cGFycm93LCB0aGlzLnVpZCwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICB2YXIgdmFsdWU7XG5cbiAgICAgICAgICAgIC8vIGNoYW5nZSB0aGUgc2VsZWN0ZWQgdmFsdWUgJiBzdG9yZXMgdGhlIGZ1dHVyZSBIVE1MSW5wdXRFbGVtZW50IHZhbHVlXG4gICAgICAgICAgICBpZiAodGhhdC5faGlnaGxpZ2h0ZWQgPT09IG51bGwpIHtcblxuICAgICAgICAgICAgICAgIHRoYXQuX2hpZ2hsaWdodGVkID0gdGhhdC5fc3VnZ2VzdGlvbnNRdWFudGl0eSAtIDE7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0aGF0Ll9zdWdnZXN0aW9uc1t0aGF0Ll9oaWdobGlnaHRlZF07XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhhdC5faGlnaGxpZ2h0ZWQgPD0gMCkge1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fcHJldkhpZ2hsaWdodGVkID0gdGhpcy5fY3VycmVudEhpZ2hsaWdodGVkID0gbnVsbDtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRoYXQuX2N1cnJlbnRRdWVyeTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIHRoYXQuX2hpZ2hsaWdodGVkIC09IDE7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0aGF0Ll9zdWdnZXN0aW9uc1t0aGF0Ll9oaWdobGlnaHRlZF07XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhhdC5fdG9vZ2xlSGlnaGxpZ2h0ZWQoKTtcblxuICAgICAgICAgICAgaWYgKCF0aGF0Ll9vcHRpb25zLmh0bWwpIHtcbiAgICAgICAgICAgICAgICB0aGF0Ll9lbC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNoLnNob3J0Y3V0cy5hZGQoY2gub25rZXlkb3duYXJyb3csIHRoaXMudWlkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWU7XG5cbiAgICAgICAgICAgIC8vIGNoYW5nZSB0aGUgc2VsZWN0ZWQgdmFsdWUgJiBzdG9yZXMgdGhlIGZ1dHVyZSBIVE1MSW5wdXRFbGVtZW50IHZhbHVlXG4gICAgICAgICAgICBpZiAodGhhdC5faGlnaGxpZ2h0ZWQgPT09IG51bGwpIHtcblxuICAgICAgICAgICAgICAgIHRoYXQuX2hpZ2hsaWdodGVkID0gMDtcblxuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhhdC5fc3VnZ2VzdGlvbnNbdGhhdC5faGlnaGxpZ2h0ZWRdO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoYXQuX2hpZ2hsaWdodGVkID49IHRoYXQuX3N1Z2dlc3Rpb25zUXVhbnRpdHkgLSAxKSB7XG5cbiAgICAgICAgICAgICAgICB0aGF0Ll9oaWdobGlnaHRlZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0aGF0Ll9jdXJyZW50UXVlcnk7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICB0aGF0Ll9oaWdobGlnaHRlZCArPSAxO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gdGhhdC5fc3VnZ2VzdGlvbnNbdGhhdC5faGlnaGxpZ2h0ZWRdO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoYXQuX3Rvb2dsZUhpZ2hsaWdodGVkKCk7XG5cbiAgICAgICAgICAgIGlmICghdGhhdC5fb3B0aW9ucy5odG1sKSB7XG4gICAgICAgICAgICAgICAgdGhhdC5fZWwudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcbiAgICAgICAgKi9cblxuICAgICAgICAvLyBBY3RpdmF0ZSB0aGUgc2hvcnRjdXRzIGZvciB0aGlzIGluc3RhbmNlXG4gICAgICAgIHRoaXMuX3BvcG92ZXIub24oJ3Nob3cnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2hvdycpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWFjdGl2YXRlIHRoZSBzaG9ydGN1dHMgZm9yIHRoaXMgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5fcG9wb3Zlci5vbignaGlkZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdoaWRlJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMub24oJ2Rlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjaC5zaG9ydGN1dHMucmVtb3ZlKHRoaXMudWlkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEFkZCBzdWdnZXN0aW9ucyB0byBiZSBzaG93bi5cbiAgICAgKiBAbWVtYmVyb2YhIGNoLkF1dG9jb21wbGV0ZS5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7YXV0b2NvbXBsZXRlfVxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gVGhlIHN1Z2dlc3QgbWV0aG9kIG5lZWRzIGFuIEFycmF5IG9mIHN0cmluZ3MgdG8gd29yayB3aXRoIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAqIGF1dG9jb21wbGV0ZS5zdWdnZXN0KFsnQXJ1YmEnLCdBcm1lbmlhJywnQXJnZW50aW5hJ10pO1xuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gVG8gd29yayB3aXRoIGh0bWwgY29uZmlndXJhdGlvbiwgaXQgbmVlZHMgYW4gQXJyYXkgb2Ygc3RyaW5ncy4gRWFjaCBzdHJpbmcgbXVzdCB0byBiZSBhcyB5b3Ugd2lzaCB5b3Ugd2F0Y2ggaXRcbiAgICAgKiBhdXRvY29tcGxldGUuc3VnZ2VzdChbXG4gICAgICogICc8c3Ryb25nPkFyPC9zdHJvbmc+dWJhIDxpIGNsYXNzPVwiZmxhZy1hcnViYVwiPjwvaT4nLFxuICAgICAqICAnPHN0cm9uZz5Bcjwvc3Ryb25nPm1lbmlhIDxpIGNsYXNzPVwiZmxhZy1hcm1lbmlhXCI+PC9pPicsXG4gICAgICogICc8c3Ryb25nPkFyPC9zdHJvbmc+Z2VudGluYSA8aSBjbGFzcz1cImZsYWctYXJnZW50aW5hXCI+PC9pPidcbiAgICAgKiBdKTtcbiAgICAgKi9cbiAgICBzdWdnZXN0IChzdWdnZXN0aW9ucywgZGF0YSkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWZlcmVuY2UgdG8gY29udGV4dCBvZiBhbiBpbnN0YW5jZS5cbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcyxcbiAgICAgICAgICAgIGl0ZW1zID0gW10sXG4gICAgICAgICAgICBtYXRjaGVkUmVnRXhwID0gbmV3IFJlZ0V4cCgnKCcgKyB0aGlzLl9jdXJyZW50UXVlcnkucmVwbGFjZSgvKFsuKis/Xj0hOiR7fSgpfFtcXF1cXC9cXFxcXSkvZywgJ1xcXFwkMScpICsgJyknLCAnaWcnKSxcbiAgICAgICAgICAgIHRvdGFsSXRlbXMsXG4gICAgICAgICAgICBpdGVtRE9NQ29sbGVjdGlvbixcbiAgICAgICAgICAgIGl0ZW1UZW1wbGF0ZSA9IHRoaXMuX29wdGlvbnMuX2l0ZW1UZW1wbGF0ZSxcbiAgICAgICAgICAgIHN1Z2dlc3RlZEl0ZW0sXG4gICAgICAgICAgICB0ZXJtLFxuICAgICAgICAgICAgc3VnZ2VzdGlvbnNMZW5ndGggPSBzdWdnZXN0aW9ucy5sZW5ndGgsXG4gICAgICAgICAgICBlbCxcbiAgICAgICAgICAgIGhpZ2hsaWdodGVkQ2xhc3NOYW1lID0gdGhpcy5nZXRDbGFzc25hbWUodGhpcy5fb3B0aW9ucy5oaWdobGlnaHRlZENsYXNzKSxcbiAgICAgICAgICAgIGl0ZW1TZWxlY3RlZCA9IHRoaXMuY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoYC4ke2hpZ2hsaWdodGVkQ2xhc3NOYW1lfWApO1xuXG4gICAgICAgIC8vIGhpZGUgdGhlIGxvYWRpbmcgZmVlZGJhY2tcbiAgICAgICAgdGlueS5yZW1vdmVDbGFzcyh0aGlzLnRyaWdnZXIsIHRoYXQuZ2V0Q2xhc3NuYW1lKHRoYXQuX29wdGlvbnMubG9hZGluZ0NsYXNzKSk7XG5cbiAgICAgICAgLy8gaGlkZXMgdGhlIHN1Z2dlc3Rpb25zIGxpc3RcbiAgICAgICAgaWYgKHN1Z2dlc3Rpb25zTGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLl9wb3BvdmVyLmhpZGUoKTtcblxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUmVzZXQgc3VnZ2VzdGlvbnMgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAgICB0aGlzLl9zdWdnZXN0aW9ucyA9IFtdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3N1Z2dlc3Rpb25zTGlzdC5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgICAgICB0aGF0Ll9oaWdobGlnaHRlZCA9IG51bGw7XG4gICAgICAgICAgICB9LCA1MCk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2hvd3MgdGhlIHN1Z2dlc3Rpb25zIGxpc3Qgd2hlbiB0aGUgaXMgY2xvc2VkIGFuZCB0aGUgZWxlbWVudCBpcyB3aXRocyBmb2N1c1xuICAgICAgICBpZiAoIXRoaXMuX3BvcG92ZXIuaXNTaG93bigpICYmIHdpbmRvdy5kb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGlzLnRyaWdnZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX3BvcG92ZXIuc2hvdygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBjbGFzcyBmcm9tIHRoZSBleHRyYSBhZGRlZCBpdGVtc1xuICAgICAgICBpZiAoaXRlbVNlbGVjdGVkICE9PSBudWxsKSB7XG4gICAgICAgICAgICB0aW55LnJlbW92ZUNsYXNzKGl0ZW1TZWxlY3RlZCwgaGlnaGxpZ2h0ZWRDbGFzc05hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gYWRkIGVhY2ggc3VnZ2VzdGVkIGl0ZW0gdG8gdGhlIHN1Z2dlc3Rpb24gbGlzdFxuICAgICAgICBmb3IgKHN1Z2dlc3RlZEl0ZW0gPSAwOyBzdWdnZXN0ZWRJdGVtIDwgc3VnZ2VzdGlvbnNMZW5ndGg7IHN1Z2dlc3RlZEl0ZW0gKz0gMSkge1xuICAgICAgICAgICAgLy8gZ2V0IHRoZSB0ZXJtIHRvIGJlIHJlcGxhY2VkXG4gICAgICAgICAgICB0ZXJtID0gc3VnZ2VzdGlvbnNbc3VnZ2VzdGVkSXRlbV07XG5cbiAgICAgICAgICAgIC8vIGZvciB0aGUgaHRtbCBjb25maWd1cmVkIGNvbXBvbmVudCBkb2Vzbid0IGhpZ2hsaWdodCB0aGUgdGVybSBtYXRjaGVkIGl0IG11c3QgYmUgZG9uZSBieSB0aGUgdXNlclxuICAgICAgICAgICAgaWYgKCF0aGF0Ll9vcHRpb25zLmh0bWwpIHtcbiAgICAgICAgICAgICAgICB0ZXJtID0gdGVybS5yZXBsYWNlKG1hdGNoZWRSZWdFeHAsICc8c3Ryb25nPiQxPC9zdHJvbmc+Jyk7XG4gICAgICAgICAgICAgICAgaXRlbVRlbXBsYXRlID0gdGhpcy5fb3B0aW9ucy5faXRlbVRlbXBsYXRlLnJlcGxhY2UoJ3t7c3VnZ2VzdGVkRGF0YX19JywgJyBkYXRhLXN1Z2dlc3RlZD1cIicgKyBzdWdnZXN0aW9uc1tzdWdnZXN0ZWRJdGVtXSArICdcIicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpdGVtcy5wdXNoKGl0ZW1UZW1wbGF0ZS5yZXBsYWNlKCd7e3Rlcm19fScsIHRlcm0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3N1Z2dlc3Rpb25zTGlzdC5pbm5lckhUTUwgPSBpdGVtcy5qb2luKCcnKTtcblxuICAgICAgICBpdGVtRE9NQ29sbGVjdGlvbiA9IHRoaXMuY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy4nICsgdGhpcy5nZXRDbGFzc25hbWUodGhpcy5fb3B0aW9ucy5pdGVtQ2xhc3MpKTtcblxuICAgICAgICAvLyB3aXRoIHRoaXMgd2Ugc2V0IHRoZSBhcmlhLXNldHNpemUgdmFsdWUgdGhhdCBjb3VudHMgdGhlIHRvdGFsXG4gICAgICAgIHRvdGFsSXRlbXMgPSBpdGVtRE9NQ29sbGVjdGlvbi5sZW5ndGg7XG5cbiAgICAgICAgLy8gUmVzZXQgc3VnZ2VzdGlvbnMgY29sbGVjdGlvbi5cbiAgICAgICAgdGhpcy5fc3VnZ2VzdGlvbnMgPSBbXTtcblxuICAgICAgICBmb3IgKHN1Z2dlc3RlZEl0ZW0gPSAwOyBzdWdnZXN0ZWRJdGVtIDwgdG90YWxJdGVtczsgc3VnZ2VzdGVkSXRlbSArPSAxKSB7XG4gICAgICAgICAgICBlbCA9IGl0ZW1ET01Db2xsZWN0aW9uW3N1Z2dlc3RlZEl0ZW1dO1xuXG4gICAgICAgICAgICAvLyBhZGQgdGhlIGRhdGEgdG8gdGhlIHN1Z2dlc3Rpb25zIGNvbGxlY3Rpb25cbiAgICAgICAgICAgIHRoYXQuX3N1Z2dlc3Rpb25zLnB1c2goZWwuZ2V0QXR0cmlidXRlKCdkYXRhLXN1Z2dlc3RlZCcpKTtcblxuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKCdhcmlhLXBvc2luc2V0JywgdGhhdC5fc3VnZ2VzdGlvbnMubGVuZ3RoKTtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZSgnYXJpYS1zZXRzaXplJywgdG90YWxJdGVtcyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLl9zdWdnZXN0aW9uc0RhdGEgPSBkYXRhID8gZGF0YSA6IHRoaXMuX3N1Z2dlc3Rpb25zO1xuXG4gICAgICAgIHRoaXMuX2hpZ2hsaWdodGVkID0gbnVsbDtcblxuICAgICAgICB0aGlzLl9zdWdnZXN0aW9uc1F1YW50aXR5ID0gdGhpcy5fc3VnZ2VzdGlvbnMubGVuZ3RoO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBIaWRlcyBjb21wb25lbnQncyBjb250YWluZXIuXG4gICAgICogQG1lbWJlcm9mISBjaC5BdXRvY29tcGxldGUucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge2F1dG9jb21wbGV0ZX1cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIEhpZGVzIHRoZSBhdXRvY29tcGxldGUuXG4gICAgICogYXV0b2NvbXBsZXRlLmhpZGUoKTtcbiAgICAgKi9cbiAgICBoaWRlICgpIHtcblxuICAgICAgICBpZiAoIXRoaXMuX2VuYWJsZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fcG9wb3Zlci5oaWRlKCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGVtaXR0ZWQgd2hlbiB0aGUgQXV0b2NvbXBsZXRlIGNvbnRhaW5lciBpcyBoaWRkZW4uXG4gICAgICAgICAqIEBldmVudCBjaC5BdXRvY29tcGxldGUjaGlkZVxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiAvLyBTdWJzY3JpYmUgdG8gXCJoaWRlXCIgZXZlbnQuXG4gICAgICAgICAqIGF1dG9jb21wbGV0ZS5vbignaGlkZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICogIC8vIFNvbWUgY29kZSBoZXJlIVxuICAgICAgICAgKiB9KTtcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW1pdCgnaGlkZScpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgQm9vbGVhbiBpZiB0aGUgY29tcG9uZW50J3MgY29yZSBiZWhhdmlvciBpcyBzaG93bi4gVGhhdCBtZWFucyBpdCB3aWxsIHJldHVybiAndHJ1ZScgaWYgdGhlIGNvbXBvbmVudCBpcyBvbiBhbmQgaXQgd2lsbCByZXR1cm4gZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqIEBtZW1iZXJvZiEgY2guQXV0b2NvbXBsZXRlLnByb3RvdHlwZVxuICAgICAqIEBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtCb29sZWFufVxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gRXhlY3V0ZSBhIGZ1bmN0aW9uIGlmIHRoZSBjb21wb25lbnQgaXMgc2hvd24uXG4gICAgICogaWYgKGF1dG9jb21wbGV0ZS5pc1Nob3duKCkpIHtcbiAgICAgKiAgICAgZm4oKTtcbiAgICAgKiB9XG4gICAgICovXG4gICAgaXNTaG93biAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9wb3BvdmVyLmlzU2hvd24oKTtcbiAgICB9O1xuXG4gICAgZGlzYWJsZSAoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzU2hvd24oKSkge1xuICAgICAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICAgICAgICB0aGlzLl9pc09uID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLl9lbC5ibHVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBzdXBlci5kaXNhYmxlKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3lzIGFuIEF1dG9jb21wbGV0ZSBpbnN0YW5jZS5cbiAgICAgKiBAbWVtYmVyb2YhIGNoLkF1dG9jb21wbGV0ZS5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIERlc3Ryb3lpbmcgYW4gaW5zdGFuY2Ugb2YgQXV0b2NvbXBsZXRlLlxuICAgICAqIGF1dG9jb21wbGV0ZS5kZXN0cm95KCk7XG4gICAgICovXG4gICAgZGVzdHJveSAoKSB7XG5cbiAgICAgICAgdGlueS5vZmYodGhpcy5jb250YWluZXIsIGhpZ2hsaWdodEV2ZW50LCB0aGlzLl9oaWdobGlnaHRTdWdnZXN0aW9uKTtcblxuICAgICAgICB0aGlzLnRyaWdnZXIucmVtb3ZlQXR0cmlidXRlKCdhdXRvY29tcGxldGUnKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyLnJlbW92ZUF0dHJpYnV0ZSgnYXJpYS1hdXRvY29tcGxldGUnKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyLnJlbW92ZUF0dHJpYnV0ZSgnYXJpYS1oYXNwb3B1cCcpO1xuICAgICAgICB0aGlzLnRyaWdnZXIucmVtb3ZlQXR0cmlidXRlKCdhcmlhLW93bnMnKTtcblxuICAgICAgICB0aGlzLl9wb3BvdmVyLmRlc3Ryb3koKTtcblxuICAgICAgICBzdXBlci5kZXN0cm95KCk7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgIH07XG59XG5cbi8qKlxuICogR2V0IGNsb3Nlc3QgRE9NIGVsZW1lbnQgdXAgdGhlIHRyZWUgdGhhdCBjb250YWlucyBhIGNsYXNzLCBJRCwgb3IgZGF0YSBhdHRyaWJ1dGVcbiAqXG4gKiBAcGFyYW0gIHtOb2RlfSBlbGVtIFRoZSBiYXNlIGVsZW1lbnRcbiAqIEBwYXJhbSAge1N0cmluZ30gc2VsZWN0b3IgVGhlIGNsYXNzLCBpZCwgZGF0YSBhdHRyaWJ1dGUsIG9yIHRhZyB0byBsb29rIGZvclxuICogQHJldHVybiB7Tm9kZX0gTnVsbCBpZiBubyBtYXRjaFxuICovXG52YXIgY2xvc2VzdFBhcmVudCA9IGZ1bmN0aW9uIChlbGVtLCBzZWxlY3Rvcikge1xuICAgIGNvbnN0IGZpcnN0Q2hhciA9IHNlbGVjdG9yLmNoYXJBdCgwKTtcblxuICAgIC8vIEdldCBjbG9zZXN0IG1hdGNoXG4gICAgZm9yICg7IGVsZW0gJiYgZWxlbSAhPT0gZG9jdW1lbnQ7IGVsZW0gPSBlbGVtLnBhcmVudE5vZGUpIHtcblxuICAgICAgICAvLyBJZiBzZWxlY3RvciBpcyBhIGNsYXNzXG4gICAgICAgIGlmIChmaXJzdENoYXIgPT09ICcuJykge1xuICAgICAgICAgICAgaWYgKGVsZW0uY2xhc3NMaXN0LmNvbnRhaW5zKHNlbGVjdG9yLnN1YnN0cigxKSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHNlbGVjdG9yIGlzIGFuIElEXG4gICAgICAgIGlmIChmaXJzdENoYXIgPT09ICcjJykge1xuICAgICAgICAgICAgaWYgKGVsZW0uaWQgPT09IHNlbGVjdG9yLnN1YnN0cigxKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgc2VsZWN0b3IgaXMgYSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgICBpZiAoZmlyc3RDaGFyID09PSAnWycpIHtcbiAgICAgICAgICAgIGlmIChlbGVtLmhhc0F0dHJpYnV0ZShzZWxlY3Rvci5zdWJzdHIoMSwgc2VsZWN0b3IubGVuZ3RoIC0gMikpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBzZWxlY3RvciBpcyBhIHRhZ1xuICAgICAgICBpZiAoZWxlbS50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gZWxlbTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBBdXRvY29tcGxldGU7XG4iLCJpbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJ3RpbnkuanMvbGliL2V2ZW50RW1pdHRlcic7XG5cbmxldCB1aWQgPSAwO1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIGFsbCBjb21wb25lbnRzLlxuICpcbiAqIEBjbGFzc1xuICogQGF1Z21lbnRzIHRpbnkuRXZlbnRFbWl0dGVyXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBbZWxdIEl0IG11c3QgYmUgYSBIVE1MRWxlbWVudC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQ29uZmlndXJhdGlvbiBvcHRpb25zLlxuICogQHJldHVybnMge2NvbXBvbmVudH0gUmV0dXJucyBhIENvbXBvbmVudCBjbGFzcy5cbiAqXG4gKiBAZXhhbXBsZVxuICogLy8gQ3JlYXRlIGEgbmV3IENvbXBvbmVudC5cbiAqIGltcG9ydCBDb21wb25lbnQgZnJvbSAnLi9tb2R1bGVzL2NvbXBvbmVudCc7XG4gKiBsZXQgY29tcG9uZW50ID0gbmV3IENvbXBvbmVudCgpO1xuICogbGV0IGNvbXBvbmVudCA9IG5ldyBDb21wb25lbnQoJy5teS1jb21wb25lbnQnLCB7J29wdGlvbic6ICd2YWx1ZSd9KTtcbiAqIGxldCBjb21wb25lbnQgPSBuZXcgQ29tcG9uZW50KCcubXktY29tcG9uZW50Jyk7XG4gKiBsZXQgY29tcG9uZW50ID0gbmV3IENvbXBvbmVudCh7J29wdGlvbic6ICd2YWx1ZSd9KTtcbiAqL1xuY2xhc3MgQ29tcG9uZW50IGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgICBjb25zdHJ1Y3RvcihlbCwgb3B0aW9ucykge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdjb21wb25lbnQgaW5pdCcpO1xuXG4gICAgICAgIC8vIFNldCBlbWl0dGVyIHRvIHplcm8gZm9yIHVubGltaXRlZCBsaXN0ZW5lcnMgdG8gYXZvaWQgdGhlIHdhcm5pbmcgaW4gY29uc29sZVxuICAgICAgICAvLyBAc2VlIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvZXZlbnRzLmh0bWwjZXZlbnRzX2VtaXR0ZXJfc2V0bWF4bGlzdGVuZXJzX25cbiAgICAgICAgdGhpcy5zZXRNYXhMaXN0ZW5lcnMoMCk7XG5cbiAgICAgICAgaWYgKGVsID09PSBudWxsKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBcImVsXCIgcGFyYW1ldGVyIGlzIG5vdCBwcmVzZW50IGluIHRoZSBET00nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBBIHVuaXF1ZSBpZCB0byBpZGVudGlmeSB0aGUgaW5zdGFuY2Ugb2YgYSBjb21wb25lbnQuXG4gICAgICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnVpZCA9ICh1aWQgKz0gMSk7XG5cbiAgICAgICAgLy8gZWwgaXMgSFRNTEVsZW1lbnRcbiAgICAgICAgLy8gSUU4IGFuZCBlYXJsaWVyIGRvbid0IGRlZmluZSB0aGUgbm9kZSB0eXBlIGNvbnN0YW50cywgMSA9PT0gZG9jdW1lbnQuRUxFTUVOVF9OT0RFXG4gICAgICAgIGlmIChlbCAhPT0gdW5kZWZpbmVkICYmIGVsLm5vZGVUeXBlID09PSAxKSB7XG4gICAgICAgICAgICB0aGlzLl9lbCA9IGVsO1xuXG4gICAgICAgICAgICAvLyBzZXQgdGhlIHVpZCB0byB0aGUgZWxlbWVudCB0byBoZWxwIHNlYXJjaCBmb3IgdGhlIGluc3RhbmNlIGluIHRoZSBjb2xsZWN0aW9uIGluc3RhbmNlc1xuICAgICAgICAgICAgdGhpcy5fZWwuc2V0QXR0cmlidXRlKCdkYXRhLXVpZCcsIHRoaXMudWlkKTtcblxuICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IHRpbnkuZXh0ZW5kKHt9LCBDb21wb25lbnQuX2RlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAgICAgLy8gZWwgaXMgYW4gb2JqZWN0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgfSBlbHNlIGlmIChlbCA9PT0gdW5kZWZpbmVkIHx8IGVsLm5vZGVUeXBlID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIGVsID09PSAnb2JqZWN0Jykge1xuXG4gICAgICAgICAgICAvLyBjcmVhdGVzIGEgZW1wdHkgZWxlbWVudCBiZWNhdXNlIHRoZSB1c2VyIGlzIG5vdCBzZXQgYSBET00gZWxlbWVudCB0byB1c2UsIGJ1dCB3ZSByZXF1aXJlcyBvbmVcbiAgICAgICAgICAgIC8vIHRoaXMuX2VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgICAgICAgIHRoaXMuX29wdGlvbnMgPSB0aW55LmV4dGVuZCh7fSwgQ29tcG9uZW50Ll9kZWZhdWx0cywgZWwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fb3B0aW9ucyA9IHRpbnkuY2xvbmUoQ29tcG9uZW50Ll9kZWZhdWx0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5kaWNhdGVzIGlzIHRoZSBjb21wb25lbnQgaXMgZW5hYmxlZC5cbiAgICAgICAgICogQHR5cGUge0Jvb2xlYW59XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgZW1pdHRlZCB3aGVuIHRoZSBjb21wb25lbnQgaXMgcmVhZHkgdG8gdXNlLlxuICAgICAgICAgKiBAZXZlbnQgQ29tcG9uZW50I3JlYWR5XG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIC8vIFN1YnNjcmliZSB0byBcInJlYWR5XCIgZXZlbnQuXG4gICAgICAgICAqIGNvbXBvbmVudC5vbigncmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAqICAgICAvLyBTb21lIGNvZGUgaGVyZSFcbiAgICAgICAgICogfSk7XG4gICAgICAgICAqL1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgncmVhZHknKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcG9uZW50IGRlZmF1bHQgY29uZmlndXJhdGlvbi5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgc3RhdGljIF9kZWZhdWx0cyA9IHtcbiAgICAgICAgbnM6ICdjaC0nXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluamVjdCBmdW5jdGlvbmFsaXR5IG9yIGFiaWxpdGllcyBmcm9tIGFub3RoZXIgY29tcG9uZW50cy5cbiAgICAgKlxuICAgICAqIEBmdW5jdGlvblxuICAgICAqIEBwYXJhbXMgey4uLkZ1bmN0aW9ufSBtaXhpbnMgTGlzdCBvZiBtaXhpbnMgdG8gYmUgaW5qZWN0ZWRcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGxldCBjb21wb25lbnQgPSBuZXcgQ29tcG9uZW50KCk7XG4gICAgICogY29tcG9uZW50LmluamVjdChDb250ZW50LCBDb2xsYXBzaWJsZSk7XG4gICAgICovXG4gICAgaW5qZWN0KC4uLmFyZ3MpIHtcbiAgICAgICAgYXJncy5mb3JFYWNoKChhcmcpID0+IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgYXJnLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgdGhlIGNvbXBsZXRlIGNsYXNzIG5hbWUgaW5jbHVkaW5nIHRoZSBuYW1lc3BhY2VcbiAgICAgKlxuICAgICAqIEBwYXJhbSBiYXNlbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0Q2xhc3NuYW1lKGJhc2VuYW1lKSB7XG4gICAgICAgIGNvbnN0IHBhcnRzID0gYmFzZW5hbWUuc3BsaXQoJyAnKVxuICAgICAgICAgICAgLm1hcChwYXJ0ID0+IHBhcnQudHJpbSgpKVxuICAgICAgICAgICAgLmZpbHRlcihwYXJ0ID0+ICEhcGFydClcbiAgICAgICAgICAgIC5tYXAocGFydCA9PiB0aGlzLl9vcHRpb25zLm5zICsgcGFydCk7XG5cbiAgICAgICAgcmV0dXJuIHBhcnRzLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIGFuIGluc3RhbmNlIG9mIENvbXBvbmVudC5cbiAgICAgKlxuICAgICAqIEBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHtjb21wb25lbnR9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIEVuYWJsaW5nIGFuIGluc3RhbmNlIG9mIENvbXBvbmVudC5cbiAgICAgKiBjb21wb25lbnQuZW5hYmxlKCk7XG4gICAgICovXG4gICAgZW5hYmxlKCkge1xuICAgICAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW1pdHMgd2hlbiBhIGNvbXBvbmVudCBpcyBlbmFibGVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXZlbnQgQ29tcG9uZW50I2VuYWJsZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiAvLyBTdWJzY3JpYmUgdG8gXCJlbmFibGVcIiBldmVudC5cbiAgICAgICAgICogY29tcG9uZW50Lm9uKCdlbmFibGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAqICAgICAvLyBTb21lIGNvZGUgaGVyZSFcbiAgICAgICAgICogfSk7XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ2VuYWJsZScpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEaXNhYmxlcyBhbiBpbnN0YW5jZSBvZiBDb21wb25lbnQuXG4gICAgICpcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7Y29tcG9uZW50fVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBEaXNhYmxpbmcgYW4gaW5zdGFuY2Ugb2YgQ29tcG9uZW50LlxuICAgICAqIGNvbXBvbmVudC5kaXNhYmxlKCk7XG4gICAgICovXG4gICAgZGlzYWJsZSgpIHtcbiAgICAgICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbWl0cyB3aGVuIGEgY29tcG9uZW50IGlzIGRpc2FibGUuXG4gICAgICAgICAqXG4gICAgICAgICAqIEBldmVudCBDb21wb25lbnQjZGlzYWJsZVxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiAvLyBTdWJzY3JpYmUgdG8gXCJkaXNhYmxlXCIgZXZlbnQuXG4gICAgICAgICAqIGNvbXBvbmVudC5vbignZGlzYWJsZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICogICAgIC8vIFNvbWUgY29kZSBoZXJlIVxuICAgICAgICAgKiB9KTtcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZW1pdCgnZGlzYWJsZScpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBDb21wb25lbnQgYW5kIHJlbW92ZSBpdHMgZGF0YSBmcm9tIGFzb2NpYXRlZCBlbGVtZW50LlxuICAgICAqXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIERlc3Ryb3kgYSBjb21wb25lbnRcbiAgICAgKiBjb21wb25lbnQuZGVzdHJveSgpO1xuICAgICAqIC8vIEVtcHR5IHRoZSBjb21wb25lbnQgcmVmZXJlbmNlXG4gICAgICogY29tcG9uZW50ID0gdW5kZWZpbmVkO1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIHRoaXMuZGlzYWJsZSgpO1xuXG4gICAgICAgIGlmICh0aGlzLl9lbCkge1xuICAgICAgICAgICAgdGhpcy5fZWwucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXVpZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVtaXRzIHdoZW4gYSBjb21wb25lbnQgaXMgZGVzdHJveWVkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBAZXZlbnQgQ29tcG9uZW50I2Rlc3Ryb3lcbiAgICAgICAgICpcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gU3Vic2NyaWJlIHRvIFwiZGVzdHJveVwiIGV2ZW50LlxuICAgICAgICAgKiBjb21wb25lbnQub24oJ2Rlc3Ryb3knLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAqICAgICAvLyBTb21lIGNvZGUgaGVyZSFcbiAgICAgICAgICogfSk7XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmVtaXQoJ2Rlc3Ryb3knKTtcblxuICAgICAgICByZXR1cm47XG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDb21wb25lbnQ7XG4iLCJpbXBvcnQgQ29tcG9uZW50IGZyb20gJy4vY29tcG9uZW50JztcbmltcG9ydCBQb3NpdGlvbmVyIGZyb20gJy4vcG9zaXRpb25lcic7XG5pbXBvcnQgdmlld3BvcnQgZnJvbSAnLi92aWV3cG9ydCc7XG5pbXBvcnQgQ29sbGFwc2libGUgZnJvbSAnLi4vbWl4aW5zL2NvbGxhcHNpYmxlJztcbmltcG9ydCBDb250ZW50IGZyb20gJy4uL21peGlucy9jb250ZW50JztcblxubGV0IHNob3duYnlFdmVudCA9IHtcbiAgICAncG9pbnRlcnRhcCc6IHRpbnkub25wb2ludGVydGFwLFxuICAgICdwb2ludGVyZW50ZXInOiB0aW55Lm9ucG9pbnRlcmVudGVyXG59O1xuXG5cbi8qKlxuICogUG9wb3ZlciBpcyB0aGUgYmFzaWMgdW5pdCBvZiBhIGRpYWxvZyB3aW5kb3cuXG5cbiAqIEBjb25zdHJ1Y3RvclxuICogQGF1Z21lbnRzIENvbXBvbmVudFxuICogQG1peGVzIENvbGxhcHNpYmxlXG4gKiBAbWl4ZXMgQ29udGVudFxuICogQHJlcXVpcmVzIFBvc2l0aW9uZXJcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsIEEgSFRNTEVsZW1lbnQgdG8gY3JlYXRlIGFuIGluc3RhbmNlIG9mIFBvcG92ZXIuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIE9wdGlvbnMgdG8gY3VzdG9taXplIGFuIGluc3RhbmNlLlxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLmFkZENsYXNzXSBDU1MgY2xhc3MgbmFtZXMgdGhhdCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBjb250YWluZXIgb24gdGhlIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5meF0gRW5hYmxlIG9yIGRpc2FibGUgVUkgZWZmZWN0cy4gWW91IG11c3QgdXNlOiBcInNsaWRlRG93blwiLCBcImZhZGVJblwiIG9yIFwibm9uZVwiLiBEZWZhdWx0OiBcImZhZGVJblwiLlxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLndpZHRoXSBTZXQgYSB3aWR0aCBmb3IgdGhlIGNvbnRhaW5lci4gRGVmYXVsdDogXCJhdXRvXCIuXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuaGVpZ2h0XSBTZXQgYSBoZWlnaHQgZm9yIHRoZSBjb250YWluZXIuIERlZmF1bHQ6IFwiYXV0b1wiLlxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLnNob3duYnldIERldGVybWluZXMgaG93IHRvIGludGVyYWN0IHdpdGggdGhlIHRyaWdnZXIgdG8gc2hvdyB0aGUgY29udGFpbmVyLiBZb3UgbXVzdCB1c2U6IFwicG9pbnRlcnRhcFwiLCBcInBvaW50ZXJlbnRlclwiIG9yIFwibm9uZVwiLiBEZWZhdWx0OiBcInBvaW50ZXJ0YXBcIi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5oaWRkZW5ieV0gRGV0ZXJtaW5lcyBob3cgdG8gaGlkZSB0aGUgY29tcG9uZW50LiBZb3UgbXVzdCB1c2U6IFwiYnV0dG9uXCIsIFwicG9pbnRlcnNcIiwgXCJwb2ludGVybGVhdmVcIiwgXCJhbGxcIiBvciBcIm5vbmVcIi4gRGVmYXVsdDogXCJidXR0b25cIi5cbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IFtvcHRpb25zLnJlZmVyZW5jZV0gSXQncyBhIEhUTUxFbGVtZW50IHJlZmVyZW5jZSB0byBwb3NpdGlvbiBhbmQgc2l6ZSBvZiBlbGVtZW50IHRoYXQgd2lsbCBiZSBjb25zaWRlcmVkIHRvIGNhcnJ5IG91dCB0aGUgcG9zaXRpb24uIERlZmF1bHQ6IHRoZSB0cmlnZ2VyIGVsZW1lbnQuXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuc2lkZV0gVGhlIHNpZGUgb3B0aW9uIHdoZXJlIHRoZSB0YXJnZXQgZWxlbWVudCB3aWxsIGJlIHBvc2l0aW9uZWQuIEl0cyB2YWx1ZSBjYW4gYmU6IFwibGVmdFwiLCBcInJpZ2h0XCIsIFwidG9wXCIsIFwiYm90dG9tXCIgb3IgXCJjZW50ZXJcIi4gRGVmYXVsdDogXCJjZW50ZXJcIi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5hbGlnbl0gVGhlIGFsaWduIG9wdGlvbnMgd2hlcmUgdGhlIHRhcmdldCBlbGVtZW50IHdpbGwgYmUgcG9zaXRpb25lZC4gSXRzIHZhbHVlIGNhbiBiZTogXCJsZWZ0XCIsIFwicmlnaHRcIiwgXCJ0b3BcIiwgXCJib3R0b21cIiBvciBcImNlbnRlclwiLiBEZWZhdWx0OiBcImNlbnRlclwiLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm9mZnNldFhdIERpc3RhbmNlIHRvIGRpc3BsYWNlIHRoZSB0YXJnZXQgaG9yaXpvbnRhbGx5LiBEZWZhdWx0OiAwLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm9mZnNldFldIERpc3RhbmNlIHRvIGRpc3BsYWNlIHRoZSB0YXJnZXQgdmVydGljYWxseS4gRGVmYXVsdDogMC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5wb3NpdGlvbl0gVGhlIHR5cGUgb2YgcG9zaXRpb25pbmcgdXNlZC4gSXRzIHZhbHVlIG11c3QgYmUgXCJhYnNvbHV0ZVwiIG9yIFwiZml4ZWRcIi4gRGVmYXVsdDogXCJhYnNvbHV0ZVwiLlxuICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLm1ldGhvZF0gVGhlIHR5cGUgb2YgcmVxdWVzdCAoXCJQT1NUXCIgb3IgXCJHRVRcIikgdG8gbG9hZCBjb250ZW50IGJ5IGFqYXguIERlZmF1bHQ6IFwiR0VUXCIuXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMucGFyYW1zXSBQYXJhbXMgbGlrZSBxdWVyeSBzdHJpbmcgdG8gYmUgc2VudCB0byB0aGUgc2VydmVyLlxuICogQHBhcmFtIHtCb29sZWFufSBbb3B0aW9ucy5jYWNoZV0gRm9yY2UgdG8gY2FjaGUgdGhlIHJlcXVlc3QgYnkgdGhlIGJyb3dzZXIuIERlZmF1bHQ6IHRydWUuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmFzeW5jXSBGb3JjZSB0byBzZW50IHJlcXVlc3QgYXN5bmNocm9ub3VzbHkuIERlZmF1bHQ6IHRydWUuXG4gKiBAcGFyYW0geyhTdHJpbmcgfCBIVE1MRWxlbWVudCl9IFtvcHRpb25zLndhaXRpbmddIFRlbXBvcmFyeSBjb250ZW50IHRvIHVzZSB3aGlsZSB0aGUgYWpheCByZXF1ZXN0IGlzIGxvYWRpbmcuIERlZmF1bHQ6ICcmbHQ7ZGl2IGNsYXNzPVwiY2gtbG9hZGluZyBjaC1sb2FkaW5nLWNlbnRlcmVkXCImZ3Q7Jmx0Oy9kaXYmZ3Q7Jy5cbiAqIEBwYXJhbSB7KFN0cmluZyB8IEhUTUxFbGVtZW50KX0gW29wdGlvbnMuY29udGVudF0gVGhlIGNvbnRlbnQgdG8gYmUgc2hvd24gaW50byB0aGUgUG9wb3ZlciBjb250YWluZXIuXG4gKiBAcGFyYW0geyhCb29sZWFuIHwgU3RyaW5nKX0gW29wdGlvbnMud3JhcHBlcl0gV3JhcCB0aGUgcmVmZXJlbmNlIGVsZW1lbnQgYW5kIHBsYWNlIHRoZSBjb250YWluZXIgaW50byBpdCBpbnN0ZWFkIG9mIGJvZHkuIFdoZW4gdmFsdWUgaXMgYSBzdHJpbmcgaXQgd2lsbCBiZSBhcHBsaWVkIGFzIGFkZGl0aW9uYWwgd3JhcHBlciBjbGFzcy4gRGVmYXVsdDogZmFsc2UuXG4gKlxuICogQHJldHVybnMge3BvcG92ZXJ9IFJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgUG9wb3Zlci5cbiAqXG4gKiBAZXhhbXBsZVxuICogLy8gQ3JlYXRlIGEgbmV3IFBvcG92ZXIuXG4gKiB2YXIgcG9wb3ZlciA9IG5ldyBQb3BvdmVyKFtlbF0sIFtvcHRpb25zXSk7XG4gKiBAZXhhbXBsZVxuICogLy8gQ3JlYXRlIGEgbmV3IFBvcG92ZXIgd2l0aCBkaXNhYmxlZCBlZmZlY3RzLlxuICogdmFyIHBvcG92ZXIgPSBuZXcgUG9wb3ZlcihlbCwge1xuICAgICAqICAgICAnZngnOiAnbm9uZSdcbiAgICAgKiB9KTtcbiAqIEBleGFtcGxlXG4gKiAvLyBDcmVhdGUgYSBuZXcgUG9wb3ZlciB1c2luZyB0aGUgc2hvcnRoYW5kIHdheSAoY29udGVudCBhcyBwYXJhbWV0ZXIpLlxuICogdmFyIHBvcG92ZXIgPSBuZXcgUG9wb3Zlcihkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucG9wb3ZlcicpLCB7J2NvbnRlbnQnOiAnaHR0cDovL3VpLm1sLmNvbTozMDQwL2FqYXgnfSk7XG4gKi9cbmNsYXNzIFBvcG92ZXIgZXh0ZW5kcyBDb21wb25lbnQge1xuICAgIGNvbnN0cnVjdG9yKGVsLCBvcHRpb25zKSB7XG4gICAgICAgIHN1cGVyKGVsLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5faW5pdChlbCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBQb3BvdmVyIGNvbmZpZ3VyYXRpb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgc3RhdGljIF9kZWZhdWx0cyA9IHtcbiAgICAgICAgJ19hcmlhUm9sZSc6ICdkaWFsb2cnLFxuICAgICAgICAnX2NsYXNzTmFtZSc6ICcnLFxuICAgICAgICAnX2hpZGVEZWxheSc6IDQwMCxcbiAgICAgICAgJ2FkZENsYXNzJzogJycsXG4gICAgICAgICdmeCc6ICdmYWRlSW4nLFxuICAgICAgICAnd2lkdGgnOiAnYXV0bycsXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bycsXG4gICAgICAgICdzaG93bmJ5JzogJ3BvaW50ZXJ0YXAnLFxuICAgICAgICAnaGlkZGVuYnknOiAnYnV0dG9uJyxcbiAgICAgICAgJ3dhaXRpbmcnOiAnbG9hZGluZyBsb2FkaW5nLWNlbnRlcmVkJyxcbiAgICAgICAgJ3Bvc2l0aW9uJzogJ2Fic29sdXRlJyxcbiAgICAgICAgJ3dyYXBwZXInOiBmYWxzZVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGEgbmV3IGluc3RhbmNlIG9mIFBvcG92ZXIgYW5kIG1lcmdlIGN1c3RvbSBvcHRpb25zIHdpdGggZGVmYXVsdHMgb3B0aW9ucy5cbiAgICAgKiBAbWVtYmVyb2YhIFBvcG92ZXIucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcmV0dXJucyB7cG9wb3Zlcn1cbiAgICAgKi9cbiAgICBfaW5pdCAoZWwsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKGVsID09PSB1bmRlZmluZWQgfHwgIWVsLm5vZGVUeXBlICYmIHR5cGVvZiBlbCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSBlbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRpbnkuZXh0ZW5kKHRoaXMuX29wdGlvbnMsIFBvcG92ZXIuX2RlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLl9vcHRpb25zLCBvcHRpb25zKTtcblxuICAgICAgICB0aGlzLmluamVjdChDb2xsYXBzaWJsZSwgQ29udGVudCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlZmVyZW5jZSB0byBjb250ZXh0IG9mIGFuIGluc3RhbmNlLlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgbGV0IGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgICAgIHRoaXMuX2NvbmZpZ3VyZVdyYXBwZXIoKTtcblxuICAgICAgICBjb250YWluZXIuaW5uZXJIVE1MID0gW1xuICAgICAgICAgICAgJzxkaXYnLFxuICAgICAgICAgICAgJyBjbGFzcz1cIicgKyB0aGlzLmdldENsYXNzbmFtZSgncG9wb3ZlciBoaWRlJykgKyAnICcgKyB0aGlzLmdldENsYXNzbmFtZSh0aGlzLl9vcHRpb25zLl9jbGFzc05hbWUpICsgJyAnICsgdGhpcy5nZXRDbGFzc25hbWUodGhpcy5fb3B0aW9ucy5hZGRDbGFzcykgKyAnICcgK1xuICAgICAgICAgICAgKHRpbnkuc3VwcG9ydC50cmFuc2l0aW9uICYmIHRoaXMuX29wdGlvbnMuZnggIT09ICdub25lJyAmJiB0aGlzLl9vcHRpb25zLmZ4ICE9PSBmYWxzZSA/IHRoaXMuZ2V0Q2xhc3NuYW1lKCdmeCcpIDogJycpICsgJ1wiJyxcbiAgICAgICAgICAgICcgcm9sZT1cIicgKyB0aGlzLl9vcHRpb25zLl9hcmlhUm9sZSArICdcIicsXG4gICAgICAgICAgICAnIGlkPVwiJyArIHRoaXMuZ2V0Q2xhc3NuYW1lKHRoaXMuY29uc3RydWN0b3IubmFtZS50b0xvd2VyQ2FzZSgpICsgJy0nICsgdGhpcy51aWQpICsgJ1wiJyxcbiAgICAgICAgICAgICcgc3R5bGU9XCJ3aWR0aDonICsgdGhpcy5fb3B0aW9ucy53aWR0aCArICc7aGVpZ2h0OicgKyB0aGlzLl9vcHRpb25zLmhlaWdodCArICdcIicsXG4gICAgICAgICAgICAnPjwvZGl2PidcbiAgICAgICAgXS5qb2luKCcnKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHBvcG92ZXIgY29udGFpbmVyLiBJdCdzIHRoZSBlbGVtZW50IHRoYXQgd2lsbCBiZSBzaG93biBhbmQgaGlkZGVuLlxuICAgICAgICAgKiBAdHlwZSB7SFRNTERpdkVsZW1lbnR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCdkaXYnKTtcblxuICAgICAgICB0aW55Lm9uKHRoaXMuY29udGFpbmVyLCB0aW55Lm9ucG9pbnRlcnRhcCwgZXZlbnQgPT4ge1xuICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbGVtZW50IHdoZXJlIHRoZSBjb250ZW50IHdpbGwgYmUgYWRkZWQuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqIEB0eXBlIHtIVE1MRGl2RWxlbWVudH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2NvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICB0aW55LmFkZENsYXNzKHRoaXMuX2NvbnRlbnQsIHRoaXMuZ2V0Q2xhc3NuYW1lKCdwb3BvdmVyLWNvbnRlbnQnKSk7XG5cbiAgICAgICAgdGhpcy5jb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5fY29udGVudCk7XG5cbiAgICAgICAgLy8gQWRkIGZ1bmN0aW9uYWxpdHkgdG8gdGhlIHRyaWdnZXIgaWYgaXQgZXhpc3RzXG4gICAgICAgIHRoaXMuX2NvbmZpZ3VyZVRyaWdnZXIoKTtcblxuICAgICAgICBjb25zdCBwb3NpdGlvbmVyT3B0cyA9IHtcbiAgICAgICAgICAgICd0YXJnZXQnOiB0aGlzLmNvbnRhaW5lcixcbiAgICAgICAgICAgICdyZWZlcmVuY2UnOiB0aGlzLl9vcHRpb25zLnJlZmVyZW5jZSxcbiAgICAgICAgICAgICdzaWRlJzogdGhpcy5fb3B0aW9ucy5zaWRlLFxuICAgICAgICAgICAgJ2FsaWduJzogdGhpcy5fb3B0aW9ucy5hbGlnbixcbiAgICAgICAgICAgICdvZmZzZXRYJzogdGhpcy5fb3B0aW9ucy5vZmZzZXRYLFxuICAgICAgICAgICAgJ29mZnNldFknOiB0aGlzLl9vcHRpb25zLm9mZnNldFksXG4gICAgICAgICAgICAncG9zaXRpb24nOiB0aGlzLl9vcHRpb25zLnBvc2l0aW9uXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5fcG9zaXRpb25lciA9IG5ldyBQb3NpdGlvbmVyKHBvc2l0aW9uZXJPcHRzKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSGFuZGxlciB0byBleGVjdXRlIHRoZSBwb3NpdGlvbmVyIHJlZnJlc2goKSBtZXRob2Qgb24gbGF5b3V0IGNoYW5nZXMuXG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqIEBmdW5jdGlvblxuICAgICAgICAgKiBAdG9kbyBEZWZpbmUgdGhpcyBmdW5jdGlvbiBvbiBwcm90b3R5cGUgYW5kIHVzZSBiaW5kKCk6ICRkb2N1bWVudC5vbihjaC5vbmxheW91dGNoYW5nZSwgdGhpcy5yZWZyZXNoUG9zaXRpb24uYmluZCh0aGlzKSk7XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9yZWZyZXNoUG9zaXRpb25MaXN0ZW5lciA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zaG93bikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uZXIucmVmcmVzaChwb3NpdGlvbmVyT3B0cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2hpZGVUaW1lciA9ICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX3RpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICAgICAgICB9LCB0aGlzLl9vcHRpb25zLl9oaWRlRGVsYXkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuX2hpZGVUaW1lckNsZWFuZXIgPSAoKSA9PiB7XG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSB0aGUgd2F5IGl0IGhpZGVzXG4gICAgICAgIHRoaXMuX2NvbmZpZ3VyZUhpZGluZygpO1xuXG4gICAgICAgIC8vIFJlZnJlc2ggcG9zaXRpb246XG4gICAgICAgIC8vIG9uIGxheW91dCBjaGFuZ2VcbiAgICAgICAgdGlueS5vbihkb2N1bWVudCwgdGlueS5vbmxheW91dGNoYW5nZSwgdGhpcy5fcmVmcmVzaFBvc2l0aW9uTGlzdGVuZXIpO1xuICAgICAgICAvLyBvbiByZXNpemVcbiAgICAgICAgdmlld3BvcnQub24odGlueS5vbnJlc2l6ZSwgdGhpcy5fcmVmcmVzaFBvc2l0aW9uTGlzdGVuZXIpO1xuXG4gICAgICAgIHRoaXNcbiAgICAgICAgICAgIC5vbmNlKCdfc2hvdycsIHRoaXMuX3JlZnJlc2hQb3NpdGlvbkxpc3RlbmVyKVxuICAgICAgICAgICAgLy8gb24gY29udGVudCBjaGFuZ2VcbiAgICAgICAgICAgIC5vbignX2NvbnRlbnRjaGFuZ2UnLCB0aGlzLl9yZWZyZXNoUG9zaXRpb25MaXN0ZW5lcik7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogQWRkcyBmdW5jdGlvbmFsaXR5IHRvIHRoZSB0cmlnZ2VyLiBXaGVuIGEgbm9uLXRyaWdnZXIgcG9wb3ZlciBpcyBpbml0aWFsaXplZCwgdGhpcyBtZXRob2QgaXNuJ3QgZXhlY3V0ZWQuXG4gICAgICogQG1lbWJlcm9mISBQb3BvdmVyLnByb3RvdHlwZVxuICAgICAqIEBwcml2YXRlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICovXG4gICAgX2NvbmZpZ3VyZVRyaWdnZXIgKCkge1xuXG4gICAgICAgIGlmICh0aGlzLl9lbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVmZXJlbmNlIHRvIGNvbnRleHQgb2YgYW4gaW5zdGFuY2UuXG4gICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICAvLyBJdCB3aWxsIGJlIHRyaWdnZXJlZCBvbiBwb2ludGVydGFwL3BvaW50ZXJlbnRlciBvZiB0aGUgJHRyaWdnZXJcbiAgICAgICAgLy8gSXQgY2FuIHRvZ2dsZSwgc2hvdywgb3IgZG8gbm90aGluZyAoaW4gc3BlY2lmaWMgY2FzZXMpXG4gICAgICAgIGxldCBzaG93SGFuZGxlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBUb2dnbGUgYXMgZGVmYXVsdFxuICAgICAgICAgICAgbGV0IGZuID0gdGhpcy5fdG9nZ2xlO1xuICAgICAgICAgICAgLy8gV2hlbiBhIFBvcG92ZXIgaXMgc2hvd24gb24gcG9pbnRlcmVudGVyLCBpdCB3aWxsIHNldCBhIHRpbWVvdXQgdG8gbWFuYWdlIHdoZW5cbiAgICAgICAgICAgIC8vIHRvIGNsb3NlIHRoZSBjb21wb25lbnQuIEF2b2lkIHRvIHRvZ2dsZSBhbmQgbGV0IGNob2lzZSB3aGVuIHRvIGNsb3NlIHRvIHRoZSB0aW1lclxuICAgICAgICAgICAgaWYgKHRoaXMuX29wdGlvbnMuc2hvd25ieSA9PT0gJ3BvaW50ZXJlbnRlcicgfHwgdGhpcy5fb3B0aW9ucy5oaWRkZW5ieSA9PT0gJ25vbmUnIHx8IHRoaXMuX29wdGlvbnMuaGlkZGVuYnkgPT09ICdidXR0b24nKSB7XG4gICAgICAgICAgICAgICAgZm4gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5fc2hvd24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGZuO1xuICAgICAgICB9KS5iaW5kKHRoaXMpKCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBvcmlnaW5hbCBhbmQgZW50aXJlIGVsZW1lbnQgYW5kIGl0cyBzdGF0ZSwgYmVmb3JlIGluaXRpYWxpemF0aW9uLlxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKiBAdHlwZSB7SFRNTERpdkVsZW1lbnR9XG4gICAgICAgICAqL1xuICAgICAgICAgICAgLy8gY2xvbmVOb2RlKHRydWUpID4gcGFyYW1ldGVycyBpcyByZXF1aXJlZC4gT3BlcmEgJiBJRSB0aHJvd3MgYW5kIGludGVybmFsIGVycm9yLiBPcGVyYSBtb2JpbGUgYnJlYWtzLlxuICAgICAgICB0aGlzLl9zbmlwcGV0ID0gdGhpcy5fZWwuY2xvbmVOb2RlKHRydWUpO1xuXG4gICAgICAgIC8vIFVzZSB0aGUgdHJpZ2dlciBhcyB0aGUgcG9zaXRpb25pbmcgcmVmZXJlbmNlXG4gICAgICAgIHRoaXMuX29wdGlvbnMucmVmZXJlbmNlID0gdGhpcy5fb3B0aW9ucy5yZWZlcmVuY2UgfHwgdGhpcy5fZWw7XG5cbiAgICAgICAgLy8gT3BlbiBldmVudCB3aGVuIGNvbmZpZ3VyZWQgYXMgYWJsZSB0byBzaG93biBhbnl3YXlcbiAgICAgICAgaWYgKHRoaXMuX29wdGlvbnMuc2hvd25ieSAhPT0gJ25vbmUnKSB7XG5cbiAgICAgICAgICAgIHRpbnkuYWRkQ2xhc3ModGhpcy5fZWwsIHRoaXMuZ2V0Q2xhc3NuYW1lKCdzaG93bmJ5LScgKyB0aGlzLl9vcHRpb25zLnNob3duYnkpKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX29wdGlvbnMuc2hvd25ieSA9PT0gc2hvd25ieUV2ZW50LnBvaW50ZXJ0YXAgJiYgbmF2aWdhdG9yLnBvaW50ZXJFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgdGlueS5vbih0aGlzLl9lbCwgJ2NsaWNrJywgZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGlueS5vbih0aGlzLl9lbCwgc2hvd25ieUV2ZW50W3RoaXMuX29wdGlvbnMuc2hvd25ieV0sIGUgPT4ge1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHNob3dIYW5kbGVyKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBhIGNvbnRlbnQgaWYgaXQncyBub3QgZGVmaW5lZFxuICAgICAgICBpZiAodGhpcy5fb3B0aW9ucy5jb250ZW50ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIENvbnRlbnQgZnJvbSBhbmNob3IgaHJlZlxuICAgICAgICAgICAgLy8gSUUgZGVmaW5lcyB0aGUgaHJlZiBhdHRyaWJ1dGUgZXF1YWwgdG8gc3JjIGF0dHJpYnV0ZSBvbiBpbWFnZXMuXG4gICAgICAgICAgICBpZiAodGhpcy5fZWwubm9kZU5hbWUgPT09ICdBJyAmJiB0aGlzLl9lbC5ocmVmICE9PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX29wdGlvbnMuY29udGVudCA9IHRoaXMuX2VsLmhyZWY7XG5cbiAgICAgICAgICAgICAgICAvLyBDb250ZW50IGZyb20gdGl0bGUgb3IgYWx0XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2VsLnRpdGxlICE9PSAnJyB8fCB0aGlzLl9lbC5hbHQgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBjb25maWd1cmF0aW9uIHBhcmFtZXRlclxuICAgICAgICAgICAgICAgIHRoaXMuX29wdGlvbnMuY29udGVudCA9IHRoaXMuX2VsLnRpdGxlIHx8IHRoaXMuX2VsLmFsdDtcbiAgICAgICAgICAgICAgICAvLyBLZWVwIHRoZSBhdHRyaWJ1dGVzIGNvbnRlbnQgaW50byB0aGUgZWxlbWVudCBmb3IgcG9zc2libGUgdXNhZ2VcbiAgICAgICAgICAgICAgICB0aGlzLl9lbC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdGl0bGUnLCB0aGlzLl9vcHRpb25zLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIC8vIEF2b2lkIHRvIHRyaWdnZXIgdGhlIG5hdGl2ZSB0b29sdGlwXG4gICAgICAgICAgICAgICAgdGhpcy5fZWwudGl0bGUgPSB0aGlzLl9lbC5hbHQgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBXQUktQVJJQVxuICAgICAgICB0aGlzLl9lbC5zZXRBdHRyaWJ1dGUoJ2FyaWEtb3ducycsIHRoaXMuZ2V0Q2xhc3NuYW1lKHRoaXMuY29uc3RydWN0b3IubmFtZS50b0xvd2VyQ2FzZSgpICsgJy0nICsgdGhpcy51aWQpKTtcbiAgICAgICAgdGhpcy5fZWwuc2V0QXR0cmlidXRlKCdhcmlhLWhhc3BvcHVwJywgJ3RydWUnKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIHBvcG92ZXIgdHJpZ2dlci4gSXQncyB0aGUgZWxlbWVudCB0aGF0IHdpbGwgc2hvdyBhbmQgaGlkZSB0aGUgY29udGFpbmVyLlxuICAgICAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRyaWdnZXIgPSB0aGlzLl9lbDtcbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBEZXRlcm1pbmVzIGhvdyB0byBoaWRlIHRoZSBjb21wb25lbnQuXG4gICAgICogQG1lbWJlcm9mISBQb3BvdmVyLnByb3RvdHlwZVxuICAgICAqIEBwcml2YXRlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICovXG4gICAgX2NvbmZpZ3VyZUhpZGluZyAoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWZlcmVuY2UgdG8gY29udGV4dCBvZiBhbiBpbnN0YW5jZS5cbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHZhciBoaWRkZW5ieSA9IHRoaXMuX29wdGlvbnMuaGlkZGVuYnksXG4gICAgICAgICAgICBkdW1teSxcbiAgICAgICAgICAgIGJ1dHRvbjtcblxuXG5cbiAgICAgICAgLy8gRG9uJ3QgaGlkZSBhbnl0aW1lXG4gICAgICAgIGlmIChoaWRkZW5ieSA9PT0gJ25vbmUnKSB7IHJldHVybjsgfVxuXG4gICAgICAgIC8vIEhpZGUgYnkgbGVhdmluZyB0aGUgY29tcG9uZW50XG4gICAgICAgIGlmIChoaWRkZW5ieSA9PT0gJ3BvaW50ZXJsZWF2ZScgJiYgdGhpcy50cmlnZ2VyICE9PSB1bmRlZmluZWQpIHtcblxuICAgICAgICAgICAgW3RoaXMudHJpZ2dlciwgdGhpcy5jb250YWluZXJdLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgIHRpbnkub24oZWwsIHRpbnkub25wb2ludGVyZW50ZXIsIHRoaXMuX2hpZGVUaW1lckNsZWFuZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBbdGhpcy50cmlnZ2VyLCB0aGlzLmNvbnRhaW5lcl0uZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgdGlueS5vbihlbCwgdGlueS5vbnBvaW50ZXJsZWF2ZSwgdGhpcy5faGlkZVRpbWVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGlkZSB3aXRoIHRoZSBidXR0b24gQ2xvc2VcbiAgICAgICAgaWYgKGhpZGRlbmJ5ID09PSAnYnV0dG9uJyB8fCBoaWRkZW5ieSA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICAgIGR1bW15ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBkdW1teS5pbm5lckhUTUwgPSBgPGkgY2xhc3M9XCIke3RoaXMuZ2V0Q2xhc3NuYW1lKCdjbG9zZScpfVwiIHJvbGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPVwiQ2xvc2VcIj48L2k+YDtcbiAgICAgICAgICAgIGJ1dHRvbiA9IGR1bW15LnF1ZXJ5U2VsZWN0b3IoJ2knKTtcblxuICAgICAgICAgICAgdGlueS5vbihidXR0b24sIHRpbnkub25wb2ludGVydGFwLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5jb250YWluZXIuaW5zZXJ0QmVmb3JlKGJ1dHRvbiwgdGhpcy5jb250YWluZXIuZmlyc3RDaGlsZCk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgoaGlkZGVuYnkgPT09ICdwb2ludGVycycgfHwgaGlkZGVuYnkgPT09ICdhbGwnKSAmJiB0aGlzLl9oaWRpbmdTaG9ydGN1dHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5faGlkaW5nU2hvcnRjdXRzKCk7XG4gICAgICAgIH1cblxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuIG9wdGlvbnMgb2JqZWN0IGZyb20gdGhlIHBhcmFtZXRlcnMgYXJyaXZpbmcgdG8gdGhlIGNvbnN0cnVjdG9yIG1ldGhvZC5cbiAgICAgKiBAbWVtYmVyb2YhIFBvcG92ZXIucHJvdG90eXBlXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKi9cbiAgICBfbm9ybWFsaXplT3B0aW9ucyAob3B0aW9ucykge1xuICAgICAgICAvLyBJRTggYW5kIGVhcmxpZXIgZG9uJ3QgZGVmaW5lIHRoZSBub2RlIHR5cGUgY29uc3RhbnRzLCAxID09PSBkb2N1bWVudC5FTEVNRU5UX05PREVcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJyB8fCAodHlwZW9mIG9wdGlvbnMgPT09ICdvYmplY3QnICYmIG9wdGlvbnMubm9kZVR5cGUgPT09IDEpKSB7XG4gICAgICAgICAgICBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgICdjb250ZW50Jzogb3B0aW9uc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogV3JhcHMgdGhlIHRhcmdldCBlbGVtZW50IGFuZCB1c2UgdGhlIHdyYXBwZXIgYXMgdGhlIHBsYWNlbWVudCBmb3IgY29udGFpbmVyXG4gICAgICogQG1lbWJlcm9mISBQb3BvdmVyLnByb3RvdHlwZVxuICAgICAqIEBwcml2YXRlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICovXG4gICAgX2NvbmZpZ3VyZVdyYXBwZXIgKCkge1xuICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy5fZWwgfHwgdGhpcy5fb3B0aW9ucy5yZWZlcmVuY2UsXG4gICAgICAgICAgICB3cmFwcGVyID0gdGhpcy5fb3B0aW9ucy53cmFwcGVyO1xuXG4gICAgICAgIGlmICh3cmFwcGVyICYmIHRhcmdldCAmJiB0YXJnZXQubm9kZVR5cGUgPT09IDEpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgd3JhcHBlciBlbGVtZW50IGFuZCBhcHBlbmQgdG8gaXRcbiAgICAgICAgICAgIHdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICB0aW55LmFkZENsYXNzKHdyYXBwZXIsIHRoaXMuZ2V0Q2xhc3NuYW1lKCdwb3BvdmVyLXdyYXBwZXInKSk7XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5fb3B0aW9ucy53cmFwcGVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHRoaXMuX29wdGlvbnMud3JhcHBlci5zcGxpdCgnICcpLmZvckVhY2goY2xhc3NOYW1lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGlueS5hZGRDbGFzcyh3cmFwcGVyLCB0aGlzLmdldENsYXNzbmFtZShjbGFzc05hbWUpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGlueS5wYXJlbnQodGFyZ2V0KS5pbnNlcnRCZWZvcmUod3JhcHBlciwgdGFyZ2V0KTtcbiAgICAgICAgICAgIHdyYXBwZXIuYXBwZW5kQ2hpbGQodGFyZ2V0KTtcbiAgICAgICAgICAgIGlmICh0aW55LmNzcyh3cmFwcGVyLCAncG9zaXRpb24nKSA9PT0gJ3N0YXRpYycpIHtcbiAgICAgICAgICAgICAgICB0aW55LmNzcyh3cmFwcGVyLCB7XG4gICAgICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3JlbGF0aXZlJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9jb250YWluZXJXcmFwcGVyID0gd3JhcHBlcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2NvbnRhaW5lcldyYXBwZXIgPSBkb2N1bWVudC5ib2R5O1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNob3dzIHRoZSBwb3BvdmVyIGNvbnRhaW5lciBhbmQgYXBwZW5kcyBpdCB0byB0aGUgYm9keS5cbiAgICAgKiBAbWVtYmVyb2YhIFBvcG92ZXIucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHBhcmFtIHsoU3RyaW5nIHwgSFRNTEVsZW1lbnQpfSBbY29udGVudF0gVGhlIGNvbnRlbnQgdGhhdCB3aWxsIGJlIHVzZWQgYnkgcG9wb3Zlci5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEEgY3VzdG9tIG9wdGlvbnMgdG8gYmUgdXNlZCB3aXRoIGNvbnRlbnQgbG9hZGVkIGJ5IGFqYXguXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLm1ldGhvZF0gVGhlIHR5cGUgb2YgcmVxdWVzdCAoXCJQT1NUXCIgb3IgXCJHRVRcIikgdG8gbG9hZCBjb250ZW50IGJ5IGFqYXguIERlZmF1bHQ6IFwiR0VUXCIuXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IFtvcHRpb25zLnBhcmFtc10gUGFyYW1zIGxpa2UgcXVlcnkgc3RyaW5nIHRvIGJlIHNlbnQgdG8gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmNhY2hlXSBGb3JjZSB0byBjYWNoZSB0aGUgcmVxdWVzdCBieSB0aGUgYnJvd3Nlci4gRGVmYXVsdDogdHJ1ZS5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtvcHRpb25zLmFzeW5jXSBGb3JjZSB0byBzZW50IHJlcXVlc3QgYXN5bmNocm9ub3VzbHkuIERlZmF1bHQ6IHRydWUuXG4gICAgICogQHBhcmFtIHsoU3RyaW5nIHwgSFRNTEVsZW1lbnQpfSBbb3B0aW9ucy53YWl0aW5nXSBUZW1wb3JhcnkgY29udGVudCB0byB1c2Ugd2hpbGUgdGhlIGFqYXggcmVxdWVzdCBpcyBsb2FkaW5nLlxuICAgICAqIEByZXR1cm5zIHtwb3BvdmVyfVxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gU2hvd3MgYSBiYXNpYyBwb3BvdmVyLlxuICAgICAqIHBvcG92ZXIuc2hvdygpO1xuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gU2hvd3MgYSBwb3BvdmVyIHdpdGggbmV3IGNvbnRlbnRcbiAgICAgKiBwb3BvdmVyLnNob3coJ1NvbWUgbmV3IGNvbnRlbnQgaGVyZSEnKTtcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFNob3dzIGEgcG9wb3ZlciB3aXRoIGEgbmV3IGNvbnRlbnQgdGhhdCB3aWxsIGJlIGxvYWRlZCBieSBhamF4IHdpdGggc29tZSBjdXN0b20gb3B0aW9uc1xuICAgICAqIHBvcG92ZXIuc2hvdygnaHR0cDovL2RvbWFpbi5jb20vYWpheC91cmwnLCB7XG4gICAgICogICAgICdjYWNoZSc6IGZhbHNlLFxuICAgICAqICAgICAncGFyYW1zJzogJ3gtcmVxdWVzdD10cnVlJ1xuICAgICAqIH0pO1xuICAgICAqL1xuICAgIHNob3cgKGNvbnRlbnQsIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gRG9uJ3QgZXhlY3V0ZSB3aGVuIGl0J3MgZGlzYWJsZWRcbiAgICAgICAgaWYgKCF0aGlzLl9lbmFibGVkIHx8IHRoaXMuX3Nob3duKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGVuZCB0byB0aGUgY29uZmlndXJlZCBob2xkZXJcbiAgICAgICAgdGhpcy5fY29udGFpbmVyV3JhcHBlci5hcHBlbmRDaGlsZCh0aGlzLmNvbnRhaW5lcik7XG5cbiAgICAgICAgLy8gT3BlbiB0aGUgY29sbGFwc2libGVcbiAgICAgICAgdGhpcy5fc2hvdygpO1xuXG4gICAgICAgIC8vIFJlcXVlc3QgdGhlIGNvbnRlbnRcbiAgICAgICAgaWYgKGNvbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5jb250ZW50KGNvbnRlbnQsIG9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEhpZGVzIHRoZSBwb3BvdmVyIGNvbnRhaW5lciBhbmQgZGVsZXRlcyBpdCBmcm9tIHRoZSBib2R5LlxuICAgICAqIEBtZW1iZXJvZiEgUG9wb3Zlci5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7cG9wb3Zlcn1cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIENsb3NlIGEgcG9wb3ZlclxuICAgICAqIHBvcG92ZXIuaGlkZSgpO1xuICAgICAqL1xuICAgIGhpZGUgPSAoKSA9PiB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgLy8gRG9uJ3QgZXhlY3V0ZSB3aGVuIGl0J3MgZGlzYWJsZWRcbiAgICAgICAgaWYgKCF0aGlzLl9lbmFibGVkIHx8ICF0aGlzLl9zaG93bikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXRhY2ggdGhlIGNvbnRhaW5lciBmcm9tIHRoZSBET00gd2hlbiBpdCBpcyBoaWRkZW5cbiAgICAgICAgdGhpcy5vbmNlKCdoaWRlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gRHVlIHRvIHRyYW5zaXRpb25zIHRoaXMuX3Nob3duIGNhbiBiZSBvdXRkYXRlZCBoZXJlXG4gICAgICAgICAgICBsZXQgcGFyZW50ID0gc2VsZi5jb250YWluZXIucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIGlmIChwYXJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBwYXJlbnQucmVtb3ZlQ2hpbGQoc2VsZi5jb250YWluZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbG9zZSB0aGUgY29sbGFwc2libGVcbiAgICAgICAgdGhpcy5faGlkZSgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGEgQm9vbGVhbiBzcGVjaWZ5aW5nIGlmIHRoZSBjb250YWluZXIgaXMgc2hvd24gb3Igbm90LlxuICAgICAqIEBtZW1iZXJvZiEgUG9wb3Zlci5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIENoZWNrIHRoZSBwb3BvdmVyIHN0YXR1c1xuICAgICAqIHBvcG92ZXIuaXNTaG93bigpO1xuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gQ2hlY2sgdGhlIHBvcG92ZXIgc3RhdHVzIGFmdGVyIGFuIHVzZXIgYWN0aW9uXG4gICAgICogJCh3aW5kb3cpLm9uKHRpbnkub25wb2ludGVydGFwLCBmdW5jdGlvbiAoKSB7XG4gICAgICogICAgIGlmIChwb3BvdmVyLmlzU2hvd24oKSkge1xuICAgICAqICAgICAgICAgYWxlcnQoJ1BvcG92ZXI6IHZpc2libGUnKTtcbiAgICAgKiAgICAgfSBlbHNlIHtcbiAgICAgKiAgICAgICAgIGFsZXJ0KCdQb3BvdmVyOiBub3QgdmlzaWJsZScpO1xuICAgICAqICAgICB9XG4gICAgICogfSk7XG4gICAgICovXG4gICAgaXNTaG93biAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9zaG93bjtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogU2V0cyBvciBnZXRzIHRoZSB3aWR0aCBvZiB0aGUgY29udGFpbmVyLlxuICAgICAqIEBtZW1iZXJvZiEgUG9wb3Zlci5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gW2RhdGFdIFNldCBhIHdpZHRoIGZvciB0aGUgY29udGFpbmVyLlxuICAgICAqIEByZXR1cm5zIHsoTnVtYmVyIHwgcG9wb3Zlcil9XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBTZXQgYSBuZXcgcG9wb3ZlciB3aWR0aFxuICAgICAqIGNvbXBvbmVudC53aWR0aCgnMzAwcHgnKTtcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIEdldCB0aGUgY3VycmVudCBwb3BvdmVyIHdpZHRoXG4gICAgICogY29tcG9uZW50LndpZHRoKCk7IC8vICczMDBweCdcbiAgICAgKi9cbiAgICB3aWR0aCAoZGF0YSkge1xuXG4gICAgICAgIGlmIChkYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9vcHRpb25zLndpZHRoO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb250YWluZXIuc3R5bGUud2lkdGggPSBkYXRhO1xuXG4gICAgICAgIHRoaXMuX29wdGlvbnMud2lkdGggPSBkYXRhO1xuXG4gICAgICAgIHRoaXMucmVmcmVzaFBvc2l0aW9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNldHMgb3IgZ2V0cyB0aGUgaGVpZ2h0IG9mIHRoZSBjb250YWluZXIuXG4gICAgICogQG1lbWJlcm9mISBQb3BvdmVyLnByb3RvdHlwZVxuICAgICAqIEBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBbZGF0YV0gU2V0IGEgaGVpZ2h0IGZvciB0aGUgY29udGFpbmVyLlxuICAgICAqIEByZXR1cm5zIHsoTnVtYmVyIHwgcG9wb3Zlcil9XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBTZXQgYSBuZXcgcG9wb3ZlciBoZWlnaHRcbiAgICAgKiBjb21wb25lbnQuaGVpZ2h0KCczMDBweCcpO1xuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gR2V0IHRoZSBjdXJyZW50IHBvcG92ZXIgaGVpZ2h0XG4gICAgICogY29tcG9uZW50LmhlaWdodCgpOyAvLyAnMzAwcHgnXG4gICAgICovXG4gICAgaGVpZ2h0IChkYXRhKSB7XG5cbiAgICAgICAgaWYgKGRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX29wdGlvbnMuaGVpZ2h0O1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb250YWluZXIuc3R5bGUuaGVpZ2h0ID0gZGF0YTtcblxuICAgICAgICB0aGlzLl9vcHRpb25zLmhlaWdodCA9IGRhdGE7XG5cbiAgICAgICAgdGhpcy5yZWZyZXNoUG9zaXRpb24oKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgY3VycmVudCBwb3NpdGlvbiBvZiB0aGUgY29udGFpbmVyIHdpdGggZ2l2ZW4gb3B0aW9ucyBvciBkZWZhdWx0cy5cbiAgICAgKiBAbWVtYmVyb2YhIFBvcG92ZXIucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHBhcmFtcyB7T2JqZWN0fSBbb3B0aW9uc10gQSBjb25maWd1cmF0aW9uIG9iamVjdC5cbiAgICAgKiBAcmV0dXJucyB7cG9wb3Zlcn1cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFVwZGF0ZSB0aGUgY3VycmVudCBwb3NpdGlvblxuICAgICAqIHBvcG92ZXIucmVmcmVzaFBvc2l0aW9uKCk7XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBVcGRhdGUgdGhlIGN1cnJlbnQgcG9zaXRpb24gd2l0aCBhIG5ldyBvZmZzZXRYIGFuZCBvZmZzZXRZXG4gICAgICogcG9wb3Zlci5yZWZyZXNoUG9zaXRpb24oe1xuICAgICAqICAgICAnb2ZmZXN0WCc6IDEwMCxcbiAgICAgKiAgICAgJ29mZmVzdFknOiAxMFxuICAgICAqIH0pO1xuICAgICAqL1xuICAgIHJlZnJlc2hQb3NpdGlvbiAob3B0aW9ucykge1xuXG4gICAgICAgIGlmICh0aGlzLl9zaG93bikge1xuICAgICAgICAgICAgLy8gUmVmcmVzaCBpdHMgcG9zaXRpb24uXG4gICAgICAgICAgICB0aGlzLl9wb3NpdGlvbmVyLnJlZnJlc2gob3B0aW9ucyk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpdHMgb3B0aW9ucy4gSXQgd2lsbCB1cGRhdGUgcG9zaXRpb24gdGhlIG5leHQgdGltZSB0byBiZSBzaG93bi5cbiAgICAgICAgICAgIHRoaXMuX3Bvc2l0aW9uZXIuX2NvbmZpZ3VyZShvcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBFbmFibGVzIGEgUG9wb3ZlciBpbnN0YW5jZS5cbiAgICAgKiBAbWVtYmVyb2YhIFBvcG92ZXIucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge3BvcG92ZXJ9XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBFbmFibGUgYSBwb3BvdmVyXG4gICAgICogcG9wb3Zlci5lbmFibGUoKTtcbiAgICAgKi9cbiAgICBlbmFibGUgKCkge1xuXG4gICAgICAgIGlmICh0aGlzLl9lbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLl9lbC5zZXRBdHRyaWJ1dGUoJ2FyaWEtZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzdXBlci5lbmFibGUoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGlzYWJsZXMgYSBQb3BvdmVyIGluc3RhbmNlLlxuICAgICAqIEBtZW1iZXJvZiEgUG9wb3Zlci5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7cG9wb3Zlcn1cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIERpc2FibGUgYSBwb3BvdmVyXG4gICAgICogcG9wb3Zlci5kaXNhYmxlKCk7XG4gICAgICovXG4gICAgZGlzYWJsZSAoKSB7XG5cbiAgICAgICAgaWYgKHRoaXMuX2VsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMuX2VsLnNldEF0dHJpYnV0ZSgnYXJpYS1kaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX3Nob3duKSB7XG4gICAgICAgICAgICB0aGlzLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN1cGVyLmRpc2FibGUoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogRGVzdHJveXMgYSBQb3BvdmVyIGluc3RhbmNlLlxuICAgICAqIEBtZW1iZXJvZiEgUG9wb3Zlci5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7cG9wb3Zlcn1cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIERlc3Ryb3kgYSBwb3BvdmVyXG4gICAgICogcG9wb3Zlci5kZXN0cm95KCk7XG4gICAgICogLy8gRW1wdHkgdGhlIHBvcG92ZXIgcmVmZXJlbmNlXG4gICAgICogcG9wb3ZlciA9IHVuZGVmaW5lZDtcbiAgICAgKi9cbiAgICBkZXN0cm95ICgpIHtcblxuICAgICAgICBpZiAodGhpcy50cmlnZ2VyICE9PSB1bmRlZmluZWQpIHtcblxuICAgICAgICAgICAgdGlueS5vZmYodGhpcy50cmlnZ2VyLCB0aW55Lm9ucG9pbnRlcmVudGVyLCB0aGlzLl9oaWRlVGltZXJDbGVhbmVyKTtcbiAgICAgICAgICAgIHRpbnkub2ZmKHRoaXMudHJpZ2dlciwgdGlueS5vbnBvaW50ZXJsZWF2ZSwgdGhpcy5faGlkZVRpbWVyKTtcblxuICAgICAgICAgICAgWydkYXRhLXRpdGxlJywgJ2FyaWEtb3ducycsICdhcmlhLWhhc3BvcHVwJywgJ2RhdGEtc2lkZScsICdkYXRhLWFsaWduJywncm9sZScgXS5mb3JFYWNoKGF0dHIgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlci5yZW1vdmVBdHRyaWJ1dGUoYXR0cik7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5fc25pcHBldC5hbHQgPyB0aGlzLnRyaWdnZXIuc2V0QXR0cmlidXRlKCdhbHQnLCB0aGlzLl9zbmlwcGV0LmFsdCkgOiBudWxsO1xuICAgICAgICAgICAgdGhpcy5fc25pcHBldC50aXRsZSA/IHRoaXMudHJpZ2dlci5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgdGhpcy5fc25pcHBldC50aXRsZSkgOiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgdGlueS5vZmYoZG9jdW1lbnQsIHRpbnkub25sYXlvdXRjaGFuZ2UsIHRoaXMuX3JlZnJlc2hQb3NpdGlvbkxpc3RlbmVyKTtcblxuICAgICAgICB2aWV3cG9ydC5yZW1vdmVMaXN0ZW5lcih0aW55Lm9ucmVzaXplLCB0aGlzLl9yZWZyZXNoUG9zaXRpb25MaXN0ZW5lcik7XG5cbiAgICAgICAgc3VwZXIuZGVzdHJveSgpO1xuXG4gICAgICAgIHJldHVybjtcbiAgICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBQb3BvdmVyO1xuIiwiaW1wb3J0IHZpZXdwb3J0IGZyb20gJy4vdmlld3BvcnQnO1xuXG4vKipcbiAqIFRoZSBQb3NpdGlvbmVyIGxldHMgeW91IHBvc2l0aW9uIGVsZW1lbnRzIG9uIHRoZSBzY3JlZW4gYW5kIGNoYW5nZXMgaXRzIHBvc2l0aW9ucy5cbiAqIEBtZW1iZXJvZiBjaFxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBDb25maWd1cmF0aW9uIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLnRhcmdldCBBIEhUTUxFbGVtZW50IHRoYXQgcmVmZXJlbmNlIHRvIHRoZSBlbGVtZW50IHRvIGJlIHBvc2l0aW9uZWQuXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMucmVmZXJlbmNlXSBBIEhUTUxFbGVtZW50IHRoYXQgaXQncyBhIHJlZmVyZW5jZSB0byBwb3NpdGlvbiBhbmQgc2l6ZSBvZiBlbGVtZW50IHRoYXQgd2lsbCBiZSBjb25zaWRlcmVkIHRvIGNhcnJ5IG91dCB0aGUgcG9zaXRpb24uIElmIGl0IGlzbid0IGRlZmluZWQgdGhyb3VnaCBjb25maWd1cmF0aW9uLCBpdCB3aWxsIGJlIHRoZSB2aWV3cG9ydC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5zaWRlXSBUaGUgc2lkZSBvcHRpb24gd2hlcmUgdGhlIHRhcmdldCBlbGVtZW50IHdpbGwgYmUgcG9zaXRpb25lZC4gWW91IG11c3QgdXNlOiBcImxlZnRcIiwgXCJyaWdodFwiLCBcInRvcFwiLCBcImJvdHRvbVwiIG9yIFwiY2VudGVyXCIuIERlZmF1bHQ6IFwiY2VudGVyXCIuXG4gKiBAcGFyYW0ge1N0cmluZ30gW29wdGlvbnMuYWxpZ25dIFRoZSBhbGlnbiBvcHRpb25zIHdoZXJlIHRoZSB0YXJnZXQgZWxlbWVudCB3aWxsIGJlIHBvc2l0aW9uZWQuIFlvdSBtdXN0IHVzZTogXCJsZWZ0XCIsIFwicmlnaHRcIiwgXCJ0b3BcIiwgXCJib3R0b21cIiBvciBcImNlbnRlclwiLiBEZWZhdWx0OiBcImNlbnRlclwiLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm9mZnNldFhdIERpc3RhbmNlIHRvIGRpc3BsYWNlIHRoZSB0YXJnZXQgaG9yaXpvbnRhbGx5LiBEZWZhdWx0OiAwLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLm9mZnNldFldIERpc3RhbmNlIHRvIGRpc3BsYWNlIHRoZSB0YXJnZXQgdmVydGljYWxseS4gRGVmYXVsdDogMC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbb3B0aW9ucy5wb3NpdGlvbl0gVGhldGhlIHR5cGUgb2YgcG9zaXRpb25pbmcgdXNlZC4gWW91IG11c3QgdXNlOiBcImFic29sdXRlXCIgb3IgXCJmaXhlZFwiLiBEZWZhdWx0OiBcImZpeGVkXCIuXG4gKiBAcmVxdWlyZXMgY2guVmlld3BvcnRcbiAqIEByZXR1cm5zIHtwb3NpdGlvbmVyfSBSZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIFBvc2l0aW9uZXIuXG4gKiBAZXhhbXBsZVxuICogLy8gSW5zdGFuY2UgdGhlIFBvc2l0aW9uZXIgSXQgcmVxdWlyZXMgYSBsaXR0bGUgY29uZmlndXJhdGlvbi5cbiAqIC8vIFRoZSBkZWZhdWx0IGJlaGF2aW9yIHBsYWNlIGFuIGVsZW1lbnQgY2VudGVyIGludG8gdGhlIFZpZXdwb3J0LlxuICogdmFyIHBvc2l0aW9uZWQgPSBuZXcgY2guUG9zaXRpb25lcih7XG4gICAgICogICAgICd0YXJnZXQnOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudGFyZ2V0JyksXG4gICAgICogICAgICdyZWZlcmVuY2UnOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucmVmZXJlbmNlJyksXG4gICAgICogICAgICdzaWRlJzogJ3RvcCcsXG4gICAgICogICAgICdhbGlnbic6ICdsZWZ0JyxcbiAgICAgKiAgICAgJ29mZnNldFgnOiAyMCxcbiAgICAgKiAgICAgJ29mZnNldFknOiAxMFxuICAgICAqIH0pO1xuICogQGV4YW1wbGVcbiAqIC8vIG9mZnNldFg6IFRoZSBQb3NpdGlvbmVyIGNvdWxkIGJlIGNvbmZpZ3VyYXRlZCB3aXRoIGFuIG9mZnNldFguXG4gKiAvLyBUaGlzIGV4YW1wbGUgc2hvdyBhbiBlbGVtZW50IGRpc3BsYWNlZCBob3Jpem9udGFsbHkgYnkgMTBweCBvZiBkZWZpbmVkIHBvc2l0aW9uLlxuICogdmFyIHBvc2l0aW9uZWQgPSBuZXcgY2guUG9zaXRpb25lcih7XG4gICAgICogICAgICd0YXJnZXQnOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudGFyZ2V0JyksXG4gICAgICogICAgICdyZWZlcmVuY2UnOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucmVmZXJlbmNlJyksXG4gICAgICogICAgICdzaWRlJzogJ3RvcCcsXG4gICAgICogICAgICdhbGlnbic6ICdsZWZ0JyxcbiAgICAgKiAgICAgJ29mZnNldFgnOiAxMFxuICAgICAqIH0pO1xuICogQGV4YW1wbGVcbiAqIC8vIG9mZnNldFk6IFRoZSBQb3NpdGlvbmVyIGNvdWxkIGJlIGNvbmZpZ3VyYXRlZCB3aXRoIGFuIG9mZnNldFkuXG4gKiAvLyBUaGlzIGV4YW1wbGUgc2hvdyBhbiBlbGVtZW50IGRpc3BsYWNlZCB2ZXJ0aWNhbGx5IGJ5IDEwcHggb2YgZGVmaW5lZCBwb3NpdGlvbi5cbiAqIHZhciBwb3NpdGlvbmVkID0gbmV3IGNoLlBvc2l0aW9uZXIoe1xuICAgICAqICAgICAndGFyZ2V0JzogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnRhcmdldCcpLFxuICAgICAqICAgICAncmVmZXJlbmNlJzogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnJlZmVyZW5jZScpLFxuICAgICAqICAgICAnc2lkZSc6ICd0b3AnLFxuICAgICAqICAgICAnYWxpZ24nOiAnbGVmdCcsXG4gICAgICogICAgICdvZmZzZXRZJzogMTBcbiAgICAgKiB9KTtcbiAqIEBleGFtcGxlXG4gKiAvLyBwb3NpdGlvbmVkOiBUaGUgcG9zaXRpb25lciBjb3VsZCBiZSBjb25maWd1cmVkIHRvIHdvcmsgd2l0aCBmaXhlZCBvciBhYnNvbHV0ZSBwb3NpdGlvbiB2YWx1ZS5cbiAqIHZhciBwb3NpdGlvbmVkID0gbmV3IGNoLlBvc2l0aW9uZXIoe1xuICAgICAqICAgICAndGFyZ2V0JzogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnRhcmdldCcpLFxuICAgICAqICAgICAncmVmZXJlbmNlJzogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnJlZmVyZW5jZScpLFxuICAgICAqICAgICAncG9zaXRpb24nOiAnZml4ZWQnXG4gICAgICogfSk7XG4gKi9cbmNsYXNzIFBvc2l0aW9uZXIge1xuXG4gICAgY29uc3RydWN0b3IgKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IHdpbmRvdy5FcnJvcignUG9zaXRpb25lcjogRXhwZWN0ZWQgb3B0aW9ucyB0byBiZSBkZWZpbmVkLicpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX29wdGlvbnMgPSB7fTtcblxuICAgICAgICAvLyBJbml0XG4gICAgICAgIHRoaXMuX2NvbmZpZ3VyZShvcHRpb25zKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb25maWd1cmF0aW9uIGJ5IGRlZmF1bHQuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIHN0YXRpYyBfZGVmYXVsdHMgPSB7XG4gICAgICAgICdvZmZzZXRYJzogMCxcbiAgICAgICAgJ29mZnNldFknOiAwLFxuICAgICAgICAnc2lkZSc6ICdjZW50ZXInLFxuICAgICAgICAnYWxpZ24nOiAnY2VudGVyJyxcbiAgICAgICAgJ3JlZmVyZW5jZSc6IHZpZXdwb3J0LFxuICAgICAgICAncG9zaXRpb24nOiAnZml4ZWQnXG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogQ29uZmlndXJlcyB0aGUgcG9zaXRpb25lciBpbnN0YW5jZSB3aXRoIGEgZ2l2ZW4gb3B0aW9ucy5cbiAgICAgKiBAbWVtYmVyb2YhIGNoLlBvc2l0aW9uZXIucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcmV0dXJucyB7cG9zaXRpb25lcn1cbiAgICAgKiBAcGFyYW1zIHtPYmplY3R9IG9wdGlvbnMgQSBjb25maWd1cmF0aW9uIG9iamVjdC5cbiAgICAgKi9cbiAgICBfY29uZmlndXJlIChvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGRlZmF1bHRzID0gdGlueS5jbG9uZShQb3NpdGlvbmVyLl9kZWZhdWx0cyk7XG5cbiAgICAgICAgdGhpcy5fb3B0aW9ucyA9IHRpbnkuZXh0ZW5kKGRlZmF1bHRzLCB0aGlzLl9vcHRpb25zLCBvcHRpb25zKTtcblxuICAgICAgICB0aGlzLl9vcHRpb25zLm9mZnNldFggPSBwYXJzZUludCh0aGlzLl9vcHRpb25zLm9mZnNldFgsIDEwKTtcbiAgICAgICAgdGhpcy5fb3B0aW9ucy5vZmZzZXRZID0gcGFyc2VJbnQodGhpcy5fb3B0aW9ucy5vZmZzZXRZLCAxMCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlZmVyZW5jZSB0byB0aGUgZWxlbWVudCB0byBiZSBwb3NpdGlvbmVkLlxuICAgICAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRhcmdldCA9IG9wdGlvbnMudGFyZ2V0IHx8IHRoaXMudGFyZ2V0O1xuXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEl0J3MgYSByZWZlcmVuY2UgdG8gcG9zaXRpb24gYW5kIHNpemUgb2YgZWxlbWVudCB0aGF0IHdpbGwgYmUgY29uc2lkZXJlZCB0byBjYXJyeSBvdXQgdGhlIHBvc2l0aW9uLlxuICAgICAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnJlZmVyZW5jZSA9IG9wdGlvbnMucmVmZXJlbmNlIHx8IHRoaXMucmVmZXJlbmNlO1xuICAgICAgICB0aGlzLl9yZWZlcmVuY2UgPSB0aGlzLl9vcHRpb25zLnJlZmVyZW5jZTtcblxuICAgICAgICB0aGlzLnRhcmdldC5zdHlsZS5wb3NpdGlvbiA9IHRoaXMuX29wdGlvbnMucG9zaXRpb247XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgY3VycmVudCBwb3NpdGlvbiB3aXRoIGEgZ2l2ZW4gb3B0aW9uc1xuICAgICAqIEBtZW1iZXJvZiEgY2guUG9zaXRpb25lci5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7cG9zaXRpb25lcn1cbiAgICAgKiBAcGFyYW1zIHtPYmplY3R9IG9wdGlvbnMgQSBjb25maWd1cmF0aW9uIG9iamVjdC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFVwZGF0ZXMgdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICogcG9zaXRpb25lZC5yZWZyZXNoKCk7XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBVcGRhdGVzIHRoZSBjdXJyZW50IHBvc2l0aW9uIHdpdGggbmV3IG9mZnNldFggYW5kIG9mZnNldFkuXG4gICAgICogcG9zaXRpb25lZC5yZWZyZXNoKHtcbiAgICAgKiAgICAgJ29mZmVzdFgnOiAxMDAsXG4gICAgICogICAgICdvZmZlc3RZJzogMTBcbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICByZWZyZXNoIChvcHRpb25zKSB7XG5cbiAgICAgICAgaWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5fY29uZmlndXJlKG9wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX3JlZmVyZW5jZSAhPT0gdmlld3BvcnQpIHtcbiAgICAgICAgICAgIHRoaXMuX2NhbGN1bGF0ZVJlZmVyZW5jZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fY2FsY3VsYXRlVGFyZ2V0KCk7XG5cbiAgICAgICAgLy8gdGhlIG9iamVjdCB0aGF0IHN0b3JlcyB0aGUgdG9wLCBsZWZ0IHJlZmVyZW5jZSB0byBzZXQgdG8gdGhlIHRhcmdldFxuICAgICAgICB0aGlzLl9zZXRQb2ludCgpO1xuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIHRoZSByZWZlcmVuY2UgKGVsZW1lbnQgb3Igdmlld3BvcnQpIG9mIHRoZSBwb3NpdGlvbi5cbiAgICAgKiBAbWVtYmVyb2YhIGNoLlBvc2l0aW9uZXIucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcmV0dXJucyB7cG9zaXRpb25lcn1cbiAgICAgKi9cbiAgICBfY2FsY3VsYXRlUmVmZXJlbmNlICgpIHtcblxuICAgICAgICB2YXIgcmVmZXJlbmNlID0gdGhpcy5yZWZlcmVuY2UsXG4gICAgICAgICAgICBvZmZzZXQ7XG5cbiAgICAgICAgcmVmZXJlbmNlLnNldEF0dHJpYnV0ZSgnZGF0YS1zaWRlJywgdGhpcy5fb3B0aW9ucy5zaWRlKTtcbiAgICAgICAgcmVmZXJlbmNlLnNldEF0dHJpYnV0ZSgnZGF0YS1hbGlnbicsIHRoaXMuX29wdGlvbnMuYWxpZ24pO1xuXG4gICAgICAgIHRoaXMuX3JlZmVyZW5jZSA9IHRoaXMuX2dldE91dGVyRGltZW5zaW9ucyhyZWZlcmVuY2UpO1xuXG4gICAgICAgIGlmIChyZWZlcmVuY2Uub2Zmc2V0UGFyZW50ID09PSB0aGlzLnRhcmdldC5vZmZzZXRQYXJlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlZmVyZW5jZS5sZWZ0ID0gcmVmZXJlbmNlLm9mZnNldExlZnQ7XG4gICAgICAgICAgICB0aGlzLl9yZWZlcmVuY2UudG9wID0gcmVmZXJlbmNlLm9mZnNldFRvcDtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2Zmc2V0ID0gdGlueS5vZmZzZXQocmVmZXJlbmNlKTtcbiAgICAgICAgICAgIHRoaXMuX3JlZmVyZW5jZS5sZWZ0ID0gb2Zmc2V0LmxlZnQ7XG4gICAgICAgICAgICB0aGlzLl9yZWZlcmVuY2UudG9wID0gb2Zmc2V0LnRvcDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHBvc2l0aW9uZWQgZWxlbWVudC5cbiAgICAgKiBAbWVtYmVyb2YhIGNoLlBvc2l0aW9uZXIucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcmV0dXJucyB7cG9zaXRpb25lcn1cbiAgICAgKi9cbiAgICBfY2FsY3VsYXRlVGFyZ2V0ICgpIHtcblxuICAgICAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgICAgIHRhcmdldC5zZXRBdHRyaWJ1dGUoJ2RhdGEtc2lkZScsIHRoaXMuX29wdGlvbnMuc2lkZSk7XG4gICAgICAgIHRhcmdldC5zZXRBdHRyaWJ1dGUoJ2RhdGEtYWxpZ24nLCB0aGlzLl9vcHRpb25zLmFsaWduKTtcblxuICAgICAgICB0aGlzLl90YXJnZXQgPSB0aGlzLl9nZXRPdXRlckRpbWVuc2lvbnModGFyZ2V0KTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBHZXQgdGhlIGN1cnJlbnQgb3V0ZXIgZGltZW5zaW9ucyBvZiBhbiBlbGVtZW50LlxuICAgICAqXG4gICAgICogQG1lbWJlcm9mIGNoLlBvc2l0aW9uZXIucHJvdG90eXBlXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWwgQSBnaXZlbiBIVE1MRWxlbWVudC5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgICAqL1xuICAgIF9nZXRPdXRlckRpbWVuc2lvbnMgKGVsKSB7XG4gICAgICAgIHZhciBvYmogPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgJ3dpZHRoJzogKG9iai5yaWdodCAtIG9iai5sZWZ0KSxcbiAgICAgICAgICAgICdoZWlnaHQnOiAob2JqLmJvdHRvbSAtIG9iai50b3ApXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMgdGhlIHBvaW50cy5cbiAgICAgKiBAbWVtYmVyb2YhIGNoLlBvc2l0aW9uZXIucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcmV0dXJucyB7cG9zaXRpb25lcn1cbiAgICAgKi9cbiAgICBfc2V0UG9pbnQgKCkge1xuICAgICAgICB2YXIgc2lkZSA9IHRoaXMuX29wdGlvbnMuc2lkZSxcbiAgICAgICAgICAgIG9yaWVudGF0aW9uID0gKHNpZGUgPT09ICd0b3AnIHx8IHNpZGUgPT09ICdib3R0b20nKSA/ICdob3Jpem9udGFsJyA6ICgoc2lkZSA9PT0gJ3JpZ2h0JyB8fCBzaWRlID09PSAnbGVmdCcpID8gJ3ZlcnRpY2FsJyA6ICdjZW50ZXInKSxcbiAgICAgICAgICAgIGNvb3JzLFxuICAgICAgICAgICAgb3JpZW50YXRpb25NYXA7XG5cbiAgICAgICAgLy8gdGFrZSB0aGUgc2lkZSBhbmQgY2FsY3VsYXRlIHRoZSBhbGlnbm1lbnQgYW5kIG1ha2UgdGhlIENTU3BvaW50XG4gICAgICAgIGlmIChvcmllbnRhdGlvbiA9PT0gJ2NlbnRlcicpIHtcbiAgICAgICAgICAgIC8vIGNhbGN1bGF0ZXMgdGhlIGNvb3JkaW5hdGVzIHJlbGF0ZWQgdG8gdGhlIGNlbnRlciBzaWRlIHRvIGxvY2F0ZSB0aGUgdGFyZ2V0XG4gICAgICAgICAgICBjb29ycyA9IHtcbiAgICAgICAgICAgICAgICAndG9wJzogKHRoaXMuX3JlZmVyZW5jZS50b3AgKyAodGhpcy5fcmVmZXJlbmNlLmhlaWdodCAvIDIgLSB0aGlzLl90YXJnZXQuaGVpZ2h0IC8gMikpLFxuICAgICAgICAgICAgICAgICdsZWZ0JzogKHRoaXMuX3JlZmVyZW5jZS5sZWZ0ICsgKHRoaXMuX3JlZmVyZW5jZS53aWR0aCAvIDIgLSB0aGlzLl90YXJnZXQud2lkdGggLyAyKSlcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgfSBlbHNlIGlmIChvcmllbnRhdGlvbiA9PT0gJ2hvcml6b250YWwnKSB7XG4gICAgICAgICAgICAvLyBjYWxjdWxhdGVzIHRoZSBjb29yZGluYXRlcyByZWxhdGVkIHRvIHRoZSB0b3Agb3IgYm90dG9tIHNpZGUgdG8gbG9jYXRlIHRoZSB0YXJnZXRcbiAgICAgICAgICAgIG9yaWVudGF0aW9uTWFwID0ge1xuICAgICAgICAgICAgICAgICdsZWZ0JzogdGhpcy5fcmVmZXJlbmNlLmxlZnQsXG4gICAgICAgICAgICAgICAgJ2NlbnRlcic6ICh0aGlzLl9yZWZlcmVuY2UubGVmdCArICh0aGlzLl9yZWZlcmVuY2Uud2lkdGggLyAyIC0gdGhpcy5fdGFyZ2V0LndpZHRoIC8gMikpLFxuICAgICAgICAgICAgICAgICdyaWdodCc6ICh0aGlzLl9yZWZlcmVuY2UubGVmdCArIHRoaXMuX3JlZmVyZW5jZS53aWR0aCAtIHRoaXMuX3RhcmdldC53aWR0aCksXG4gICAgICAgICAgICAgICAgJ3RvcCc6IHRoaXMuX3JlZmVyZW5jZS50b3AgLSB0aGlzLl90YXJnZXQuaGVpZ2h0LFxuICAgICAgICAgICAgICAgICdib3R0b20nOiAodGhpcy5fcmVmZXJlbmNlLnRvcCArIHRoaXMuX3JlZmVyZW5jZS5oZWlnaHQpXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb29ycyA9IHtcbiAgICAgICAgICAgICAgICAndG9wJzogb3JpZW50YXRpb25NYXBbc2lkZV0sXG4gICAgICAgICAgICAgICAgJ2xlZnQnOiBvcmllbnRhdGlvbk1hcFt0aGlzLl9vcHRpb25zLmFsaWduXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gY2FsY3VsYXRlcyB0aGUgY29vcmRpbmF0ZXMgcmVsYXRlZCB0byB0aGUgcmlnaHQgb3IgbGVmdCBzaWRlIHRvIGxvY2F0ZSB0aGUgdGFyZ2V0XG4gICAgICAgICAgICBvcmllbnRhdGlvbk1hcCA9IHtcbiAgICAgICAgICAgICAgICAndG9wJzogdGhpcy5fcmVmZXJlbmNlLnRvcCxcbiAgICAgICAgICAgICAgICAnY2VudGVyJzogKHRoaXMuX3JlZmVyZW5jZS50b3AgKyAodGhpcy5fcmVmZXJlbmNlLmhlaWdodCAvIDIgLSB0aGlzLl90YXJnZXQuaGVpZ2h0IC8gMikpLFxuICAgICAgICAgICAgICAgICdib3R0b20nOiAodGhpcy5fcmVmZXJlbmNlLnRvcCArIHRoaXMuX3JlZmVyZW5jZS5oZWlnaHQgLSB0aGlzLl90YXJnZXQuaGVpZ2h0KSxcbiAgICAgICAgICAgICAgICAncmlnaHQnOiAodGhpcy5fcmVmZXJlbmNlLmxlZnQgKyB0aGlzLl9yZWZlcmVuY2Uud2lkdGgpLFxuICAgICAgICAgICAgICAgICdsZWZ0JzogKHRoaXMuX3JlZmVyZW5jZS5sZWZ0IC0gdGhpcy5fdGFyZ2V0LndpZHRoKVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29vcnMgPSB7XG4gICAgICAgICAgICAgICAgJ3RvcCc6IG9yaWVudGF0aW9uTWFwW3RoaXMuX29wdGlvbnMuYWxpZ25dLFxuICAgICAgICAgICAgICAgICdsZWZ0Jzogb3JpZW50YXRpb25NYXBbc2lkZV1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb29ycy50b3AgKz0gdGhpcy5fb3B0aW9ucy5vZmZzZXRZO1xuICAgICAgICBjb29ycy5sZWZ0ICs9IHRoaXMuX29wdGlvbnMub2Zmc2V0WDtcblxuICAgICAgICB0aGlzLnRhcmdldC5zdHlsZS50b3AgPSBjb29ycy50b3AgKyAncHgnO1xuICAgICAgICB0aGlzLnRhcmdldC5zdHlsZS5sZWZ0ID0gY29vcnMubGVmdCArICdweCc7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgUG9zaXRpb25lcjtcbiIsImltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAndGlueS5qcy9saWIvZXZlbnRFbWl0dGVyJztcblxudmFyIHJlc2l6ZWQgPSBmYWxzZSxcbiAgICBzY3JvbGxlZCA9IGZhbHNlLFxuICAgIHJlcXVlc3RBbmltRnJhbWUgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MCk7XG4gICAgICAgICAgICB9O1xuICAgIH0oKSk7XG5cbmZ1bmN0aW9uIHVwZGF0ZSgpIHtcblxuICAgIHZhciBldmUgPSAocmVzaXplZCA/IHRpbnkub25yZXNpemUgOiB0aW55Lm9uc2Nyb2xsKTtcblxuICAgIC8vIFJlZnJlc2ggdmlld3BvcnRcbiAgICB0aGlzLnJlZnJlc2goKTtcblxuICAgIC8vIENoYW5nZSBzdGF0dXNcbiAgICByZXNpemVkID0gZmFsc2U7XG4gICAgc2Nyb2xsZWQgPSBmYWxzZTtcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGVtaXR0ZWQgd2hlbiB0aGUgZGltZW5zaW9ucyBvZiB0aGUgdmlld3BvcnQgY2hhbmdlcy5cbiAgICAgKiBAZXZlbnQgdmlld3BvcnQjcmVzaXplXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiB2aWV3cG9ydC5vbigncmVzaXplJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgKiAgICAgLy8gU29tZSBjb2RlIGhlcmUhXG4gICAgICAgICAqIH0pO1xuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogRXZlbnQgZW1pdHRlZCB3aGVuIHRoZSB2aWV3cG9ydCBpcyBzY3JvbGxlZC5cbiAgICAgKiBAZXZlbnQgdmlld3BvcnQjc2Nyb2xsXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiB2aWV3cG9ydC5vbignc2Nyb2xsJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgKiAgICAgLy8gU29tZSBjb2RlIGhlcmUhXG4gICAgICAgICAqIH0pO1xuICAgICAqL1xuXG4gICAgICAgIC8vIEVtaXRzIHRoZSBjdXJyZW50IGV2ZW50XG4gICAgdGhpcy5lbWl0KGV2ZSk7XG59XG5cbi8qKlxuICogVGhlIFZpZXdwb3J0IGlzIGEgY29tcG9uZW50IHRvIGVhc2Ugdmlld3BvcnQgbWFuYWdlbWVudC4gWW91IGNhbiBnZXQgdGhlIGRpbWVuc2lvbnMgb2YgdGhlIHZpZXdwb3J0IGFuZCBiZXlvbmQsIHdoaWNoIGNhbiBiZSBxdWl0ZSBoZWxwZnVsIHRvIHBlcmZvcm0gc29tZSBjaGVja3Mgd2l0aCBKYXZhU2NyaXB0LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAYXVnbWVudHMgdGlueS5FdmVudEVtaXR0ZXJcbiAqIEByZXR1cm5zIHt2aWV3cG9ydH0gUmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiBWaWV3cG9ydC5cbiAqL1xuY2xhc3MgVmlld3BvcnQgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5faW5pdCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYSBuZXcgaW5zdGFuY2Ugb2YgVmlld3BvcnQuXG4gICAgICogQG1lbWJlcm9mISBWaWV3cG9ydC5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEByZXR1cm5zIHt2aWV3cG9ydH1cbiAgICAgKi9cbiAgICBfaW5pdCAoKSB7XG4gICAgICAgIC8vIFNldCBlbWl0dGVyIHRvIHplcm8gZm9yIHVubGltaXRlZCBsaXN0ZW5lcnMgdG8gYXZvaWQgdGhlIHdhcm5pbmcgaW4gY29uc29sZVxuICAgICAgICAvLyBAc2VlIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvZXZlbnRzLmh0bWwjZXZlbnRzX2VtaXR0ZXJfc2V0bWF4bGlzdGVuZXJzX25cbiAgICAgICAgdGhpcy5zZXRNYXhMaXN0ZW5lcnMoMCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlZmVyZW5jZSB0byBjb250ZXh0IG9mIGFuIGluc3RhbmNlLlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbGVtZW50IHJlcHJlc2VudGluZyB0aGUgdmlzaWJsZSBhcmVhLlxuICAgICAgICAgKiBAbWVtYmVyb2YhIHZpZXdwb3J0I2VsZW1lbnRcbiAgICAgICAgICogQHR5cGUge09iamVjdH1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZWwgPSB3aW5kb3c7XG5cbiAgICAgICAgdGhpcy5yZWZyZXNoKCk7XG5cblxuICAgICAgICBmdW5jdGlvbiB2aWV3cG9ydFJlc2l6ZSgpIHtcbiAgICAgICAgICAgIC8vIE5vIGNoYW5naW5nLCBleGl0XG4gICAgICAgICAgICBpZiAoIXJlc2l6ZWQpIHtcbiAgICAgICAgICAgICAgICByZXNpemVkID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHJlcXVlc3RBbmltRnJhbWUoZnVuY3Rpb24gdXBkYXRlUmVzaXplKCkge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGUuY2FsbCh0aGF0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHZpZXdwb3J0U2Nyb2xsKCkge1xuICAgICAgICAgICAgLy8gTm8gY2hhbmdpbmcsIGV4aXRcbiAgICAgICAgICAgIGlmICghc2Nyb2xsZWQpIHtcbiAgICAgICAgICAgICAgICBzY3JvbGxlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgKiByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICByZXF1ZXN0QW5pbUZyYW1lKGZ1bmN0aW9uIHVwZGF0ZVNjcm9sbCgpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlLmNhbGwodGhhdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcih0aW55Lm9uc2Nyb2xsLCB2aWV3cG9ydFNjcm9sbCwgZmFsc2UpO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcih0aW55Lm9ucmVzaXplLCB2aWV3cG9ydFJlc2l6ZSwgZmFsc2UpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzL3VwZGF0ZXMgdGhlIGNsaWVudCByZWN0cyBvZiB2aWV3cG9ydCAoaW4gcGl4ZWxzKS5cbiAgICAgKiBAbWVtYmVyb2YhIFZpZXdwb3J0LnByb3RvdHlwZVxuICAgICAqIEBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHt2aWV3cG9ydH1cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFVwZGF0ZSB0aGUgY2xpZW50IHJlY3RzIG9mIHRoZSB2aWV3cG9ydC5cbiAgICAgKiB2aWV3cG9ydC5jYWxjdWxhdGVDbGllbnRSZWN0KCk7XG4gICAgICovXG4gICAgY2FsY3VsYXRlQ2xpZW50UmVjdCAoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgY3VycmVudCB0b3AgY2xpZW50IHJlY3Qgb2YgdGhlIHZpZXdwb3J0IChpbiBwaXhlbHMpLlxuICAgICAgICAgKiBAcHVibGljXG4gICAgICAgICAqIEBuYW1lIFZpZXdwb3J0I3RvcFxuICAgICAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiAvLyBDaGVja3MgaWYgdGhlIHRvcCBjbGllbnQgcmVjdCBvZiB0aGUgdmlld3BvcnQgaXMgZXF1YWwgdG8gMC5cbiAgICAgICAgICogKHZpZXdwb3J0LnRvcCA9PT0gMCkgPyAnWWVzJzogJ05vJztcbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBjdXJyZW50IGxlZnQgY2xpZW50IHJlY3Qgb2YgdGhlIHZpZXdwb3J0IChpbiBwaXhlbHMpLlxuICAgICAgICAgKiBAcHVibGljXG4gICAgICAgICAqIEBuYW1lIFZpZXdwb3J0I2xlZnRcbiAgICAgICAgICogQHR5cGUge051bWJlcn1cbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gQ2hlY2tzIGlmIHRoZSBsZWZ0IGNsaWVudCByZWN0IG9mIHRoZSB2aWV3cG9ydCBpcyBlcXVhbCB0byAwLlxuICAgICAgICAgKiAodmlld3BvcnQubGVmdCA9PT0gMCkgPyAnWWVzJzogJ05vJztcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudG9wID0gdGhpcy5sZWZ0ID0gMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIGN1cnJlbnQgYm90dG9tIGNsaWVudCByZWN0IG9mIHRoZSB2aWV3cG9ydCAoaW4gcGl4ZWxzKS5cbiAgICAgICAgICogQHB1YmxpY1xuICAgICAgICAgKiBAbmFtZSBWaWV3cG9ydCNib3R0b21cbiAgICAgICAgICogQHR5cGUge051bWJlcn1cbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gQ2hlY2tzIGlmIHRoZSBib3R0b20gY2xpZW50IHJlY3Qgb2YgdGhlIHZpZXdwb3J0IGlzIGVxdWFsIHRvIGEgbnVtYmVyLlxuICAgICAgICAgKiAodmlld3BvcnQuYm90dG9tID09PSA5MDApID8gJ1llcyc6ICdObyc7XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmJvdHRvbSA9IE1hdGgubWF4KHRoaXMuZWwuaW5uZXJIZWlnaHQgfHwgMCwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBjdXJyZW50IHJpZ2h0IGNsaWVudCByZWN0IG9mIHRoZSB2aWV3cG9ydCAoaW4gcGl4ZWxzKS5cbiAgICAgICAgICogQHB1YmxpY1xuICAgICAgICAgKiBAbmFtZSBWaWV3cG9ydCNyaWdodFxuICAgICAgICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgKiAvLyBDaGVja3MgaWYgdGhlIHJpZ2h0IGNsaWVudCByZWN0IG9mIHRoZSB2aWV3cG9ydCBpcyBlcXVhbCB0byBhIG51bWJlci5cbiAgICAgICAgICogKHZpZXdwb3J0LmJvdHRvbSA9PT0gMTIwMCkgPyAnWWVzJzogJ05vJztcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMucmlnaHQgPSBNYXRoLm1heCh0aGlzLmVsLmlubmVyV2lkdGggfHwgMCwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoKTtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcy91cGRhdGVzIHRoZSBkaW1lbnNpb25zICh3aWR0aCBhbmQgaGVpZ2h0KSBvZiB0aGUgdmlld3BvcnQgKGluIHBpeGVscykuXG4gICAgICogQG1lbWJlcm9mISBWaWV3cG9ydC5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7dmlld3BvcnR9XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBVcGRhdGUgdGhlIGRpbWVuc2lvbnMgdmFsdWVzIG9mIHRoZSB2aWV3cG9ydC5cbiAgICAgKiB2aWV3cG9ydC5jYWxjdWxhdGVEaW1lbnNpb25zKCk7XG4gICAgICovXG4gICAgY2FsY3VsYXRlRGltZW5zaW9ucyAoKSB7XG4gICAgICAgIHRoaXMuY2FsY3VsYXRlQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgY3VycmVudCBoZWlnaHQgb2YgdGhlIHZpZXdwb3J0IChpbiBwaXhlbHMpLlxuICAgICAgICAgKiBAcHVibGljXG4gICAgICAgICAqIEBuYW1lIFZpZXdwb3J0I2hlaWdodFxuICAgICAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gQ2hlY2tzIGlmIHRoZSBoZWlnaHQgb2YgdGhlIHZpZXdwb3J0IGlzIGVxdWFsIHRvIGEgbnVtYmVyLlxuICAgICAgICAgKiAodmlld3BvcnQuaGVpZ2h0ID09PSA3MDApID8gJ1llcyc6ICdObyc7XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLmhlaWdodCA9IHRoaXMuYm90dG9tO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgY3VycmVudCB3aWR0aCBvZiB0aGUgdmlld3BvcnQgKGluIHBpeGVscykuXG4gICAgICAgICAqIEBwdWJsaWNcbiAgICAgICAgICogQG5hbWUgVmlld3BvcnQjd2lkdGhcbiAgICAgICAgICogQHR5cGUgTnVtYmVyXG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIC8vIENoZWNrcyBpZiB0aGUgaGVpZ2h0IG9mIHRoZSB2aWV3cG9ydCBpcyBlcXVhbCB0byBhIG51bWJlci5cbiAgICAgICAgICogKHZpZXdwb3J0LndpZHRoID09PSAxMjAwKSA/ICdZZXMnOiAnTm8nO1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy53aWR0aCA9IHRoaXMucmlnaHQ7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZXMvdXBkYXRlcyB0aGUgdmlld3BvcnQgcG9zaXRpb24uXG4gICAgICogQG1lbWJlcm9mISBWaWV3cG9ydC5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7dmlld3BvcnR9XG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBVcGRhdGUgdGhlIG9mZmVzdCB2YWx1ZXMgb2YgdGhlIHZpZXdwb3J0LlxuICAgICAqIHZpZXdwb3J0LmNhbGN1bGF0ZU9mZnNldCgpO1xuICAgICAqL1xuICAgIGNhbGN1bGF0ZU9mZnNldCAoKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlZmVyZW5jZSB0byBjb250ZXh0IG9mIGFuIGluc3RhbmNlLlxuICAgICAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdmFyIHNjcm9sbCA9IHRpbnkuc2Nyb2xsKCk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRoZSBvZmZzZXQgdG9wIG9mIHRoZSB2aWV3cG9ydC5cbiAgICAgICAgICogQG1lbWJlcm9mISBWaWV3cG9ydCNvZmZzZXRUb3BcbiAgICAgICAgICogQHR5cGUge051bWJlcn1cbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gQ2hlY2tzIGlmIHRoZSBvZmZzZXQgdG9wIG9mIHRoZSB2aWV3cG9ydCBpcyBlcXVhbCB0byBhIG51bWJlci5cbiAgICAgICAgICogKHZpZXdwb3J0Lm9mZnNldFRvcCA9PT0gMjAwKSA/ICdZZXMnOiAnTm8nO1xuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5vZmZzZXRUb3AgPSBzY3JvbGwudG9wO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgb2Zmc2V0IGxlZnQgb2YgdGhlIHZpZXdwb3J0LlxuICAgICAgICAgKiBAbWVtYmVyb2YhIFZpZXdwb3J0I29mZnNldExlZnRcbiAgICAgICAgICogQHR5cGUge051bWJlcn1cbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gQ2hlY2tzIGlmIHRoZSBvZmZzZXQgbGVmdCBvZiB0aGUgdmlld3BvcnQgaXMgZXF1YWwgdG8gYSBudW1iZXIuXG4gICAgICAgICAqICh2aWV3cG9ydC5vZmZzZXRMZWZ0ID09PSAyMDApID8gJ1llcyc6ICdObyc7XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLm9mZnNldExlZnQgPSBzY3JvbGwubGVmdDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVGhlIG9mZnNldCByaWdodCBvZiB0aGUgdmlld3BvcnQuXG4gICAgICAgICAqIEBtZW1iZXJvZiEgVmlld3BvcnQjb2Zmc2V0UmlnaHRcbiAgICAgICAgICogQHR5cGUge051bWJlcn1cbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogLy8gQ2hlY2tzIGlmIHRoZSBvZmZzZXQgcmlnaHQgb2YgdGhlIHZpZXdwb3J0IGlzIGVxdWFsIHRvIGEgbnVtYmVyLlxuICAgICAgICAgKiAodmlld3BvcnQub2Zmc2V0UmlnaHQgPT09IDIwMCkgPyAnWWVzJzogJ05vJztcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMub2Zmc2V0UmlnaHQgPSB0aGlzLmxlZnQgKyB0aGlzLndpZHRoO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgb2Zmc2V0IGJvdHRvbSBvZiB0aGUgdmlld3BvcnQuXG4gICAgICAgICAqIEBtZW1iZXJvZiEgVmlld3BvcnQjb2Zmc2V0Qm90dG9tXG4gICAgICAgICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIC8vIENoZWNrcyBpZiB0aGUgb2Zmc2V0IGJvdHRvbSBvZiB0aGUgdmlld3BvcnQgaXMgZXF1YWwgdG8gYSBudW1iZXIuXG4gICAgICAgICAqICh2aWV3cG9ydC5vZmZzZXRCb3R0b20gPT09IDIwMCkgPyAnWWVzJzogJ05vJztcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMub2Zmc2V0Qm90dG9tID0gdGhpcy5vZmZzZXRUb3AgKyB0aGlzLmhlaWdodDtcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogUmVydHVucy91cGRhdGVzIHRoZSB2aWV3cG9ydCBvcmllbnRhdGlvbjogbGFuZHNjYXBlIG9yIHBvcnRyYWl0LlxuICAgICAqIEBtZW1iZXJvZiEgVmlld3BvcnQucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge3ZpZXdwb3J0fVxuICAgICAqIEBleGFtcGxlXG4gICAgICogLy8gVXBkYXRlIHRoZSBkaW1lbnNpb25zIHZhbHVlcyBvZiB0aGUgdmlld3BvcnQuXG4gICAgICogdmlld3BvcnQuY2FsY3VsYXRlRGltZW5zaW9ucygpO1xuICAgICAqL1xuICAgIGNhbGN1bGF0ZU9yaWVudGF0aW9uICgpIHtcbiAgICAgICAgLyoqIFRoZSB2aWV3cG9ydCBvcmllbnRhdGlvbjogbGFuZHNjYXBlIG9yIHBvcnRyYWl0LlxuICAgICAgICAgKiBAbWVtYmVyb2YhIFZpZXdwb3J0I29yaWVudGF0aW9uXG4gICAgICAgICAqIEB0eXBlIHtTdHJpbmd9XG4gICAgICAgICAqIEBleGFtcGxlXG4gICAgICAgICAqIC8vIENoZWNrcyBpZiB0aGUgb3JpZW50YXRpb24gaXMgXCJsYW5kc2NhcGVcIi5cbiAgICAgICAgICogKHZpZXdwb3J0Lm9yaWVudGF0aW9uID09PSAnbGFuZHNjYXBlJykgPyAnWWVzJzogJ05vJztcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMub3JpZW50YXRpb24gPSAoTWF0aC5hYnModGhpcy5lbC5vcmllbnRhdGlvbikgPT09IDkwKSA/ICdsYW5kc2NhcGUnIDogJ3BvcnRyYWl0JztcblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyBpZiBhbiBlbGVtZW50IGlzIGNvbXBsZXRlbHkgbG9jYXRlZCBpbiB0aGUgdmlld3BvcnQuXG4gICAgICogQG1lbWJlcm9mISBWaWV3cG9ydC5wcm90b3R5cGVcbiAgICAgKiBAZnVuY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7Qm9vbGVhbn1cbiAgICAgKiBAcGFyYW1zIHtIVE1MRWxlbWVudH0gZWwgQSBnaXZlbiBITVRMRWxlbWVudC5cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIENoZWNrcyBpZiBhbiBlbGVtZW50IGlzIGluIHRoZSB2aWV3cG9ydC5cbiAgICAgKiB2aWV3cG9ydC5pblZpZXdwb3J0KEhUTUxFbGVtZW50KSA/ICdZZXMnOiAnTm8nO1xuICAgICAqL1xuICAgIGluVmlld3BvcnQgKGVsKSB7XG4gICAgICAgIHZhciByID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICAgICAgcmV0dXJuIChyLnRvcCA+IDApICYmIChyLnJpZ2h0IDwgdGhpcy53aWR0aCkgJiYgKHIuYm90dG9tIDwgdGhpcy5oZWlnaHQpICYmIChyLmxlZnQgPiAwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyBpZiBhbiBlbGVtZW50IGlzIHZpc2libGUgaW4gdGhlIHZpZXdwb3J0LlxuICAgICAqIEBtZW1iZXJvZiEgVmlld3BvcnQucHJvdG90eXBlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICogQHJldHVybnMge0Jvb2xlYW59XG4gICAgICogQHBhcmFtcyB7SFRNTEVsZW1lbnR9IGVsIEEgZ2l2ZW4gSFRNTEVsZW1lbnQuXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiAvLyBDaGVja3MgaWYgYW4gZWxlbWVudCBpcyB2aXNpYmxlLlxuICAgICAqIHZpZXdwb3J0LmlzVmlzaXNibGUoSFRNTEVsZW1lbnQpID8gJ1llcyc6ICdObyc7XG4gICAgICovXG4gICAgaXNWaXNpYmxlIChlbCkge1xuICAgICAgICB2YXIgciA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG4gICAgICAgIHJldHVybiAoci5oZWlnaHQgPj0gdGhpcy5vZmZzZXRUb3ApO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBVcGFkdGVzIHRoZSB2aWV3cG9ydCBkaW1lbnNpb24sIHZpZXdwb3J0IHBvc2l0aW9ucyBhbmQgb3JpZXRhdGlvbi5cbiAgICAgKiBAbWVtYmVyb2YhIFZpZXdwb3J0LnByb3RvdHlwZVxuICAgICAqIEBmdW5jdGlvblxuICAgICAqIEByZXR1cm5zIHt2aWV3cG9ydH1cbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIC8vIFJlZnJlc2hzIHRoZSB2aWV3cG9ydC5cbiAgICAgKiB2aWV3cG9ydC5yZWZyZXNoKCk7XG4gICAgICovXG4gICAgcmVmcmVzaCAoKSB7XG4gICAgICAgIHRoaXMuY2FsY3VsYXRlRGltZW5zaW9ucygpO1xuICAgICAgICB0aGlzLmNhbGN1bGF0ZU9mZnNldCgpO1xuICAgICAgICB0aGlzLmNhbGN1bGF0ZU9yaWVudGF0aW9uKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxufVxuXG5sZXQgdmlld3BvcnQgPSBuZXcgVmlld3BvcnQoKTtcblxuZXhwb3J0IGRlZmF1bHQgdmlld3BvcnQ7XG4iXX0=
