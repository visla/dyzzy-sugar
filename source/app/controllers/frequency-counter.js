var _ = require('underscore-node');

function FrequencyCounter(input) {
    this.input = input;
    this.fromAddresses = {};
    this.toAddresses = {};

    this.getCounts = function(callback) {
        var toAddressArray, fromAddressArray;
        _.each(this.input, function(email) {
            toAddressArray = email['to'];
            fromAddressArray = email['from'];

            _.each(toAddressArray, function(to) {
                if (to.address !== '') {
                    if (_.has(this.toAddresses, to.address)) {
                        this.toAddresses[to.address] = this.toAddresses[to.address] + 1;
                    } else {
                        this.toAddresses[to.address] = 1
                    }
                }
            }, this);


            _.each(fromAddressArray, function(from) {
                if (from.address !== '') {
                    if (_.has(this.fromAddresses, from.address)) {
                        this.fromAddresses[from.address] = this.fromAddresses[from.address] + 1;
                    } else {
                        this.fromAddresses[from.address] = 1
                    }
                }
            }, this);
        }, this);

        if (callback) callback();
    };
}

module.exports = FrequencyCounter;
