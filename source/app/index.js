/* global logger */
/* global process */
/* global projectRequire */
/* global GLOBAL */
'use strict';

GLOBAL.projectRequire = require('rfr');
if (!/.*source\/app\/$/.test(projectRequire.root)) {
    projectRequire.root = projectRequire.root + 'source/app';
}

var express = require('express');

// Load our stuff.
var config = projectRequire('config');
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

    app.listen(port);
    logger.debug('IS_IMAPCollector: Listening on port: ' + port);

    var SyncManager = projectRequire('lib/sync-manager');
    var syncManager = new SyncManager();
    syncManager.startSQSListener();

    callback();
};

/**
 * Initialize application.
 * @return {[type]} [description]
 */
var initialize = function() {

    var dbConfig = config.database.email_caddie;

    require('common-mixers').models(
        dbConfig,
        require('./models').setup,
        function done(err) {
            if (err) {
                logger.error('Cannot initialize models. Existing process.', err);
                process.exit();
            }

            logger.info('models are initialized');

            runApplication(function done(err) {
                if (err) {
                    logger.error('Application cannot run.', err);
                    process.exit();
                }

                logger.info('application is running');
            });
        });
};

initialize();

/*
 Catch exit status
 */
process.on('exit', function(code) {
    logger.error('Exit status:', code);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', function(err) {
    var log = err.stack;

    logger.error('server crashed', log);
    if (!config.emailCrash) {
        logger.error('Won\'t send crash report, in test mode.');
        return;
    }

    var nodemailer = require('nodemailer');
    var sesTransport = require('nodemailer-ses-transport');
    var transport = nodemailer.createTransport(sesTransport({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        rateLimit: 1 // do not send more than 1 message in a second
    }));

    var subject = '(' + process.env.NODE_ENV + ') AWS: IS_IMAPCollector - Crash Log';

    var mailOptions = {
        from: 'vikings@sugarcrm.com', // sender address
        to: 'vikings@sugarcrm.com', // list of receivers
        subject: subject, // Subject line
        text: log
    };

    transport.sendMail(mailOptions, function(error, response) {
        if (error) {
            logger.error('Could not send crash mail ', error);
        } else {
            logger.error('Send crash mail: ' + response.message);
        }
    });

    // If we exit straight away, the write log and send email operations wont have time to run
    setTimeout (function() {process.exit(); }, 5000);
});

// Export app so integration tests can use it.
exports.app = app;
