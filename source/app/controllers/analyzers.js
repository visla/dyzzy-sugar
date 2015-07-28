'use strict';
var frequencyAnalyzer = require('./frequency-analyzer');

// start collecting data.
exports.start = function(callback) {
    frequencyAnalyzer.start(callback);
};