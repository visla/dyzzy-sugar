var request = require('request');
var graphNode = require('../models/graph-node');
var async = require('async');
var moment = require('moment');
var fs = require('fs');

function setJSON(jObj, source_email, related_email, type, value){
	if(!jObj[source_email]){
		jObj[source_email] = {};
	}

	if(!jObj[source_email][related_email]){
		jObj[source_email][related_email]= {};
	}
	
	jObj[source_email][related_email][type] = value;
	
	return jObj;
}

function analyzeContacts(contactsJSON, lastAccessToken, form, cJSONResponse, callback){
	console.log("=============CONTACTS=============");
	//console.log(contactsJSON);
	var check = 0;
	var i = 0;
	async.eachSeries(contactsJSON.records, function(records, contactsCallback){
		var email_address = records.email[0].email_address;
		var name = records.name;
		var date_modified = records.date_modified;
		var created_by_name = records.created_by_name;
		var assigned_user_name = records.assigned_user_name;
		var assigned_user_id = records.assigned_user_id;



		request({
		    url: 'http://localhost/sugar-builds/7.x/ent/sugarcrm/rest/v10/Users/'+assigned_user_id+'',
		    qs: form,
			method: 'GET',
			headers:{'oauth-token': lastAccessToken},
			}, 
			function (nError, nResponse, nBody) {
		        if (!nError && nResponse.statusCode == 200) {

		        	var userSearchJSON = JSON.parse(nBody);
		        	var assigned_email = userSearchJSON.email[0].email_address;
		        	
					var newDateSplit = date_modified.split('T');
					var newDate = newDateSplit[0];
					var startDate = moment(newDate, 'YYYY-MM-DD');
					var difference = moment().diff(startDate, 'weeks');

					var score = 0;
					if(difference < 12){
						score = 1 - difference/12;
					}

					cJSONResponse = setJSON(cJSONResponse, assigned_email, email_address, 'contacts', score);
		        	


        			console.log("Email: "+ email_address);
					console.log("Name: "+ name);
					console.log("Date Modified: "+ date_modified);
					console.log("Created By: "+ created_by_name);
					console.log("Assigned To: "+ assigned_user_name);
					console.log("Assigned To Email: "+ assigned_email);
					console.log(" ---- ");
					//console.log(email_address);



					/*graphNode.ifExists(assigned_email, email_address, function(exists){
						if(!exists){
							graphNode.storeNode(assigned_email, assigned_user_name, function() {
			                	var frequencyScore = 1.0;
				                graphNode.storeNode(email_address, name, function() {
				                    graphNode.addRelationship(
				                        assigned_email,
				                        email_address,
				                        'frequencyScore',
				                        frequencyScore,
				                        function() {}
				                   	);
				                });
				            });
						}

					});*/







					var n = contactsJSON.next_offset-1;
					var endConditions = (email_address === contactsJSON.records[n].email[0].email_address) &&
										(name === contactsJSON.records[n].name) &&
										(date_modified === contactsJSON.records[n].date_modified) &&
										(created_by_name === contactsJSON.records[n].created_by_name) &&
										(assigned_user_name === contactsJSON.records[n].assigned_user_name) &&
										(assigned_user_id === contactsJSON.records[n].assigned_user_id);
					if(endConditions){
						//console.log(cJSONResponse);
						contactsCallback();
						callback();
					}else{
						contactsCallback();
					}


		
					

		        }
		    }
		);


	});
	
}


function analyzeLeads(leadsJSON, lastAccessToken, form, cJSONResponse, callback){
	console.log("=============LEADS=============");

	async.eachSeries(leadsJSON.records, function(records, leadsCallback){
		var email_address = records.email[0].email_address;
		var name = records.name;
		var date_modified = records.date_modified;
		var created_by_name = records.created_by_name;
		var created_by_id = records.created_by;
		var assigned_user_id = records.assigned_user_id;
		var assigned_user_name = records.assigned_user_name;
		var modified_by_name = records.modified_by_name;
		var modified_by_id = records.modified_user_id;



		request({
		    url: 'http://localhost/sugar-builds/7.x/ent/sugarcrm/rest/v10/Users/'+assigned_user_id+'',
		    qs: form,
			method: 'GET',
			headers:{'oauth-token': lastAccessToken},
			}, 
			function (Error, Response, Body) {
		        if (!Error && Response.statusCode == 200) {
		        	var assignedUserSearchJSON = JSON.parse(Body);
		        	var assigned_email = assignedUserSearchJSON.email[0].email_address;

					request({
					    url: 'http://localhost/sugar-builds/7.x/ent/sugarcrm/rest/v10/Users/'+created_by_id+'',
					    qs: form,
						method: 'GET',
						headers:{'oauth-token': lastAccessToken},
						}, 
						function (nnError, nnResponse, nnBody) {
					        if (!nnError && nnResponse.statusCode == 200) {

					        	var createdUserSearchJSON = JSON.parse(nnBody);
					        	var created_email = createdUserSearchJSON.email[0].email_address;
								
								var newDateSplit = date_modified.split('T');
								var newDate = newDateSplit[0];
								var startDate = moment(newDate, 'YYYY-MM-DD');
								var difference = moment().diff(startDate, 'weeks');

								var timeScore = 0;
								if(difference < 12){
									timeScore = 1 - difference/12;
								}

								var authScore = 0;
								if(created_email == assigned_email){
									authScore = 1;
								}

								score = 0.8 * timeScore + 0.2 * authScore;

								cJSONResponse = setJSON(cJSONResponse, assigned_email, email_address, 'leads', score);

			        			console.log("Email: "+ email_address);
								console.log("Name: "+ name);
								console.log("Date Modified: "+ date_modified);
								console.log("Created By: "+ created_by_name);
								console.log("Created Email: "+ created_email)
								console.log("Assigned To: "+ assigned_user_name);
								console.log("Assigned To Email: "+ assigned_email);
								console.log(" ---- ");

								



								/*graphNode.ifExists(assigned_email, email_address, function(exists){
									if(!exists){
										graphNode.storeNode(assigned_email, assigned_user_name, function() {
						                	var frequencyScore = 1.0;
							                graphNode.storeNode(email_address, name, function() {
							                    graphNode.addRelationship(
							                        assigned_email,
							                        email_address,
							                        'frequencyScore',
							                        frequencyScore,
							                        function() {}
							                   	);
							                });
							            });
									}

								});*/

								var n = leadsJSON.next_offset-1;
								var endConditions = (email_address === leadsJSON.records[n].email[0].email_address) &&
													(name === leadsJSON.records[n].name) &&
													(date_modified === leadsJSON.records[n].date_modified) &&
													(created_by_name === leadsJSON.records[n].created_by_name) &&
													(created_by_id === leadsJSON.records[n].created_by) &&
													(modified_by_name === leadsJSON.records[n].modified_by_name) &&
													(modified_by_id === leadsJSON.records[n].modified_user_id);
								if(endConditions){
									//console.log(cJSONResponse);
									leadsCallback();
									callback();
								}else{
									leadsCallback();
								}

					        }
					    }
					);

		        }
		    }
		);
	});
}

exports.start = function(contactsJSON, leadsJSON, lastAccessToken, form, mainCallback){
	console.log("Starting Analysis.");
	var cJSONResponse = {};
	
	analyzeLeads(leadsJSON, lastAccessToken, form, cJSONResponse, 
		function(){
			analyzeContacts(contactsJSON, lastAccessToken, form, cJSONResponse, 
					function(){
						//console.log(cJSONResponse);

						fs.writeFile("./source/app/controllers/sugar-data.txt", JSON.stringify(cJSONResponse), function(err) {
						    if(err) {
						        return console.log(err);
						    }

						    console.log("All Sugar Data Saved.");
						    mainCallback();
						}); 
						/*for(var source in cJSONResponse){
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
						}*/

						//graphNode.addRelationship("jim@example.com", "vegan.kid@example.cn", 'sugarScore', 100, function(){});

						//console.log(cJSONResponse);
						console.log('Finished successfully!');
					}
				);
		}
	);


	
	






}

