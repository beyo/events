/**
Exceptions
*/

var errorFactory = require('error-factory');

/**
Expose EventException
*/
module.exports.EventException = errorFactory('EventException', [ 'message', 'messageData' ]);
