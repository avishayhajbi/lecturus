// var url = require('url');
// var fs = require("fs-extra");
// var keyword_extractor = require("keyword-extractor");
var express = require('express');
var mysql = require('mysql');
var path = require('path');
var bodyParser  = require('body-parser');
var app = express();

app.use(express.static(path.join(__dirname ,'views')));
app.use(bodyParser({limit: '50mb'}));
//app.use(bodyParser.urlencoded());
//app.use(bodyParser.json());

// middleware to check: 'Passport' -> for users managing

var port = process.env.PORT || 8080;
app.set('port', port);
app.set('view engine', 'ejs');

config ={
	host:"127.0.0.1",
	user:"root",
	password:"",
	database:"lecturus",
	port: 3306
}
/*
config ={
	host: "us-cdbr-iron-east-01.cleardb.net",
    user: "b6b0cb1a9491cd",
    password: "b7303e31",
    database: "heroku_1e8a14a4e8e7685",
    port: 3306,
    databaseURL: "postgres://ihhupboopjhnqz:oJBn8QUP7mIHfzDBhdJcTIWU7q@ec2-54-243-42-236.compute-1.amazonaws.com:5432/dail39ouojtvjl",
    Psql: "heroku pg:psql --app heroku-postgres-fa76e44a HEROKU_POSTGRESQL_SILVER"
};
*/
pool = mysql.createPool(config);

app.listen(app.get('port'), function () {
    console.log('Server running...');
});

var lec_users = require('./server_users'); // can use app.use( '/folderName' ,require('lecturus_users'));
app.use(lec_users); 

app.get('/', function (req, res) {
	res.render('index',{
		title:"LecturuS"
	});
	
	//res.end(fs.readFileSync('views/index.html', 'utf8'));
	//res.send('Hello World');
});

app.get('/*', function (req, res) {
	res.send(405,'page not allowed lecturus')
});

var connection;
function handleDisconnect() {
  connection = mysql.createConnection(config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();