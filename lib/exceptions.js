/**
Exceptions
*/

var errorFactory = require('error-factory');

/**
Expose EventException
*/
module.exports.EventException = errorFactory('beyo.events.EventException', [ 'message', 'messageData' ]);
