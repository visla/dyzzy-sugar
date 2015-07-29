'use strict';



// To http://localhost:7474/db/data with user "local" and pass "test"
var dbLocal = require('seraph')({ server: "http://52.10.156.36:7474",
                                   user: "neo4j",
                                   pass: "rootpass" });

var map = {};

exports.storeNode = function(email, name, callback) {
    var id = null;
    if (map[email]) {
        id = map[email];
    }

    var object = {
        email: email,
        name: name,
    };

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
    var key = email1 + '-' + email2;
    var id = null;
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
        relObject[attributeName] = attributeValue;
        dbLocal.relate(map[email1], 'knows', map[email2], relObject, function(err, relationship) {
            console.log('added relationship:', email1, ' -> ', email2);
            map[email1 + '-' + email2] = relationship.id;
            callback();
        });
    }
};