'use strict';

var _ = require('underscore');
var fs = require('fs');

var frequency = {};

exports.startProcessing = function() {
    frequency = {};
};

exports.stopProcessing = function() {
    // filter out sentCount = 0;
    var newFrequency = [];
    _.each(frequency, function(emailItem, key) {
        _.each(emailItem, function(relationItem, key2) {
            if (relationItem.sentCount > 0 &&
                key2 !== key &&
                relationItem.receivedCount > 0) {
                if (!newFrequency[key]) {
                    newFrequency[key] = {};
                }

                relationItem.sourceEmail = key;
                relationItem.relatedEmail = key2;
                newFrequency.push(relationItem);
            }
        });
    });

    frequency = newFrequency;
    console.log(frequency);
    fs.writeFileSync(__dirname + '/frequency-counter.txt', JSON.stringify(frequency));

};

exports.processInput = function(email, isSent, input) {
    if (!frequency[email]) {
        frequency[email] = {};
    }

    _.each(input, function(emailHeader) {
        var toAddressArray = emailHeader.to ? emailHeader.to : [];
        var fromAddressArray = emailHeader.from ? emailHeader.from : [];
        var ccArray = emailHeader.cc ? emailHeader.cc : [];

        if (isSent) {
            toAddressArray.forEach(function(to) {
                if (frequency[email][to.address]) {
                    frequency[email][to.address].sentCount++;
                    var date = new Date(emailHeader.date);
                    if (date > frequency[email][to.address].lastSentEmail) {
                        frequency[email][to.address].lastSentEmail = date;
                    }
                } else {
                    frequency[email][to.address] = {
                        relatedName: to.name,
                        receivedCount: 0,
                        sentCount: 1,
                        ccSentCount: 0,
                        lastCCEmail: null,
                        lastReceivedEmail: null,
                        lastSentEmail: new Date(emailHeader.date)
                    };
                }
            });

            ccArray.forEach(function(cc) {
                if (frequency[email][cc.address]) {
                    frequency[email][cc.address].ccSentCount++;
                    var date = new Date(emailHeader.date);
                    if (date > frequency[email][cc.address].lastCCEmail) {
                        frequency[email][cc.address].lastCCEmail = date;
                    }
                } else {
                    frequency[email][cc.address] = {
                        relatedName: cc.name,
                        receivedCount: 0,
                        sentCount: 0,
                        ccSentCount: 1,
                        lastReceivedEmail: null,
                        lastSentEmail: null,
                        lastCCEmail: new Date(emailHeader.date)
                    };
                }
            });
        } else {
            fromAddressArray.forEach(function(from) {
                if (frequency[email][from.address]) {
                    frequency[email][from.address].receivedCount++;
                    var date = new Date(emailHeader.date);
                    if (date > frequency[email][from.address].lastReceivedEmail) {
                        frequency[email][from.address].lastReceivedEmail = date;
                    }
                } else {
                    frequency[email][from.address] = {
                        relatedName: from.name,
                        receivedCount: 1,
                        sentCount: 0,
                        ccSentCount: 0,
                        lastSentEmail: null,
                        lastCCEmail: null,
                        lastReceivedEmail: new Date(emailHeader.date)
                    };
                }
            });
        }
    });
};