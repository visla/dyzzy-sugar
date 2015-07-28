'use strict';

// To http://localhost:7474/db/data with user "local" and pass "test"
var dbLocal = require('seraph')({
    user: 'neo4j',
    pass: 'rootpass'
});

var map = {};

exports.storeNode = function(email, callback) {
    var id = null;
    if (map[email]) {
        id = map[email];
    }

    var object = { email: email};
    if (id) {
        object.id = id;
    }

    dbLocal.save(object, function(err, node) {
        console.log('stored node:', node);
        map[email] = node.id;
        callback();
    });
};

exports.addRelationship = function(email1, email2, attributeName, attributeValue, callback) {
    var relObject = {};
    relObject[attributeName] = attributeValue;
    dbLocal.relate(map[email1], 'knows', map[email2], relObject, function(err, relationship) {
        console.log('added relationship:', email1, ' -> ', email2);
        map[email1 + '-' + email2] = relationship.id;
        callback();
    });
};