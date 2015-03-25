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
                res.send(lecturusCallback(JSON.stringify(r)))
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
                        r.desc="register";
                        db.close();
                        res.send(lecturusCallback(JSON.stringify(r)))
                    });
                }
                // if the user exist update the user data
                /*else{
                     collection.update({email:data.email},data, {upsert:true ,safe:true , fsync: true}, function(err, result) { 
                        console.log("exist",data.email);
                        r.uid=data.email;
                        r.status=2;
                        r.desc="user updated";
                        db.close();
                        res.send(lecturusCallback(JSON.stringify(r)))
                     });
                 }*/
                 else {
                        console.log("exist",data.email);
                        r.uid=data.email;
                        r.status=2;
                        r.desc="user exist";
                        db.close();
                        res.send(lecturusCallback(JSON.stringify(r)))
                 }
            });
        });
        else{ // if data.email not exist or empty
            r.status=0;
            r.desc="uid error";
            res.send(lecturusCallback(JSON.stringify(r)));     
        }
    // if the data parsing failed
    }catch(err){
        var r={};
        r.status=0;
        r.desc="data error";
    	res.send(lecturusCallback(JSON.stringify(r)));
    }
});

/* /users/getUser -- precondition
  json data with email  
*/
/* /users/getUser -- postcondition
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
                res.send(lecturusCallback(JSON.stringify(r)))
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
                    res.send(lecturusCallback(JSON.stringify(r)))
                }
                // if the user exist
                else {
                    delete docs[0]._id
                    r.info = docs[0];
                    r.status=1;
                    r.desc="exist";
                    db.close();
                    res.send(lecturusCallback(JSON.stringify(r)))
                 }
            });
        });
        // if data.email not exist or empty
        else{
            r.status=0;
            r.desc="uid error";
            res.send(lecturusCallback(JSON.stringify(r)));     
        }
    // if the parsing failed
    }catch(err){
        var r={};
        r.status=0;
        r.desc="data error";
        res.send(lecturusCallback(JSON.stringify(r)));
    }
    
});

/* /users/getActiveUsers -- precondition
  json data with email, org  
*/
/* /users/getActiveUsers -- postcondition
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
                res.send(lecturusCallback(JSON.stringify(r)))
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
                    res.send(lecturusCallback(JSON.stringify(r)))
                }
                // if the user exist
                else {
                    r.users = docs;
                    r.status=1;
                    r.desc="active users";
                    db.close();
                    res.send(lecturusCallback(JSON.stringify(r)))
                 }
            });
        });
        // if data.email not exist or empty
        else{
            r.status=0;
            r.desc="uid error";
            res.send(lecturusCallback(JSON.stringify(r)));     
        }
    // if the parsing failed
    }catch(err){
        var r={};
        r.status=0;
        r.desc="data error";
        res.send(lecturusCallback(JSON.stringify(r)));
    }
    
});

/* /users/updateUser -- precondition
  json data with email, any other fields
*/
/* /users/updateUser -- postcondition
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
                res.send(lecturusCallback(JSON.stringify(r)))
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
                    res.send(lecturusCallback(JSON.stringify(r)))
                }
                // if the user exist update the user data
                else{
                     collection.update({email:data.email},data, {upsert:true ,safe:true , fsync: true}, function(err, result) { 
                        console.log("user updated",data.email);
                        r.uid=data.email;
                        r.status=1;
                        r.desc="user updated";
                        db.close();
                        res.send(lecturusCallback(JSON.stringify(r)))
                     });
                 }
            });
        });
        else{ // if data.email not exist or empty
            r.status=0;
            r.desc="uid error";
            res.send(lecturusCallback(JSON.stringify(r)));     
        }
    // if the data parsing failed
    }catch(err){
        var r={};
        r.status=0;
        r.desc="data error";
        res.send(lecturusCallback(JSON.stringify(r)));
    }
});

/* /users/getCourses -- precondition
  data with email
*/
/* /users/getCourses -- postcondition
  json data with status 1/0, all user courses hierarchy
*/
router.get("/users/getCourses:email?", function(req, res) {
    try{
        // try to jet data
        var email = req.query.email;    

        // check if email field exist and no empty
        if (email && email!="")
        // try to connect to mongodb
        MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {
            var r={};
            // if the connection failed return message and exit
            if (err) {
                console.log("query error ",err);
                r.uid=0;
                r.status=0;
                r.desc="err db";
                res.send(lecturusCallback(JSON.stringify(r)))
                return;
            }
            // ask for users collection
            var collection = db.collection('users');
            // try to find user id 
            collection.find({email:email}).toArray(function (err, docs) {
                // if the user not exist
                if (!docs.length) {
                    r.uid=0;
                    r.status=0;
                    r.desc="uid not exist";
                    db.close();
                    res.send(lecturusCallback(JSON.stringify(r)))
                }
                // if the user exist return organization courses
                else {
                    delete docs[0]._id
                    var org = docs[0].org;
                    r ={
                        status:1,
                        degrees: (fs.existsSync('./views/json/'+org+'.json'))?JSON.parse(fs.readFileSync('./views/json/'+org+'.json', 'utf8')):[]
                    }
                    db.close();
                    res.send(lecturusCallback(JSON.stringify(r)))
                 }
            });
        });
        // if data.email not exist or empty
        else{
            r.status=0;
            r.desc="uid error";
            res.send(lecturusCallback(JSON.stringify(r)));     
        }
    // if the parsing failed
    }catch(err){
        var r={};
        r.status=0;
        r.desc="data error";
        res.send(lecturusCallback(JSON.stringify(r)));
    }    
});

/* /users/getCourseVideos -- precondition
  data with email, courseId, lessonId
*/
/* /users/getCourseVideos -- postcondition
  json data with status 1/0, all related videos
*/
router.get("/users/getCourseVideos/:email?:courseId?:lessonId?", function(req, res) {
    try{
        var data={};
        data.email = req.query.email;
        data.courseId = req.query.courseId;
        data.lessonId = req.query.lessonId;
        var r ={
        status:1,
        videos:[{
                title:"אוטומטים ושפות ופרמאליות",
                owner:"avishay",
                participants:["ofir","vidran"],
                length:15895,
                sessionId: 1426236025252127001
            }]
        }
        res.send(lecturusCallback(JSON.stringify(r)))
    }catch(err){
        var r ={
        status:0,
        desc:"data error"
        }
       res.send(lecturusCallback(JSON.stringify(r)))
    }
    
});

/* /users/lecturusCallback -- precondition
  json data
*/
/* /users/lecturusCallback -- postcondition
  json data callback lecturusCallback
*/
function lecturusCallback (obj){
    //return 'lecturusCallback('+obj+');';
    return obj;
}
module.exports = router;
