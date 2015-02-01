var express = require('express');
// var url = require('url');
// var mysql = require('mysql');
// var path = require('path');
// var fs = require("fs-extra");
var bodyParser  = require('body-parser');
// var keyword_extractor = require("keyword-extractor");
var app = express();

app.use(express.static((__dirname , '/views'))); //path.join
app.use(bodyParser({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
// middleware to check: 'Passport' -> for users managing

var port = process.env.PORT || 5000;
app.set('port', port);
/*
config ={
	host:"127.0.0.1",
	user:"root",
	password:"",
	database:"lecturus",
	listen: port
}

pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
});
*/

app.listen(app.get('port'), function () {
    console.log('Server running...');
});

//var lec_users = require('./server_users'); // can use app.use( '/folderName' ,require('lecturus_users'));
//app.use(lec_users); 

app.get('/', function (req, res) {
	//res.end(fs.readFileSync('views/index.html', 'utf8'));
	//res.render('index',{
		//title:"LecturuS"
	//});

	res.send('Hello World');
	//res.render('./views/index.ejs');
});

app.get('*', function (req, res) {
	res.send(405,'page not allowed lecturus')
});
// do not forget to exe npm init to creating a config file
// can use the server : azure, heroku -> 12 factor.net 