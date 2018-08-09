const express = require('express');
const bodyParser = require('body-parser');
const snsSubscriptionConfirmation = require('aws-sns-subscription-confirmation');
const util = require('util');
const fs = require('fs');
const app = express();

var db;
var cloudant;
var dbCredentials = {
    dbName: 'awslistprice'
};

initDBConnection();


app.set('port', process.env.PORT || 3000);

// Fix the wrong request content-type as required by the body-parser
app.use(snsSubscriptionConfirmation.overrideContentType());
app.use(bodyParser.json());
app.use(snsSubscriptionConfirmation.snsConfirmHandler());

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/', function(request, response) {

	var date = new Date();
    var now =(date.getHours() + ":" +
              date.getMinutes() + ":" +
              date.getSeconds());
    var sns = request.body;

    if (util.isString(sns.Message) ){
       sns.Message = JSON.parse(sns.Message);
    }
    saveDocument( sns.MessageId, new Date(), sns, response);
//    UploadAttachment(rec_id, sns.Message.url.JSON);
});
 

var server = app.listen(app.get('port'), function () {
	console.log('Express server listening at http://%s:%s', server.address().address, server.address().port);
});




// sub routines

function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);
    // Pattern match to find the first instance of a Cloudant service in
    // VCAP_SERVICES. If you know your service key, you can access the
    // service credentials directly by using the vcapServices object.
    for (var vcapService in vcapServices) {
        if (vcapService.match(/cloudant/i)) {
            return vcapServices[vcapService][0].credentials.url;
        }
    }
}

function initDBConnection() {
    //When running on Bluemix, this variable will be set to a json object
    //containing all the service credentials of all the bound services
    if (process.env.VCAP_SERVICES) {
        dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    } else { //When running locally, the VCAP_SERVICES will not be set

        // When running this app locally you can get your Cloudant credentials
        // from Bluemix (VCAP_SERVICES in "cf env" output or the Environment
        // Variables section for an app in the Bluemix console dashboard).
        // Once you have the credentials, paste them into a file called vcap-local.json.
        // Alternately you could point to a local database here instead of a
        // Bluemix service.
        // url will be in this format: https://username:password@xxxxxxxxx-bluemix.cloudant.com
        dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    }

    cloudant = require('cloudant')(dbCredentials.url);

    // check if DB exists if not create
    cloudant.db.create(dbCredentials.dbName, function(err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
        }
    });

    db = cloudant.use(dbCredentials.dbName);
}

function  saveDocument(id, name, value, response) {

    if (id === undefined) {
        // Generated random id
        id = '';
    }

 
    db.insert({
        TimeReceived: name,
        AWSMessage: value,
    }, id, function(err, doc) {
        if (err) {
            console.log(err);
            response.sendStatus(500);
        } else
            console.log('AWS Pricing Change Info received at ' + name );
            response.sendStatus(200);
        response.end();
    });
}


function uploadAttachment( rec_id,  url ) {
    
    var request = require('request');

    // download detail price file
    request(url).pipe(fs.createWriteStream('./price.json'));
    

    db.insert({
        TimeReceived: new Date(),
        AWSMessage: sns
    }, '', function(err, doc) {
        if (err) {
            console.log(err);
            response.sendStatus(500);
        } else
            id = doc.id;
            rev = doc.rev;
            request.put( 
                { "method": "PUT",
                  "url": "https://1f3b2b78-6580-45ef-aa5d-c7c4f560e8f6-bluemix:098433a57b051da9099e221f2ddbdfd617150fb1d37e4c4366221de617ef2641@1f3b2b78-6580-45ef-aa5d-c7c4f560e8f6-bluemix.cloudant.com/awslistprice" + doc.id +"/attachment?rev=" + doc.rev, 
                  "multipart":
                   [ { "ContentType": "application/json",
                       body: JSON.stringify({foo: 'bar', _attachments: {'vcap-local.json': {follows: true, length: 18, 'content_type': 'text/plain' }}})
                     },
                     { body: 'vcap-local.json' }
                   ]
                },
                function( error, resp1, body ) {
                    console.log('error: '+ response.statusCode)
                    console.log(body)
                }
            )
        console.log('AWS Pricing Change Info received at ' + (new Date()) );
        response.statusCode =200;
        response.end();
    });


}





