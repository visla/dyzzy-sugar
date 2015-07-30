'use strict';

var util = require('util');

// To http://localhost:7474/db/data with user "local" and pass "test"
var dbLocal = require('seraph')({ server: "http://52.10.156.36:7474",
                                   user: "neo4j",
                                   pass: "rootpass" });

var map = {};

function getNodeId(email, callback) {
    dbLocal.find({ email: email}, function(err, node) {
        if (node && node.length > 0) {
            callback(null, node[0].id);
        } else {
            callback(null, null);
        }
    });
}

exports.storeNode = function(email, name, callback) {
    var id = null;
    var object = {
        email: email,
        name: name,
    };

    if (map[email]) {
        object.id = map[email];
        dbLocal.save(object, function(err, node) {
            console.log('stored node:', node);
            map[email] = node.id;
            callback();
        });
    } else {
        getNodeId(email, function(err, nodeId) {
            if(nodeId) {
                object.id = nodeId;
            }

            dbLocal.save(object, function(err, node) {
                console.log('stored node:', node);
                map[email] = node.id;
                callback();
            });
        });
    }
};

function findRelationship(email1, email2, callback) {
    var query = 'MATCH (n)-[r]->(x) WHERE n.email = "%s" AND x.email = "%s" RETURN r';
    query = util.format(query, email1, email2);

    console.log('query:', query);
    dbLocal.query(query, function(err, relationship) {
        if (err) {
            console.log('error finding rel:', err);
            return callback(err);
        }

        console.log('found:', relationship);
        if (relationship) {
            callback(null, relationship);
        } else {
            callback(null, null);
        }
    });
}

exports.addRelationship = function(email1, email2, attributeName, attributeValue, callback) {
    var relObject = {};
    var key = email1 + '-' + email2;
    var id = null;
    // if we have it cached.
    if (map[key]) {
        id = map[key];
        // update rel with id
        dbLocal.rel.read(id, function(err, relationship) {
            relationship.properties[attributeName] = attributeValue;
            dbLocal.rel.update(relationship, function() {
                console.log('updated relationship');
                callback();
            });
        });
    } else {
        // try to find relationship between objects.
        findRelationship(email1, email2, function(err, relationship) {
            if (relationship && relationship.length > 0) {
                relationship[0].properties[attributeName] = attributeValue;
                dbLocal.rel.update(relationship[0], function(err) {
                    if (err) {
                        console.log('error updating relationship', err);
                        return callback(err);
                    }
                    console.log('updated existing relationship');
                    callback();
                });
            } else {
                relObject[attributeName] = attributeValue;
                dbLocal.relate(map[email1], 'knows', map[email2], relObject, function(err, relationship) {
                    console.log('added relationship:', email1, ' -> ', email2);
                    map[email1 + '-' + email2] = relationship.id;
                    callback();
                });
            }
        });
    }
};