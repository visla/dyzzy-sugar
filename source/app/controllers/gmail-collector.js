'use strict';

var fs = require('fs');
var _ = require('underscore');
var IMAPClient = require('../lib/imap-client');

function gotHeaders(data) {
    console.log('Emai fetched:', data.length);
}

function fetchDone() {
    console.log('Fetching done');
}

exports.startGmailCollection = function() {
    console.log('start collecting gmail');
    // Read all entries from gmail.txt
    var access = fs.readFileSync(__dirname + '/gmail.txt').toString('utf8');
    var users = access.split('\n');
    var newUsers = {};
    users.forEach(function(user) {
        var userData = user.split(',');
        newUsers[userData[0]] = {
            email: userData[0],
            accessToken: userData[1],
            refreshToken: userData[2],
        };
    });

    users = newUsers;
    console.log(users);

    _.each(users, function(user) {
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
            // start fetching email.
            imapClient.fetchHeadersSinceDate(
                'INBOX',
                '2005-01-01', {
                    fetchChunkSize: 1000
                },
                gotHeaders,
                fetchDone);
        });
    });
};