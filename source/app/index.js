/* global logger */
/* global process */
/* global projectRequire */
/* global GLOBAL */
'use strict';

var express = require('express');

// Load our stuff.
var config = require('./config');
var bodyParser = require('body-parser');
var app = null;

var runApplication = function(callback) {
    //Bootstrap express and all necessary controllers
    app = express();

    // Setup middleware
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));

    // Setup controllers.
    var controllers = require('./controllers');
    controllers.setup(app);

    // Either we are on unitTestPort or from ENV.
    var port = process.env.PORT;
    if (typeof GLOBAL.unitTestPort !== 'undefined') {
        port = GLOBAL.unitTestPort;
    }

    console.log('Listening on port ', port);
    app.listen(port);

    // start collecting
    if (process.argv[2] && process.argv[2] === 'collect') {
        var collectors = require('./controllers/collectors');
        collectors.start();
    }

    callback();
};

/**
 * Initialize application.
 * @return {[type]} [description]
 */
var initialize = function() {
    runApplication(function done(err) {
        if (err) {
            process.exit();
        }
    });
};

initialize();

/*
 Catch exit status
 */
process.on('exit', function(code) {
});

// Export app so integration tests can use it.
exports.app = app;
