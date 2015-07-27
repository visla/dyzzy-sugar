
'use strict';

var Imap = require('imap');
var xoauth2 = require('xoauth2');
var _ = require('underscore');
var MailParser = require('mailparser').MailParser;
var async = require('async');

var HEADER_IMAP_BODIES_VALUE = 'HEADER';
// Empty string means retrieving the entire message.
var FETCH_COMPLETE_MESSAGE_IMAP_BODIES_VALUE = '';
var ONGOING_OPERATION_ERROR =
    new Error('Some other operation is ongoing on with this IMAP client object.');

//  Arbitrary default max. size of a fetch chunk.
var FETCH_CHUNK_MAX_SIZE = 1000;

function IMAPClient(options) {
    this.options = options;
    this.imap = null;
    this.callback = null;
    this.examinedBox = null;
}

IMAPClient.prototype.callbackIfNeeded = function(err) {
    if (this.callback) {
        var callback = this.callback;
        this.callback = null; // don't call this again.
        callback(err);
    }
};

IMAPClient.prototype.setupEventHandler = function() {

    var that = this;

    this.imap.once('ready', function onReadyHandler() {
        that.callbackIfNeeded();
    });

    this.imap.once('error', function onErrorHandler(err) {
        that.callbackIfNeeded(err);
    });

    /*
    this.imap.once('end', function onEndHandler() {
        // This does not get emitted when imap.end() is called
        that.callbackIfNeeded();
    });
    */
};

IMAPClient.prototype.connect = function(callback) {
    if (!this.options) {
        return callback(new Error('Options is not specified in constructor'));
    }

    if (this.callback) {
        return callback(ONGOING_OPERATION_ERROR);
    }

    if (this.options.user &&
        this.options.clientId &&
        this.options.clientSecret &&
        this.options.refreshToken &&
        this.options.host &&
        this.options.port
        ) {

        var oauth2Generator = xoauth2.createXOAuth2Generator(this.options);

        var that = this;
        oauth2Generator.getToken(function getTokenHandler(err, token) {
            if (err) {
                return callback(err);
            }

            that.options.xoauth2 = token;
            that.options.tls = true;

            that.imap = new Imap(that.options);
            that.setupEventHandler();

            that.callback = callback;
            that.imap.connect();
        });

    } else if (this.options.user &&
        this.options.password &&
        this.options.host &&
        this.options.port) {

        //  Some tests set no_tls to true as they run against uncertified servers.
        //  (e.g. dockerized test IMAP server)
        this.options.tls = !this.options.no_tls;
        this.imap = new Imap(this.options);

        this.setupEventHandler();

        this.callback = callback;
        this.imap.connect();
    } else {
        var optionsToLog = this.options;
        _.each(['password', 'clientId', 'clientSecret', 'refreshToken'], function(property) {
            optionsToLog[property] = optionsToLog[property] && '<redacted>';
        });

        return callback(new Error('No available login protocol: ' + JSON.stringify(optionsToLog)));
    }
};

IMAPClient.prototype.disconnect = function() {
    if (this.imap) {
        this.imap.end();
    }
};

IMAPClient.prototype.fetchFolders = function(callback) {

    this.imap.getBoxes(function getBoxesHandler(err, boxes) {

        /* istanbul ignore next */
        if (err) {
            return callback(err);
        }

        var folders = [];

        //  Collects folder names recursively from the given boxes.
        var collect = function(parentName, boxes) {
            _.each(boxes, function boxIterator(box, name) {
                var folder = {
                    path : parentName + name,
                    attributes : box.attribs
                };

                folders.push(folder);
                if (box.children) {
                    collect(parentName + name + box.delimiter, box.children);
                }
            });
        };

        //  Top-level boxes don't have a parent so we pass ''
        collect('', boxes);

        callback(null, folders);
    });

};

/**
 *  Retrieves results of a fetch object and returns them through callback as array of messages.
 */
var retrieveFetchResults = function(fetch, fetchAttachments, callback) {

    var messages = [];
    var fetchEnded = false;
    var fetchedMessagesCount = 0;

    var callbackIfFinished = function() {
        if (fetchEnded && fetchedMessagesCount === messages.length) {
            callback(null, messages);
        }
    };

    fetch.on('message', function onMessageHandler(message) {
        ++fetchedMessagesCount;

        var messageData = {};
        var parser = new MailParser();
        parser.once('end', function onEndHandler(mailObj) {
            messageData = _.extend(messageData, mailObj);
            if (!fetchAttachments) {
                messageData.attachments = undefined;
            }
            messages.push(messageData);
            callbackIfFinished();
        });
        message.on('body', function onBodyHandler(stream) {
            stream.on('data', function onDataHandler(chunk) {
                parser.write(chunk);
            });
        });
        message.once('attributes', function onAttributesHandler(attrs) {
            messageData = _.extend(messageData, {
                uid: attrs.uid
            });
        });
        message.once('end', function onEndHandler() {
            parser.end();
        });
    });
    /* istanbul ignore next */
    fetch.on('error', function onErrorHandler(err) {
        callback(err);
        callback = undefined;
    });
    fetch.once('end', function onEndHandler() {
        fetchEnded = true;
        callbackIfFinished();
    });

};

/**
 *  Opens the given inbox folder and returns it through callback.
 */
IMAPClient.prototype.examineFolder = function(folder, callback) {

    var that = this;
    var handleExaminedBox = function(box) {

        /* istanbul ignore next */
        if (!box.persistentUIDs) {
            return callback(new Error(
                'Retrieving messages from mailboxes without persistent UIDs is not supported.'));
        }

        callback(null, box);
    };

    if (this.box && folder === this.box.name) {
        return handleExaminedBox(this.box);
    }

    this.imap.openBox(folder, true, function openBoxHandler(err, box) {

        /* istanbul ignore next */
        if (err) {
            return callback(err);
        }

        that.examinedBox = box;
        handleExaminedBox(box);

    });
};

/**
 *  Serially creates fetches for the given IMAP bodies options and chunks and then
 *  streams messages by chunks through the given callback.
 *  This is the workhorse of all the message/header/etc. retrieval as imapBodies
 *  argument specifies what kind of results are to be fetched whereas fetchChunks
 *  argument (which can be strings or array of UIDs or whatever else `fetch` function
 *  can accept) specifies what are the results to be fetched.
 *  The optional "options" argument can influence the data fetching (e.g. chunk size, attachments
 *  or not, etc.)
 *  Callback has `err, message` signature.
 */
var fetchChunksStreamResults = function(client, options, fetchChunks, callback, end) {

    if (_.isEmpty(fetchChunks) && end) {
        return end();
    }

    async.forEachOfSeries(fetchChunks, function chunkIterator(chunk, index, fetchNextChunk) {

        var fetch = client.imap.fetch(chunk, {
            bodies: options.imapBodies,
            struct: true
        });

        retrieveFetchResults(fetch, options.fetchAttachments, function(err, messages) {

            /* istanbul ignore next */
            if (!err) {
                callback(messages, parseInt(index), fetchChunks.length);
            }

            return fetchNextChunk(err);
        });
    }, end);
};

var splitUidsIntoFetchChunks = function(uids, options) {

    //  Split the array of uids into fetch-chunk sized arrays.
    var fetchChunks = [];
    for (var currentIndex = 0;
         currentIndex < uids.length;
         currentIndex += options.fetchChunkSize) {
        fetchChunks.push(uids.slice(
            currentIndex,
                currentIndex + options.fetchChunkSize));
    }

    return fetchChunks;
};

/**
 *  Fetch messages since the given UID and streams them through the given callback.
 */
var fetchMessagesSinceUid = function(client, options, uid, callback, end) {

    client.examineFolder(options.folder, function openBoxHandler(err/*, box*/) {

        /* istanbul ignore next */
        if (err) {
            return end(err);
        }

        // First get the list of UIDs in the range
        var fetch = client.imap.fetch(uid.toString() + ':*');
        retrieveFetchResults(fetch, false, function retrieveFetchResultsHandler(err, messages) {

            /* istanbul ignore next */
            if (err) {
                return end(err);
            }

            var uids = _.pluck(messages, 'uid');

            // fetching uids always returns the highest uid regardless of where the
            // start uid is. So we have to manually filter that out.
            uids = _.filter(uids, function(currentUid) {
                return currentUid >= uid;
            });

            var fetchChunks = splitUidsIntoFetchChunks(uids, options);

            fetchChunksStreamResults(client, options, fetchChunks, callback, end);
        });
    });
};

/**
 *  Fetch messages since the given date and streams them through the given callback.
 */
var fetchMessagesSinceDate = function(client, options, date, callback, end) {

    client.examineFolder(options.folder, function openBoxHandler(err/*, box*/) {

        /* istanbul ignore next */
        if (err) {
            return end(err);
        }

        client.imap.search([['SINCE', date]], function searchHandler(err, uids) {

            /* istanbul ignore next */
            if (err) {
                return end(err);
            }

            var fetchChunks = splitUidsIntoFetchChunks(uids, options);

            fetchChunksStreamResults(client, options, fetchChunks, callback, end);
        });
    });
};

var processArguments = function(client, folder, options, callback, end,
    processArgumentsCallback) {

    //  "options" is an optional argument
    if (_.isFunction(options)) {
        end = callback;
        callback = options;
        options = {};
    }

    if (!_.isNumber(options.fetchChunkSize) || options.fetchChunkSize <= 0) {
        options.fetchChunkSize = FETCH_CHUNK_MAX_SIZE;
    }
    options.folder = folder;

    var processArgumentsError;
    /* istanbul ignore next */
    if (client.callback) {
        processArgumentsError = ONGOING_OPERATION_ERROR;
    }

    processArgumentsCallback(processArgumentsError, options, callback, end);
};

/**
 *  Fetches headers since the given UID and streams them through the given callback.
 */
IMAPClient.prototype.fetchHeadersSinceUid = function(folder, uid, options, callback, end) {

    var that = this;

    processArguments(
        this,
        folder,
        options,
        callback,
        end,
        function processArgumentsHandler(err, options, callback, end) {
            /* istanbul ignore next */
            if (err) {
                return end(err);
            }

            options.imapBodies = HEADER_IMAP_BODIES_VALUE;
            fetchMessagesSinceUid(that, options, uid, callback, end);
        }
    );
};

/**
 *  Fetches headers since the given date and streams them through the given callback.
 */
IMAPClient.prototype.fetchHeadersSinceDate = function(
    folder,
    date,
    options,
    callback,
    end) {

    var that = this;

    processArguments(
        this,
        folder,
        options,
        callback,
        end,
        function processArgumentsHandler(err, options, callback, end) {
            /* istanbul ignore next */
            if (err) {
                return end(err);
            }

            options.imapBodies = HEADER_IMAP_BODIES_VALUE;

            fetchMessagesSinceDate(that, options, date, callback, end);
        }
    );
};

/**
 *  Fetches complete messages for the given UIDs and streams them through the given callback.
 */
IMAPClient.prototype.fetchCompleteMessagesForUids = function(
    folder,
    uids,
    options,
    callback,
    end) {

    var that = this;

    processArguments(
        this,
        folder,
        options,
        callback,
        end,
        function processArgumentsHandler(err, options, callback, end) {
            /* istanbul ignore next */
            if (err) {
                return end(err);
            }

            that.examineFolder(options.folder, function openBoxHandler(err/*, box*/) {

                /* istanbul ignore next */
                if (err) {
                    return end(err);
                }

                options.imapBodies = FETCH_COMPLETE_MESSAGE_IMAP_BODIES_VALUE;

                var fetchChunks = splitUidsIntoFetchChunks(uids, options);

                fetchChunksStreamResults(that, options, fetchChunks, callback, end);

            });
        });

};

module.exports = IMAPClient;
