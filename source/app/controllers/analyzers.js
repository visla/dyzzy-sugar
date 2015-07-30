'use strict';
var frequencyAnalyzer = require('./frequency-analyzer');
var sugarAnalyzer = require('./sugar-analyzer');
// start collecting data.
exports.start = function(callback) {
    frequencyAnalyzer.start(function(){
    	sugarAnalyzer.start(callback);
    });
};