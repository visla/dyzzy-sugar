var fs = require('fs');
var request = require('request');




exports.startCollection = function(form, mainCallback){
	console.log("Started Collection Algorithm");
	fs.readFile("./source/app/controllers/sugar.txt", 'utf-8', function(err,data){
		if (err) throw err;
	    var lines = data.trim().split('\n');
	    var lastLine = lines.slice(-1)[0];
	    var fields = lastLine.split(',');
	    var lastEmail = fields[0];
	    var lastAccessToken = fields[1];

	    request({
		    url: 'http://localhost/sugar-builds/7.x/ent/sugarcrm/rest/v10/Contacts?fields=name,assigned_user_name,assigned_user_id,created_by_name,email',
		    qs: form,
			method: 'GET',
			headers:{'oauth-token': lastAccessToken},
			}, 
			function (nError, nResponse, nBody) {
		        if (!nError && nResponse.statusCode == 200) {
		        	var contactsJSON = JSON.parse(nBody);
		        	var download = require('./sugar-download');

					request({
					    url: 'http://localhost/sugar-builds/7.x/ent/sugarcrm/rest/v10/Leads?fields=name,date_entered,date_modified,modified_user_id,modified_by_name,created_by,created_by_name,email,assigned_user_id,assigned_user_name',
					    qs: form,
						method: 'GET',
						headers:{'oauth-token': lastAccessToken},
						}, 
						function (Error, Response, Body) {
					        if (!Error && Response.statusCode == 200) {
					        	var leadsJSON = JSON.parse(Body);
					        	download.start(contactsJSON, leadsJSON, lastAccessToken, form, mainCallback);
					        }
					    }
					);

		        	

		        }
		    }
		);

	});

}