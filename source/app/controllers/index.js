'use strict';

var common = require('common-mixers').common;
var IMAPClient = projectRequire('lib/imap-client');

/**
 * Setup controllers with express app.
 * @param {[type]} app [description]
 */
var setup = function(app) {
    app.post('/v1/verify', function(req, res) {
        var validInput = common.validateInput(res, req.body, {
            id : '/verify',
            type: 'object',
            properties: {
                user: {type: 'string', required: true},
                host: {type: 'string', required: true},
                port: {type: 'number', required: true}
            }
        });

        if (!validInput) {
            logger.info('post /v1/verify - failed request validation. Request: [%j]', req);
            return;
        }

        var imapClient = new IMAPClient(req.body);
        imapClient.connect(function(err) {
            if (err) {
                return common.respondError(
                    res,
                    401,
                    'Failed to authenticate account: ' + JSON.stringify(err),
                    true
                );
            } else {
                return common.respond(res, {success: true, connection: req.body}, true);
            }
        });
    });
};

module.exports = {
    setup: setup
};
