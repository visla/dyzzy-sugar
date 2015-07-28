var gmailCollector = require('./gmail-collector');

// start collecting data.
exports.start = function(callback) {
    gmailCollector.startGmailCollection(callback);

}