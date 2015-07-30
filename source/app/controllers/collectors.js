var gmailCollector = require('./gmail-collector');
var sugarCollector = require('./sugar-collector');

// start collecting data.
exports.start = function(callback) {
	sugarCollector.startSugarCollection(callback);
    /*gmailCollector.startGmailCollection(function(){

    	
    });*/
    

}