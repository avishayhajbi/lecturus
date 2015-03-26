var express = require('express');
var mysql = require('mysql');
var path = require('path');
var bodyParser  = require('body-parser');
var fs = require("fs-extra");
var app = express();
Db = require('mongodb').Db,
    MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server,
    ReplSetServers = require('mongodb').ReplSetServers,
    ObjectID = require('mongodb').ObjectID,
    Binary = require('mongodb').Binary,
    GridStore = require('mongodb').GridStore,
    Grid = require('mongodb').Grid,
    Code = require('mongodb').Code,
    BSON = require('mongodb').pure().BSON,
    assert = require('assert');

app.use(express.static(path.join(__dirname ,'views')));
app.use(bodyParser({limit: '50mb'}));
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var port = process.env.PORT || 8080;
app.set('port', port);
app.set('view engine', 'ejs');

(port == false/*8080*/) ?
  config ={
  	host:"127.0.0.1",
  	user:"root",
  	password:"",
  	database:"lecturus",
  	port: 3306,
    mongoUrl:'mongodb://localhost:27017/lecturus'
  }
:
  config ={
  	host: "us-cdbr-iron-east-01.cleardb.net",
    user: "b23c6d0f964532",
    password: "1fc1c4ed",
    database: "heroku_f00102faee97288",
    port: 3306,
    mongoUrl:'mongodb://lecturus:lec123@ds033477.mongolab.com:33477/heroku_app33687705'
  }

pool = mysql.createPool(config);

app.listen(app.get('port'), function () {
    console.log('LecturuS Server running...'+app.get('port'));
});

// can use app.use( '/folderName' ,require('lecturus_users'));
var users = require('./s_users'); 
app.use(users); 
var session = require('./s_session'); 
app.use(session); 
var auxiliary = require('./s_auxiliary'); 
app.use(auxiliary); 

app.get('/', function (req, res) {
  res.render('index',{
		title:"LecturuS"
	});
});

app.get('/*', function (req, res) {
	res.send(405,'page not allowed lecturus')
});
