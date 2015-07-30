'use strict';

var math = require('mathjs');

var countDiffWeight = .1;
var loneCountWeight = .2;
var nullScore = .1;
var currentDate = new Date();

exports.getScore = function(emailData) {
    var sum = 0;

    sum += processCountDiff(emailData.sentCount, emailData.receivedCount);
    sum += emailData.ccSentCount === 0 ? nullScore : processLoneCounts(emailData.ccSentCount);
    sum += emailData.lastSentEmail ? processDates(emailData.lastSentEmail) : nullScore;
    sum += emailData.lastCCEmail ? processDates(emailData.lastCCEmail) : nullScore;
    sum += emailData.lastReceivedEmail ? processDates(emailData.lastReceivedEmail) : nullScore;

    return sum;
};

var processCountDiff = function(sent, received) {
    var total = sent + received;
    var diff = math.abs(sent - received);
    var score = math.pow(math.e, -math.pow(diff/2, 2) + sent/total + received/total);
    return countDiffWeight*score;
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