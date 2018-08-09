
var request = require('request');
var fs = require('fs');

request.get("https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSCostExplorer/current/index.json").pipe(fs.createWriteStream('./price.json'));
