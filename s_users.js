var express = require('express');
var fs = require("fs-extra");
var router = express.Router();

router.get('/users', function (req, res) {
	res.render('users',{
		title:"Users API"
	});
	
});

/*
POST registerUser recieve data:{"email":""}
if error occured return status 0
if user register return status 1 
if user exist return status 2 
return json {"uid":"","status":0-2,"desc":""}
*/
router.post("/users/registerUser", function(req, res) {
    try{
        //try to parse json data
    	var data = JSON.parse(req.body.data); 
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
                if (!docs.length)
                    // insert new user to users collection 
                    collection.insert(data, {upsert:true, safe:true , fsync: true}, function(err, result) {
                        console.log("register",data.email);
                        r.uid=data.email;
                        r.status=1;
                        r.desc="register";
                        db.close();
                        res.send(lecturusCallback(JSON.stringify(r)))
                    });
                // if the user exist update the user data
                else{
                     collection.update({email:data.email},data, {upsert:true ,safe:true , fsync: true}, function(err, result) { 
                        console.log("exist",data.email);
                        r.uid=data.email;
                        r.status=2;
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

/*
POST getUser by id recieve {data:email} 
if fail return {status:0}
if success return json {dislike:NUM,email:"",like:NUM,name:"",organization:"", rate:NUM}
*/
router.post("/users/getUser", function(req, res) {
    try{
        //try to parse json data
        var data = JSON.parse(req.body.data); 
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
                    docs[0].user_id = true;
                    docs[0].camera_awake = true;
                    docs[0].system_language = true;
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

/*
GET updateUser by id recieve data:{email:email} and combines with the params {dislike:NUM,like:NUM,name:"",organization:"", rate:NUM}
fail return {status:0}
success return {status:1}
*/
router.post("/users/updateUser", function(req, res) {
    try{
        //try to parse json data
        var data = JSON.parse(req.body.data); 
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
                        console.log("exist",data.email);
                        r.uid=data.email;
                        r.status=2;
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


function lecturusCallback (obj){
	//return 'lecturusCallback('+obj+');';
	return obj;
}

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
                        courses: (fs.existsSync('./views/json/'+org+'.json'))?JSON.parse(fs.readFileSync('./views/json/'+org+'.json', 'utf8')):[]
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

router.get("/users/getCourseVideos/:email?:courseName?", function(req, res) {
    try{
        var data={};
        data.email = req.query.email;
        data.courseName = req.query.courseName;
        var r ={
        status:1,
        videos:[{
                title:"אוטומטים ושפות ופרמאליות",
                owner:"avishay",
                participants:["ofir","vidran"],
                length:15895,
                id:"temp"
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
module.exports = router;
