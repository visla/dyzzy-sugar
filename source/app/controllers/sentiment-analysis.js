var http = require('http');

function SentimentAnalysis(jsonInput) {
    this.jsonInput = jsonInput;
    this.options = {
        host: 'www.sentiment140.com',
        port: 80,
        path: '/api/bulkClassifyJson?appid=agreen@sugarcrm.com',
        method: 'Post',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': this.jsonInput.length
        }
    };



    this.getSentiment = function(callback) {
        var request = http.request(this.options, function(res) {
            var responseString = '';

            res.setEncoding('utf8');
            res.on('data', function(data) {
                responseString += data;
            });

            res.on('end', function() {
                if (callback) {
                    callback(responseString);
                }
            })
        });

        request.on('error', function(err) {
            console.log('failed with error: ', err);
        });

        request.write(this.jsonInput);
        request.end();
    };
}

module.exports = SentimentAnalysis;

