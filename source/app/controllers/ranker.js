'use strict';

var math = require('mathjs');

var countDiffWeight = .2;
var loneCountWeight = .2;
var nullScore = .1;
var currentDate = new Date();

exports.getScore = function(emailData) {
    var sum = 0;

    sum += processCountDiff(emailData.receivedCount - emailData.sentCount);
    sum += emailData.ccSentCount === 0 ? nullScore : processLoneCounts(emailData.ccSentCount);
    sum += emailData.lastSentEmail ? processDates(emailData.lastSentEmail) : nullScore;
    sum += emailData.lastCCEmail ? processDates(emailData.lastCCEmail) : nullScore;
    sum += emailData.lastReceivedEmail ? processDates(emailData.lastReceivedEmail) : nullScore;

    return sum;
};

var processCountDiff = function(score) {
    return countDiffWeight*math.pow(math.e, -math.pow(score/2, 2));
};

var processLoneCounts = function(score) {
    if (score == 0) {
        return 0;
    }

    return 2*loneCountWeight*math.atan(score)/math.pi;
};

var processDates = function (dateString) {
    var processDate = new Date(dateString);
    var diff = math.abs(currentDate.getDay() - processDate.getDay());
    return loneCountWeight*math.pow(math.e, -diff/2);
};