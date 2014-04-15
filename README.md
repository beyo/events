# Beyo Events

Advanced events emitter.


## Features

* Consistent API with Node's `EventEmitter` module
* Trie event emitter with wildcards
* Using range matches with wildcards
* Asynchronous and synchronous events emitting
* Adding multiple listeners to the same event
* Listener countdown


## Install

```
npm install beyo-events --save
```


## Usage

### Simple EventEmitter replacement

```javascript
var EventEmitter = require('beyo-events').EventEmitter;

var events = new EventEmitter();

events.on('foo', function (param1, param2, param3) {
  console.log('Hello!', param1, param2, param3);
});

events.emit('foo', 1, 2, 3);
```


### Using event wildcards

```javascript
var EventEmitter = require('beyo-events').EventEmitter;

var events = new EventEmitter();

events.on('project.modules.a.foo', moduleAfooCallback);
events.on('project.modules.b.foo', moduleBfooCallback);

events.emit('project.modules.*.foo');
```


### Using range identifiers

```javascript
var EventEmitter = require('beyo-events').EventEmitter;

var events = new EventEmitter();

events.on('user.update:1-100', legacySaveCallback);
events.on('user.update:101-*', newSaveCallback);

// user.id = 1234
events.emit('user.update:' + user.id, user);   // triggers newSaveCallback
```

### Once and other listener countdown

```javascript
var EventEmitter = require('beyo-events').EventEmitter;

var events = new EventEmitter();

// listen an "unlimited" amount of time
events.on('foo', function () { });

// listen once, then remove itself automatically
events.once('foo', function () { });

// .... same as
events.on('foo', 1, function () { });

// listen 10 times, then remove itself
events.on('foo', 10, function () { });

```


## Contribution

All contributions welcome! Every PR **must** be accompanied by their associated
unit tests!


## License

The MIT License (MIT)

Copyright (c) 2014 Mind2Soft <yanick.rochon@mind2soft.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
