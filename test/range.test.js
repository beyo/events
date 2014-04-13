
var events = require('../lib/events');

describe('Test EventEmitter', function () {

  it('should expose module properties', function () {
    events.should.have.ownProperty('EventEmitter').and.be.a.Function;
  });

  it('should have a valid API', function () {
    var eventEmitter = new events.EventEmitter();

    ['on', 'once', 'off', 'clear', 'listeners', 'emit'].forEach(function (method) {
      eventEmitter.should.have.ownProperty(method).and.be.a.Function.and.have.property('name').and.equal(method);
    });
  });

  it('should emit basic events', function (done) {
    var eventEmitter = new events.EventEmitter();
    var testAsync = 0;

    this.timeout(200);

    eventEmitter.on('foo', function (a, b, c) {
      arguments.should.have.lengthOf(3);
      a.should.be.equal('a');
      b.should.be.equal('b');
      c.should.be.equal('c');

      testAsync.should.equal(1);
      eventEmitter.emit('bar', 1, 2);
      testAsync.should.equal(1);
      testAsync++;
    });
    eventEmitter.on('bar', function (a, b) {
      arguments.should.have.lengthOf(2);
      a.should.be.equal(1);
      b.should.be.equal(2);

      testAsync.should.equal(2);

      done();
    });

    testAsync.should.equal(0);
    eventEmitter.emit('foo', 'a', 'b', 'c');
    testAsync.should.equal(0);
    testAsync++;
  });

  it('should emit basic events (sync)', function () {
    var eventEmitter = new events.EventEmitter();
    var testSync = 0;

    this.timeout(200);

    eventEmitter.on('foo', function (a, b, c) {
      arguments.should.have.lengthOf(3);
      a.should.be.equal('a');
      b.should.be.equal('b');
      c.should.be.equal('c');

      testSync.should.equal(0);
      eventEmitter.emitSync('bar', 1, 2);
      testSync.should.equal(1);
      testSync++;
    });
    eventEmitter.on('bar', function (a, b) {
      arguments.should.have.lengthOf(2);
      a.should.be.equal(1);
      b.should.be.equal(2);

      testSync.should.equal(0);
      testSync++;
    });

    testSync.should.equal(0);
    eventEmitter.emitSync('foo', 'a', 'b', 'c');
    testSync.should.equal(2);
  });

  it('should call in sequence', function (done) {
    var eventEmitter = new events.EventEmitter();
    var testAsync = [];

    this.timeout(200);

    eventEmitter.on('foo', function (val) {
      testAsync.push(val);
    });

    eventEmitter.on('done', function () {
      testAsync.should.eql([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      done();
    });

    for (var i = 0; i <= 10; ++i) {
      eventEmitter.emit('foo', i);
    }

    testAsync.should.be.empty;

    eventEmitter.emit('done');
  });

  it('should add with valid range', function (done) {
    var eventEmitter = new events.EventEmitter();
    var eventCount = 0;
    var validRangeCount = 0;

    this.timeout(200);

    eventEmitter.on('foo:1-10,10-20', function (val, range) {
      range && console.log(val, range);
      val.should.be.true;

      ++eventCount;
    });
    eventEmitter.on('complete', function () {
      eventCount.should.equal(validRangeCount);

      done();
    });

    [
      '1', '1-10', '10-4', '18-20', '20',
      '1-2,4-10', '1,3,4,5', '10-11,13,15,17-19',
      '*-1', '*-10', '*-3,*-10,*-16'
    ].forEach(function (validRange) {
      ++validRangeCount;
      eventEmitter.emit('foo:' + validRange, true);
    });

    [
      '0', '0-1', '100', '9-21', '-1-1', '1--1',
      '*-0', '21-*',
      '2,4,7,10,23', '5-10,12-22'
    ].forEach(function (invalidRange) {
      eventEmitter.emit('foo:' + invalidRange, false, invalidRange);
    });

    eventCount.should.equal(0);

    eventEmitter.emit('complete');
  });

  it('should listen only once', function (done) {
    var eventEmitter = new events.EventEmitter();
    var eventCount = 0

    this.timeout(200);

    eventEmitter.on('complete', function () {
      eventCount.should.be.equal(1);

      done();
    });

    eventEmitter.once('foo:1-10', function () {
      ++eventCount;
    });

    eventEmitter.emit('foo:3');
    eventEmitter.emit('foo:3');
    eventEmitter.emit('complete');

  });

  it('should listen a limited amount of times', function (done) {
    var eventEmitter = new events.EventEmitter();
    var eventCount = 0
    var eventTotalCount = 10;

    this.timeout(200);

    eventEmitter.on('complete', function () {
      eventCount.should.be.equal(eventTotalCount);

      done();
    });

    eventEmitter.on('foo', eventTotalCount, function () {
      ++eventCount;
    });

    for (var i = 0; i < 50; i++) {
      eventEmitter.emit('foo');
    }

    eventEmitter.emit('complete');
  });

  it('should handle wildcards in event name', function (done) {
    var eventEmitter = new events.EventEmitter();
    var stack = [];

    this.timeout(200);

    eventEmitter.on('complete', function () {
      stack.should.be.eql(['foo.bar', 'foo.*', '*.bar', '*.*']);

      done();
    });

    [
      'foo.bar', 'foo.*',
      '*.bar', '*.*'
    ].forEach(function (event) {
      eventEmitter.once(event, function () {
        stack.push(event);
      });
    });

    eventEmitter.emit('foo.bar');

    eventEmitter.emit('complete');
  });

  it('should emit with wildcard', function (done) {
    var eventEmitter = new events.EventEmitter();
    var stack = [];

    this.timeout(200);

    eventEmitter.on('test', function (expected) {
      stack.should.be.eql(expected);
      stack = [];
    });
    eventEmitter.on('complete', function () {
      done();
    });

    [
      'event.foo', 'event.bar', 'event.buz',
      'other.foo', 'other.bar', 'other.buz'
    ].forEach(function (event) {
      eventEmitter.on(event, function () {
        stack.push(event);
      });
    });

    eventEmitter.emit('event.*');
    eventEmitter.emit('test', [ 'event.foo', 'event.bar', 'event.buz' ]);
    eventEmitter.emit('*.foo');
    eventEmitter.emit('test', [ 'event.foo', 'other.foo' ]);
    eventEmitter.emit('complete');

  });


});
