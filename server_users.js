var express = require('express');

var router = express.Router();


var createUserTable = "CREATE TABLE if not exists `lecturus`.`user` ("+  
"`email` varchar(45) NOT NULL,"+
"`name` varchar(45) NOT NULL,"+
"`organization` varchar(45) NOT NULL,"+
"`like` int(11) NOT NULL,"+
"`dislike` int(11) NOT NULL,"+
"`rate` int(11) NOT NULL,"+
"PRIMARY KEY (`email`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";

var createGroupTable = "CREATE TABLE if not exists `lecturus`.`group` ("+  
"`groupId` int(11) NOT NULL AUTO_INCREMENT,"+
"`name` varchar(45) NOT NULL,"+
"`date` date NOT NULL,"+
"PRIMARY KEY (`groupId`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";
  
var createUser_contactsTable = "CREATE TABLE if not exists `lecturus`.`user_contacts` ("+  
"`email` varchar(45) NOT NULL,"+
"`friendId` varchar(45) NOT NULL,"+
"PRIMARY KEY (`email`,`friendId`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";

var createOrganizationTable = "CREATE TABLE if not exists `lecturus`.`organization` ("+	  
"`organizationId` int(11) NOT NULL AUTO_INCREMENT,"+
"`name` varchar(45) NOT NULL,"+
"PRIMARY KEY (`organizationId`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";
  
var createUser_groupTable = "CREATE TABLE if not exists `lecturus`.`user_group` ("+	  
"`groupId` INT NOT NULL,"+
"`email` VARCHAR(45) NOT NULL,"+
"PRIMARY KEY (`groupId`, `email`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";
  
var createUser_organizationTable = "CREATE TABLE if not exists `lecturus`.`user_organization` ("+	  
"`organizationId` int(11) NOT NULL,"+
"`email` varchar(45) NOT NULL,"+
"PRIMARY KEY (`organizationId`,`email`)"+
") ENGINE=InnoDB DEFAULT CHARSET=latin1;";

var tables = [createUserTable,createGroupTable,createUser_contactsTable,createOrganizationTable,
			createUser_groupTable,createUser_organizationTable]; 

pool.getConnection(function (err, connection) {
	for(var i=0;i<tables.length;i++){
		connection.query(tables[i], function (err, result){
	    	if (err != null) {
	    		console.log("query error "+err);
    		}
	    	else if (err == null) {
	    		//console.log("Create Tables done");
	    	}
		});
	}
	console.log("Create Tables done");
});

router.get('/users', function (req, res) {
	res.render('index',{
		title:"Users page sample"
	});

	// res.redirect('/'); if i want to exe another function	
	//res.send('loading');
	//res.render('./views/index.ejs');
	
});

router.post("/users/registerUser", function(req, res) {
    var data = JSON.parse(req.body.data);
    pool.getConnection(function (err, connection) {
    	for(var i=0;i<data.length;i++){
	    	connection.query('INSERT INTO `lecturus`.`user` SET ?', data[i], function (err, result){
		    	if (err != null) {
		    		console.log("query error "+err);
		    	}
		    	else if (err == null) {
		    		console.log("query done");
		    	}
	    	});
    	}
    	res.send("done register user/s")
    });
});

router.post("/users/getUser", function(req, res) {
    var data = req.body.data;
    pool.getConnection(function (err, connection) {
    	connection.query('select * from `lecturus`.`user` where email like ?', [data], function (err, result){
	    	if (err != null) {
	    		console.log("query error "+err);
	    		res.send("error getting user")
	    	}
	    	else if (err == null) {
	    		console.log("query done");
	    		res.send(JSON.stringify (result))
	    	}
    	});
    	
    });
});

router.get("/users/getUser/:id?", function(req, res) { // :id?/:something?
    var data="";
    data = req.query.id;
    pool.getConnection(function (err, connection) {
    	connection.query('select * from `lecturus`.`user` where email like ?', [data], function (err, result){
	    	if (err != null) {
	    		console.log("query error "+err);
	    		res.send("error getting user")
	    	}
	    	else if (err == null) {
	    		console.log("query done");
	    		res.send(JSON.stringify (result))
	    	}
    	});
    	
    });
});

module.exports = router;
