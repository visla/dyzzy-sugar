'use strict';

var fs = require('fs');
var _ = require('underscore');
var IMAPClient = require('../lib/imap-client');
var frequencyCounter = require('./frequency-counter');
var async = require('async');

function gotHeaders(email, isSent, data) {
    console.log('Emai fetched:', email, ', count:', data.length);
    frequencyCounter.processInput(email, isSent, data);
}


exports.startGmailCollection = function(mainCallback) {
    console.log('start collecting gmail');
    // Read all entries from gmail.txt
    var access = fs.readFileSync(__dirname + '/gmail.txt').toString('utf8');
    var users = access.split('\n');
    var newUsers = {};
    users.forEach(function(user) {
        var userData = user.split(',');
        if (userData[0]) {
            newUsers[userData[0]] = {
                email: userData[0],
                accessToken: userData[1],
                refreshToken: userData[2],
            };
        }
    });

    users = newUsers;
    console.log(users);

    frequencyCounter.startProcessing();

    async.each(_.values(users), function(user, callback) {
        // Use IMAP Collector
        var options = {
            user: user.email,
            clientId: process.env.GOOGLE_API_CLIENT_ID,
            clientSecret: process.env.GOOGLE_API_CLIENT_SECRET,
            refreshToken: user.refreshToken,
            accessToken: user.accessToken,
            host: 'imap.gmail.com',
            port: '993',
        };

        console.log('Connecting to gmail:', options);

        var imapClient = new IMAPClient(options);
        imapClient.connect(function(err) {
            if (err) {
                console.log('imap auth failed for: ', user.email);
                return;
            }

            console.log('CONNECTED. Fetching starts...');

            // fetch inbox, and then fetch headers.
            imapClient.fetchHeadersSinceDate(
                '[Gmail]/All Mail',
                new Date(2015, 0, 1),
                {
                    fetchChunkSize: 1000
                },
                gotHeaders.bind(this, user.email, false),
                function end(err) {
                    if (err) {
                        console.log('End sent in error:', err);
                    }

                    console.log('inbox end');

                    imapClient.fetchHeadersSinceDate(
                        '[Gmail]/Sent Mail',
                        new Date(2015, 0, 1), {
                            fetchChunkSize: 1000
                        },
                        gotHeaders.bind(this, user.email, true),
                        function end(err) {
                            if (err) {
                                console.log('End sent in error:', err);
                            }

                            console.log('sent end');
                            callback();
                        });
                });
        });
    }, function() {
        console.log('DONE WITH ALL EMAIL ACCOUNTS');
        frequencyCounter.stopProcessing();
        mainCallback();
    });
};