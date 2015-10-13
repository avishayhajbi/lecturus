mongoDb = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    assert = require('assert');
var mongoose = require('mongoose')
    , fs = require('fs')
    , models_path = process.cwd() + '/models'
//--------------------------------Connect to mongodb using Mongoose--------------------------------//

config = {
  mongoUrl:'mongodb://lecturus:lec123@ds033477.mongolab.com:33477/heroku_app33687705'
};

//--------------------------------Connect to mongodb using Mongoose--------------------------------//
//The server option auto_reconnect is defaulted to true
var options = {
	db: { native_parser : true },
	server: {
      poolSize: 20,
      auto_reconnect:true,
      socketOptions:{ keepAlive : 1, connectTimeoutMS : 30000 }
    }
};

mongoose.connect(config.mongoUrl, options);
// make global connection variable
db = mongoose.connection;

// create event handlers for Mongoose
db.on('error', function (err)
{
	console.log('Mongoose: Error: ' + err);
});

db.on('open', function() 
{
	console.log('Mongoose: Connection established.');
});

db.on('disconnected', function()
{
  console.log('Mongoose: Connection stopped, recconect.');
  mongoose.connect(config.mongoUrl, options);
});

db.on('reconnected', function () {
    console.info('Mongoose reconnected!');
});

fs.readdirSync(models_path).forEach(function (file) {
    if (~file.indexOf('.js'))
        require(models_path + '/' + file)
});
//--------------------------------Connect to mongodb using Mongoose--------------------------------//
