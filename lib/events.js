
//const DEBUG = false;
//function log() {
//  if (DEBUG) {
//    console.log.apply(console, arguments);
//  }
//}

const EVT_PATH_PATTERN = /^(\*|[a-z]\w*)(\.(\*|[a-z]\w*))*$/i;
const EVT_RANGE_PATTERN = /^(\*|-?\d+)(-(\*|-?\d+))?(,(\*|-?\d+)(-(\*|-?\d+))?)*$/;

const RANGE_ITEM_PATTERN = /^(\*|-?\d+)(?:-(\*|-?\d+))?$/;

var EventException = require('./exceptions').EventException;
var slice = Array.prototype.slice;


module.exports.EventEmitter = EventEmitter;


function EventEmitter() {
  var _events = {};

  Object.defineProperties(this, {
    'on': {
      enumerable: true,
      value: function () {
        return function on(event, listener) {
          var ttl = Number.MAX_VALUE;

          if (arguments.length >= 3) {
            ttl = listener;
            listener = arguments[2];
          }

          return addListener(_events, event, listener, ttl);
        };
      }()
    },
    'once': {
      enumerable: true,
      value: function () {
        return function once(event, listener) {
          return addListener(_events, event, listener, 1);
        };
      }()
    },
    'off': {
      enumerable: true,
      value: function () {
        return function off(event, listener) {
          return removeListener(_events, event, listener);
        };
      }()
    },
    'clear': {
      enumerable: true,
      value: function () {
        return function clear(event) {
          return removeAllListeners(_events, event);
        };
      }()
    },
    'listeners': {
      enumerable: true,
      value: function () {
        return function listeners(event) {
          return getListeners(_events, event);
        };
      }()
    },
    'emit': {
      enumerable: true,
      value: function () {
        return function emit(event) {
          var eventArgs = slice.call(arguments, 1);

          return emitEvent(_events, event, eventArgs);
        };
      }()
    },
    'emitSync': {
      enumerable: true,
      value: function () {
        return function emit(event) {
          var eventArgs = slice.call(arguments, 1);

          return emitEventSync(_events, event, eventArgs);
        };
      }()
    }
  });
}


function addListener(events, event, listener, ttl) {
  var eventData;
  var eventPath;
  var eventRange;
  var evtCtx;

  if (!event) {
    throw EventException('Event msut not be empty', { event: event });
  } else if (typeof event !== 'string') {
    throw EventException('Event msut be a string', { event: event });
  } else if (!(listener instanceof Function)) {
    throw EventException('Listener must be a function', { listener: listener, event: event });
  } else if (typeof ttl !== 'number' || isNaN(ttl)) {
    throw EventException('Event listener time to live invalid', { ttl: ttl, event: event });
  }

  eventData = event.split(':');
  eventPath = eventData[0];
  eventRange = eventData[1] || '*';

  if (!eventPath.match(EVT_PATH_PATTERN)) {
    throw EventException('Invalid event path `{{path}}`', { path: eventPath, event: event });
  } else if (!eventRange.match(EVT_RANGE_PATTERN)) {
    throw EventException('Invalid event range `{{range}}`', { range: eventRange, event: event });
  }

  evtCtx = _createEventContext(events, eventPath);

  evtCtx.__registered = evtCtx.__registered || [];

  evtCtx.__registered.push({
    rawEvent: event,
    eventPath: eventPath,
    rangeValidate: _createEventRangeValidator(eventRange),
    listener: listener,
    ttl: ttl
  });
}

function removeListener(events, event, listener) {
  _processEventContext(events, event, function (registeredListener) {
    return !registeredListener === listener;
  });
}

function removeAllListeners(events, event) {
  _processEventContext(events, event, function (registeredListener) {
    return false;
  });
}

function getListeners(events, event) {
  var listeners = [];

  _processEventContext(events, event, function (listener) {
    listeners.push(listener);
  });

  return listeners;
}

function emitEvent(events, event, eventArgs) {
  _processEventContext(events, event, function (listener) {
    setImmediate(function () {
      listener.apply(null, eventArgs);
    });
  });
}

function emitEventSync(events, event, eventArgs) {
  _processEventContext(events, event, function (listener) {
    listener.apply(null, eventArgs);
  });
}




function _createEventContext(events, eventPath) {
  var ctx = events;
  var path = eventPath.split('.');
  var i = 0;
  var ilen = path.length;

  for (; i < ilen; ++i) {
    if (ctx[path[i]]) {
      ctx = ctx[path[i]];
    } else {
      ctx = ctx[path[i]] = {};
    }
  }

  return ctx;
}

function _createRangeArray(range) {
  var rangeData = String(range || '').split(',');
  var i = 0;
  var ilen = rangeData.length;
  var rangeItem;
  var rangeArray = [];

  for (; i < ilen; ++i) {
    rangeItem = (rangeData[i] || '*').match(RANGE_ITEM_PATTERN);

    if (!rangeItem) {
      throw EventException('Invalid range `{{range}}`', { range: rangeData[i] });
    }

    if (rangeItem[1] === '*') {
      rangeItem[1] = Number.MIN_VALUE;
    } else {
      rangeItem[1] = Number(rangeItem[1]);
    }
    if (rangeItem[2] === '*') {
      rangeItem[2] = Number.MAX_VALUE;
    } else if (rangeItem[2] === undefined) {
      rangeItem[2] = rangeItem[1];
    } else {
      rangeItem[2] = Number(rangeItem[2]);
    }

    rangeArray.push({
      min: Math.min(rangeItem[1], rangeItem[2]),
      max: Math.max(rangeItem[1], rangeItem[2])
    });
  }

  rangeArray.sort(function rangeSorter(a, b) {
    return a.min - b.min;
  });

  for (i = 1; i < rangeArray.length; ++i) {
    if (rangeArray[i].min <= rangeArray[i - 1].max) {
      rangeArray[i - 1].max = rangeArray[i].max;
      rangeArray.splice(i--, 1);
    }
  }

  return rangeArray;
}

/**
Create a range validator. The returned value is a function validating if
a given range matches this range
*/
function _createEventRangeValidator(range) {
  var ctxRange = _createRangeArray(range);

  return function rangeValidator(range) {
    var leftIndex = 0;
    var rightIndex = 0;
    var left;
    var right;

    //log("Validating range", ctxRange, 'with', range);

    for (; leftIndex < ctxRange.length && rightIndex < range.length; ) {
      left = ctxRange[leftIndex];
      right = range[rightIndex];

      //log("Checking", left, 'with', right);

      if (left.max < right.min) {
        //log('Next left', leftIndex, rightIndex);
        ++leftIndex;
      } else if ((left.min <= right.min || left.max >= right.max) &&
                 ((left.min > right.min && (right.min !== Number.MIN_VALUE)) ||
                  (left.max < right.max) && (right.max !== Number.MAX_VALUE))) {
        //log('Invalid range', left, right);
        return false;
      } else {
        //log('Next right', leftIndex, rightIndex);
        ++rightIndex;
      }
    }

    if (rightIndex < range.length) {
      //log('Right range outside left bound', ctxRange, range);
      return false;
    }

    //log('**** Range check successful', ctxRange, range);
    return true;
  };
}


function _processEventContext(events, event, callback) {
  var eventData;
  var eventPath;
  var eventRange;

  if (!event) {
    throw EventException('Event msut not be empty', { event: event });
  } else if (typeof event !== 'string') {
    throw EventException('Event msut be a string', { event: event });
  }

  eventData = event.split(':');
  eventPath = eventData[0];
  eventRange = eventData[1] || '*';

  if (!eventPath.match(EVT_PATH_PATTERN)) {
    throw EventException('Invalid event path `{{path}}`', { path: eventPath, event: event });
  } else if (!eventRange.match(EVT_RANGE_PATTERN)) {
    throw EventException('Invalid event range `{{range}}`', { range: eventRange, event: event });
  }

  eventPath = eventPath.split('.');
  eventRange = _createRangeArray(eventData[1]);

  contextIterator(events, eventPath, 0, eventRange, callback);
}



function contextIterator(ctx, path, pathIndex, range, callback) {
  var keys;
  var key;
  var i;
  var ilen;
  var listener;

  //log("Testing", ctx, "of", path, path.length, '/', pathIndex);

  if (path.length - 1 < pathIndex) {
    //log("found");
    for (var i = 0, ilen = ctx.__registered.length; i < ilen; ++i) {
      key = ctx.__registered[i];
      if (key.rangeValidate(range)) {
        --key.ttl;
        listener = key.listener;
        if (key.ttl <= 0) {
          ctx.__registered.splice(i--, 1); --ilen;
        }
        callback(listener);
      }
    }

    return !ctx.__registered.length;
  } else if (path[pathIndex] === '*') {
    //log("wildcard");
    keys = Object.keys(ctx);

    for (i = 0, ilen = keys.length; i < ilen; ++i) {
      key = keys[i];

      if (contextIterator(ctx[key], path, pathIndex + 1, range, callback)) {
        delete ctx[key];
      }
    }
  } else if (ctx[path[pathIndex]]) {
    //log("match");
    if (contextIterator(ctx[path[pathIndex]], path, pathIndex + 1, range, callback)) {
      delete ctx[path[pathIndex]];
    }

    if (ctx['*']) {
      if (contextIterator(ctx['*'], path, pathIndex + 1, range, callback)) {
        delete ctx['*'];
      }
    }
  }

  return !Object.keys(ctx).length;
}
