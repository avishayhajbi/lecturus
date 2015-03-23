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

/*if (port == 8080)
  config ={
  	host:"127.0.0.1",
  	user:"root",
  	password:"",
  	database:"lecturus",
  	port: 3306,
    mongoUrl:'mongodb://localhost:27017/lecturus'
  }
else*/
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

function keepAlive(){
  try{
    pool.getConnection(function(err, connection){
    if(err) { return; }
    connection.ping();
    connection.end();
    });
  }catch(err){}
}
setInterval(keepAlive, 30000);

var lec_users = require('./s_users'); // can use app.use( '/folderName' ,require('lecturus_users'));
app.use(lec_users); 
var session = require('./s_session'); // can use app.use( '/folderName' ,require('lecturus_users'));
app.use(session); 

app.get('/', function (req, res) {
  res.render('index',{
		title:"LecturuS"
	});
});

app.get('/*', function (req, res) {
	res.send(405,'page not allowed lecturus')
});

 /*MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {
      if (err) return;
      assert.equal(null, err);
      // insert the jsons below
      //db.collection('coll_test').insert([{a:1}, {b:1}, {c:2}], {upsert:true}, function(err, result) {
      // update the first match a:1 to b:8 if not exist insert
      db.collection('coll_test').update({a:1}, {b:8}, {upsert:true}, function(err, result) { 
        assert.equal(null, err);
        //assert.equal(1, result);
        console.log('done update mongodb')
        db.close();
        mongocallback();
      });
    });*/

/*var mongocallback = function(){
  MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {
    var collection = db.collection('coll_test');
    collection.find().toArray(function (err, docs) {
      //console.log(docs)
      db.close();
    });
  });
}*/