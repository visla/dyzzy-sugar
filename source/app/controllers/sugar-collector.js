var http = require('http');
var fs = require('fs');
var request = require('request');
var express = require('express');
var querystring = require('querystring');

var username = 'admin';
var password = 'root';



exports.startSugarCollection = function(mainCallback){
	var redirect_uri = 'http://127.0.0.1:3000/';
	var client_id = 'key';
	var client_secret = 'secret';

	var form ={ 
	    	grant_type: 'password', 
			client_id: client_id,
			client_secret: client_secret,
			username: username,
			password: password,
			platform: 'base'
		} ;

	console.log("Working...");
	request({
	    url: 'http://localhost/sugar-builds/7.x/ent/sugarcrm/rest/v10/oauth2/token',
	    qs: form,
	    method: 'POST',
	    headers: {},
	    body: ''
		},
	    function (error, response, body) {
	        if (!error && response.statusCode == 200) {
	        	var j = JSON.parse(body);

    			console.log("Working some more...");
    			request({
				    url: 'http://localhost/sugar-builds/7.x/ent/sugarcrm/rest/v10/Users/filter?filter[0][user_name]=' + username + '&max_num=1&offset=0&fields=user_name,email&order_by=user_name:DESC',
				    //url: 'http://localhost/sugar-builds/7.x/ent/sugarcrm/rest/v10/Contacts?filter[0][account_name][$starts]=b&fields=name,assigned_user_name',
				    //url: 'http://localhost/sugar-builds/7.x/ent/sugarcrm/rest/v10/Contacts?fields=name,assigned_user_name,created_by_name, email',
				    qs: form,
					method: 'GET',
					headers:{'oauth-token': j["access_token"]},
					}, 
					function (nError, nResponse, nBody) {
				        if (!nError && nResponse.statusCode == 200) {
				        	var nj = JSON.parse(nBody);
				        	var email = nj.records[0].email[0].email_address;
				        	var line = email + "," + j["access_token"] + "," + j["refresh_token"] + "," + j["download_token"];

					    	fs.appendFile("./source/app/controllers/sugar.txt", "\n" + line, function(err){
								if(err) return console.log(err);
								console.log("Successfully fetched Sugar Credentials.");
								var collect = require('./sugar-collect');
								collect.startCollection(form, mainCallback);
							});

							    



				        }
				    }
				);	

	        }
	    }
	);



}


http.createServer(function (req, res) {
	


});

