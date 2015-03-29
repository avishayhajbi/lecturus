var express = require('express');
var fs = require("fs-extra");
var router = express.Router();

router.get('/users', function (req, res) {
	res.render('users',{
		title:"Users API"
	});
	
});

/* /users/registerUser -- precondition
  json data with email, any other fileds like active true/false  
*/
/* /users/registerUser -- postcondition
    insert new user into users collection in mongodb
  json data with status 1/0
*/
router.post("/users/registerUser", function(req, res) {
    try{
        //try to parse json data
    	var data = req.body; 
        // check if the field email exist and not empty
        if (data.email && data.email!="")
        // connect to mongodb 
        MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {
            var r={};
            // if mongodb connection failed return error message and exit
            if (err) {
                console.log("query error ",err);
                r.uid=0;
                r.status=0;
                r.desc="err db";
                res.send((JSON.stringify(r)))
                return;
            }
            // if mongodb connection success asking for users collection
            var collection = db.collection('users');
            // find user id from users collection
            collection.find({email:data.email}).toArray(function (err, docs) {
                // if the user not exist register the user
                if (!docs.length){
                    // insert new user to users collection 
                    collection.insert(data, {upsert:true, safe:true , fsync: true}, function(err, result) {
                        console.log("register",data.email);
                        r.uid=data.email;
                        r.status=1;
                        r.active = false;
                        r.desc="register";
                        db.close();
                        res.send((JSON.stringify(r)))
                    });
                }
                 else {
                        console.log("exist",data.email);
                        r.uid=data.email;
                        r.status=2;
                        r.desc="user exist";
                        db.close();
                        res.send((JSON.stringify(r)))
                 }
            });
        });
        else{ // if data.email not exist or empty
            r.status=0;
            r.desc="uid error";
            res.send((JSON.stringify(r)));     
        }
    // if the data parsing failed
    }catch(err){
        var r={};
        r.status=0;
        r.desc="data error";
    	res.send((JSON.stringify(r)));
    }
});

/* /users/getUser -- precondition
  json data with email  
*/
/* /users/getUser -- postcondition
    get user info from the users mongo collection 
  json data with status 1/0, all user data
*/
router.post("/users/getUser", function(req, res) {
    try{
        //try to parse json data
        var data = req.body; 
        // check if the field email exist and not empty
        if (data.email && data.email!="")
        // try to connect to mongodb
        MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {
            var r={};
            // if the connection failed return message and exit
            if (err) {
                console.log("query error ",err);
                r.uid=0;
                r.status=0;
                r.desc="err db";
                res.send((JSON.stringify(r)))
                return;
            }
            // ask for users collection
            var collection = db.collection('users');
            // try to find user id 
            collection.find({email:data.email}).toArray(function (err, docs) {
                // if the user not exist
                if (!docs.length) {
                    r.uid=0;
                    r.status=0;
                    r.desc="uid not exist";
                    db.close();
                    res.send((JSON.stringify(r)))
                }
                // if the user exist
                else {
                    delete docs[0]._id
                    r.info = docs[0];
                    r.status=1;
                    r.desc="exist";
                    db.close();
                    res.send((JSON.stringify(r)))
                 }
            });
        });
        // if data.email not exist or empty
        else{
            r.status=0;
            r.desc="uid error";
            res.send((JSON.stringify(r)));     
        }
    // if the parsing failed
    }catch(err){
        var r={};
        r.status=0;
        r.desc="data error";
        res.send((JSON.stringify(r)));
    }
    
});

/* /users/getActiveUsers -- precondition
  json data with email, org  
*/
/* /users/getActiveUsers -- postcondition
    get all active users from the same organization
  json data with status 1/0, all active users
*/
router.post("/users/getActiveUsers", function(req, res) {
    try{
        //try to parse json data
        var data = req.body;
        // check if the field email exist and not empty
        if (data.email && data.email!="")
        // try to connect to mongodb
        MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {
            var r={};
            // if the connection failed return message and exit
            if (err) {
                console.log("query error ",err);
                r.uid=0;
                r.status=0;
                r.desc="err db";
                res.send((JSON.stringify(r)))
                return;
            }
            // ask for users collection
            var collection = db.collection('users');
            // try to find user id 
            collection.find({org:data.org, active:true}).toArray(function (err, docs) {
                // if the user not exist
                if (!docs.length) {
                    r.uid=0;
                    r.status=0;
                    r.desc="no one active";
                    db.close();
                    res.send((JSON.stringify(r)))
                }
                // if the user exist
                else {
                    r.users = docs;
                    r.status=1;
                    r.desc="active users";
                    db.close();
                    res.send((JSON.stringify(r)))
                 }
            });
        });
        // if data.email not exist or empty
        else{
            r.status=0;
            r.desc="uid error";
            res.send((JSON.stringify(r)));     
        }
    // if the parsing failed
    }catch(err){
        var r={};
        r.status=0;
        r.desc="data error";
        res.send((JSON.stringify(r)));
    }
    
});

/* /users/updateUser -- precondition
  json data with email, any other fields
*/
/* /users/updateUser -- postcondition
    update user by email
  json data with status 1/0
*/
router.post("/users/updateUser", function(req, res) {
    try{
        //try to parse json data
        var data = req.body; 
        // check if the field email exist and not empty
        if (data.email && data.email!="")
        // connect to mongodb 
        MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {
            var r={};
            // if mongodb connection failed return error message and exit
            if (err) {
                console.log("query error ",err);
                r.uid=0;
                r.status=0;
                r.desc="err db";
                res.send((JSON.stringify(r)))
                return;
            }
            // if mongodb connection success asking for users collection
            var collection = db.collection('users');
            // find user id from users collection
            collection.find({email:data.email}).toArray(function (err, docs) {
                // if the user not exist 
                if (!docs.length) {
                    console.log("user not exist",data.email);
                    r.uid=data.email;
                    r.status=0;
                    r.desc="user is not exist";
                    db.close();
                    res.send((JSON.stringify(r)))
                }
                // if the user exist update the user data
                else{
                     collection.update({email:data.email},data, {upsert:true ,safe:true , fsync: true}, function(err, result) { 
                        console.log("user updated",data.email);
                        r.uid=data.email;
                        r.status=1;
                        r.desc="user updated";
                        db.close();
                        res.send((JSON.stringify(r)))
                     });
                 }
            });
        });
        else{ // if data.email not exist or empty
            r.status=0;
            r.desc="uid error";
            res.send((JSON.stringify(r)));     
        }
    // if the data parsing failed
    }catch(err){
        var r={};
        r.status=0;
        r.desc="data error";
        res.send((JSON.stringify(r)));
    }
});



module.exports = router;
