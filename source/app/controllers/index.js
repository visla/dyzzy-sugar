'use strict';

var IMAPClient = require('../lib/imap-client');

/**
 * Setup controllers with express app.
 * @param {[type]} app [description]
 */
var setup = function(app) {
    app.post('/v1/verify', function(req, res) {

    });
};

module.exports = {
    setup: setup
};
