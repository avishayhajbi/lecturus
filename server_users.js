var express = require('express');
var router = express.Router();


var createUserTable = "CREATE TABLE if not exists `"+config.database+"`.`user` ("+  
"`email` varchar(45) NOT NULL,"+
"`name` varchar(45) NOT NULL,"+
"`organization` varchar(45) NOT NULL,"+
"`like` int(11) NOT NULL,"+
"`dislike` int(11) NOT NULL,"+
"`rate` int(11) NOT NULL,"+
"PRIMARY KEY (`email`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";

var createGroupTable = "CREATE TABLE if not exists `"+config.database+"`.`group` ("+  
"`groupId` int(11) NOT NULL AUTO_INCREMENT,"+
"`name` varchar(45) NOT NULL,"+
"`date` date NOT NULL,"+
"PRIMARY KEY (`groupId`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";
  
var createUser_contactsTable = "CREATE TABLE if not exists `"+config.database+"`.`user_contacts` ("+  
"`email` varchar(45) NOT NULL,"+
"`friendId` varchar(45) NOT NULL,"+
"PRIMARY KEY (`email`,`friendId`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";

var createOrganizationTable = "CREATE TABLE if not exists `"+config.database+"`.`organization` ("+	  
"`organizationId` int(11) NOT NULL AUTO_INCREMENT,"+
"`name` varchar(45) NOT NULL,"+
"PRIMARY KEY (`organizationId`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";
  
var createUser_groupTable = "CREATE TABLE if not exists `"+config.database+"`.`user_group` ("+	  
"`groupId` INT NOT NULL,"+
"`email` VARCHAR(45) NOT NULL,"+
"PRIMARY KEY (`groupId`, `email`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";
  
var createUser_organizationTable = "CREATE TABLE if not exists `"+config.database+"`.`user_organization` ("+	  
"`organizationId` int(11) NOT NULL,"+
"`email` varchar(45) NOT NULL,"+
"PRIMARY KEY (`organizationId`,`email`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";

var tables = [createUserTable,createGroupTable,createUser_contactsTable,createOrganizationTable,
			createUser_groupTable,createUser_organizationTable]; 

/*
create user tables
*/
pool.getConnection(function (err, connection) {
	if(err) { console.log(err); return; }
	for(var i=0;i<tables.length;i++){
		connection.query(tables[i], function (err, result){
	    	if (err != null) {
	    		console.log("query error "+err);
    		}
	    	else if (err == null) {
	    		//console.log("Create Tables done");
	    	}
		});
		connection.end();
	}
	console.log("Create Tables done");
});


router.get('/users', function (req, res) {
	res.render('index',{
		title:"Users API",
		info:"users api content"
	});
	// res.redirect('/'); if i want to exe another function	
});


/*
POST registerUser recieve data:{"email":"" , "organization":""}
if error occured return status 0
if user register return status 1 
if user exist return status 2 
return json {"uid":"","status":0-2,"desc":""}
*/
router.post("/users/registerUser", function(req, res) {
    var data = JSON.parse(req.body.data);
    pool.getConnection(function (err, connection) {
    	if(err) { console.log(err); return; }
    	connection.query('INSERT INTO `'+config.database+'`.`user` SET ?', data, function (err, result){
	    	var r={};
	    	if (err != null && err.code == 'ER_DUP_ENTRY') {
	    		console.log("exist",data.email);
    			r.uid=data.email;
    			r.status=2;
    			r.desc="exist";
	    		res.send(JSON.stringify(r))
	    	}
	    	else if (err == null) {
	    		console.log("register",data.email);
	    		r.uid=data.email;
    			r.status=1;
    			r.desc="register";
	    		res.send(JSON.stringify(r))
	    	}
	    	else {
	    		console.log("query error ",err);
	    		r.uid=0;
    			r.status=0;
    			r.desc="err";
	    		res.send(JSON.stringify(r))
	    	}
    	});
	    connection.end();
    });
});

/*
POST getUser by id recieve {id:email} 
if fail return {status:0}
if success return json {dislike:NUM,email:"",like:NUM,name:"",organization:"", rate:NUM}
*/
router.post("/users/getUser", function(req, res) {
    var data = req.body.id;
    pool.getConnection(function (err, connection) {
    	if(err) { console.log(err); return; }
    	connection.query('select * from `'+config.database+'`.`user` where email like ?', [data], function (err, result){
	    	var r={};
	    	if (err != null) {
	    		console.log("query getUser (post)  error "+err);
	    		r.status=0;
	    		res.send(JSON.stringify (r))
	    	}
	    	else if (err == null) {
	    		console.log("query getUser (post) done");
	    		res.send(JSON.stringify (result))
	    	}
    	});
	    connection.end();
    });
});

/*
GET getUser by id recieve {id:email} 
if fail return {status:0}
if success return json {dislike:NUM,email:"",like:NUM,name:"",organization:"", rate:NUM}
*/
router.get("/users/getUser/:id?", function(req, res) { // :id?/:something?
    var data = req.query.id;
    pool.getConnection(function (err, connection) {
    	if(err) { console.log(err); return; }
    	connection.query('select * from `'+config.database+'`.`user` where email like ?', [data], function (err, result){
	    	var r={};
	    	if (err != null) {
	    		console.log("query getUser (get) error "+err);
	    		r.status=0;
	    		res.send(JSON.stringify (r))
	    	}
	    	else if (err == null) {
	    		console.log("query getUser (get) done");
	    		res.send(JSON.stringify (result))
	    	}
    	});
    	connection.end();
    });
});

/*
GET updateUser by id recieve data:{email:email} and combines with the params {dislike:NUM,like:NUM,name:"",organization:"", rate:NUM}
fail return {status:0}
success return {status:1}
*/
router.post("/users/updateUser", function(req, res) {
    var data = JSON.parse(req.body.data);
    console.log(data)
    pool.getConnection(function (err, connection) {
    	if(err) { console.log(err); return; }
    	connection.query('UPDATE `'+config.database+'`.`user` SET ? WHERE email = ?', [data,data.email], function (err, result){
	    	var r={};
	    	if (err != null) {
	    		console.log("query updateUser error "+err);
	    		r.status=0;
	    		res.send(JSON.stringify(r))
	    	}
	    	else if (err == null) {
	    		console.log("query updateUser done");
	    		r.status=1;
	    		res.send(JSON.stringify(r))
	    	}
    	});
    	connection.end();
    });
});

module.exports = router;
