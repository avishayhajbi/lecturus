// var url = require('url');
// var fs = require("fs-extra");
// var keyword_extractor = require("keyword-extractor");
var express = require('express');
var mysql = require('mysql');
var path = require('path');
//var bodyParser  = require('body-parser');
var app = express();

app.use(express.static(path.join(__dirname ,'views')));
//app.use(bodyParser({limit: '50mb'}));
//app.use(bodyParser.urlencoded({extended: true}));
//app.use(bodyParser.json());

// middleware to check: 'Passport' -> for users managing

var port = process.env.PORT || 8080;
app.set('port', port);
app.set('view engine', 'ejs');
/*
config ={
	host:"127.0.0.1",
	user:"root",
	password:"",
	database:"lecturus",
	port: 3306
}
*/
config ={
	host: "ec2-54-243-42-236.compute-1.amazonaws.com",
    user: "ihhupboopjhnqz",
    password: "oJBn8QUP7mIHfzDBhdJcTIWU7q",
    database: "dail39ouojtvjl",
    port: "5432"
};

/*pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    port: config.port
});*/


app.listen(app.get('port'), function () {
    console.log('Server running...');
});

//var lec_users = require('./server_users'); // can use app.use( '/folderName' ,require('lecturus_users'));
//app.use(lec_users); 

app.get('/', function (req, res) {
	//res.render('index',{
		//title:"LecturuS"
	//});
	
	//res.end(fs.readFileSync('views/index.html', 'utf8'));
	res.send('Hello World');
});

app.get('/*', function (req, res) {
	res.send(405,'page not allowed lecturus')
});
