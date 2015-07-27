'use strict';

var IMAPClient = require('../lib/imap-client');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var request = require('request');
var fs = require('fs');
var util = require('util');

/**
 * Setup controllers with express app.
 * @param {[type]} app [description]
 */
var setup = function(app) {
    app.get('/login/gmail', function(req, res) {
        console.log(process.env.GOOGLE_API_CLIENT_ID);
        var oauth2Client = new OAuth2(
            process.env.GOOGLE_API_CLIENT_ID,
            process.env.GOOGLE_API_CLIENT_SECRET,
            'http://localhost:' + process.env.PORT + '/oauth2callback');

        // generate a url that asks permissions for Google+ and Google Calendar scopes
        var scopes = [
          'https://mail.google.com/',
          'https://www.googleapis.com/auth/userinfo.email'
        ];

        var url = oauth2Client.generateAuthUrl({
          access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
          approval_prompt: 'force',
          scope: scopes // If you only need one scope you can pass it as string
        });

        res.redirect(url);
    });

    app.get('/oauth2callback', function(req, res) {
        // Get token now
        var code = req.query.code;

        // Get access/refresh tokens.
        // Ignore this whole section as this is google API mostly.
        // instabul ignore next
        request.post('https://www.googleapis.com/oauth2/v3/token', {
            form: {
                code: code,
                client_id: process.env.GOOGLE_API_CLIENT_ID,
                client_secret: process.env.GOOGLE_API_CLIENT_SECRET,
                redirect_uri: 'http://localhost:' + process.env.PORT + '/oauth2callback',
                grant_type: 'authorization_code',
            }},
            function(err, response) {
                if (err) {
                    console.log('getting access token from google api', err);
                    return res.send('error').status(500);
                }

                console.log('response:', response.body);
                var responseBody = null;
                try {
                    responseBody = JSON.parse(response.body);
                } catch (err) {
                    // istanbul ignore next
                    console.log('Parsing google api response. [%s]', response.body, err);
                    // istanbul ignore next
                    res.send('error').status(500);
                }

                var connection = {
                    accessToken: responseBody.access_token,
                    refreshToken: responseBody.refresh_token,
                };
                console.log('CONNECTION: ', connection);

                var options = {
                    url: 'https://www.googleapis.com/userinfo/v2/me',
                    method: 'GET',
                    json: true,
                    headers: {
                        'Authorization': 'Bearer ' + connection.accessToken,
                    },
                };

                // Get email of the user he used.
                request(options, function(err, response) {
                    if (err || response.statusCode !== 200) {
                        console.log('getting user info from googleapis', err);
                        res.send('error on get user info').status(500);
                    }

                    var emailAddress = response.body.email;
                    console.log(
                        'accessToken:', connection.accessToken,
                        'refresh_token:', connection.refreshToken,
                        'email:', emailAddress);

                    var options = {
                        user: emailAddress,
                        clientId: process.env.GOOGLE_API_CLIENT_ID,
                        clientSecret: process.env.GOOGLE_API_CLIENT_SECRET,
                        refreshToken: connection.refreshToken,
                        accessToken: connection.accessToken,
                        host: 'imap.gmail.com',
                        port: '993',
                    }

                    var imapClient = new IMAPClient(options);
                    imapClient.connect(function(err) {
                        if (err) {
                            console.log('imap auth failed');
                            return res.send('error imap connect').status(500);
                        }

                        fs.appendFileSync(__dirname + '/gmail.txt',
                            util.format('%s, %s, %s', emailAddress, connection.accessToken, connection.refreshToken));
                        res.send('Done. Imap connected');
                    });
                });
            });
    });
};

module.exports = {
    setup: setup
};
