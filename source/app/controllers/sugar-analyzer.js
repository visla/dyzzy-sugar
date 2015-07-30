var fs = require('fs');
var graphNode = require('../models/graph-node');

exports.start = function(callback){
	console.log("sugar analyzer started");

	fs.readFile("./source/app/controllers/sugar-data.txt", 'utf-8', function(err,data){
		if (err) throw err;

	    var cJSONResponse = JSON.parse(data);

	    for(var source in cJSONResponse){
			for(var related in cJSONResponse[source]){
				console.log("Source: "+source);
				console.log("Related: "+related);
				var sugarScore = 0;
				var type = "contacts";
				if(cJSONResponse[source][related][type]){
					sugarScore += 0.3*cJSONResponse[source][related][type];
				}
				type = "leads";
				if(cJSONResponse[source][related][type]){
					sugarScore += 0.7*cJSONResponse[source][related][type];
				}
				graphNode.ifExistsAdd(source, related, 'sugarScore', sugarScore, function(exists, src, rel, attributeName, attributeValue){
					if(exists){
						console.log("Exists!");
						console.log("Sugar Score: "+sugarScore);
						graphNode.addRelationship(
		                    src,
		                    rel,
		                    attributeName,
		                    attributeValue,
		                    function() {}
		             	);
					}

				});
			}
		}

	    
	});
	/**/



}