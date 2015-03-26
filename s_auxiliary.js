var express = require('express');
var fs = require("fs-extra");
var router = express.Router();

/* /users/getCourses -- precondition
  data with email
*/
/* /users/getCourses -- postcondition
    return all related courses to user
  json data with status 1/0, all user courses hierarchy
*/
router.post("/auxiliary/getCourses", function(req, res) {
    try{
        // try to get data
        var email = req.body.email;    

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
                res.send((JSON.stringify(r)))
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
                    res.send((JSON.stringify(r)))
                }
                // if the user exist return organization courses
                else {
                    delete docs[0]._id
                    var org = docs[0].org;
                    r ={
                        status:1,
                        degrees: (fs.existsSync('./courses/'+org+'.json'))?JSON.parse(fs.readFileSync('./courses/'+org+'.json', 'utf8')):[]
                    }
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
        r.desc="data error "+err;
        res.send((JSON.stringify(r)));
    }    
});

/* /users/getCourseVideos -- precondition
  data with email, degree (id), course (id)
*/
/* /users/getCourseVideos -- postcondition
    return all related videos by combination between user email degree and course
  json data with status 1/0, all related videos
*/
router.get("/users/getCourseVideos/:email?:degree?:course?", function(req, res) {
    try{
        var data={};
        data.email = req.query.email;
        data.courseId = req.query.degree || "";
        data.lessonId = req.query.course || "";
        var r ={
        status:1,
        videos:[{
                title:"אוטומטים ושפות ופרמאליות",
                owner:"avishay",
                description:"description",
                participants:["ofir","vidran"],
                length:15895,
                sessionId: 1426236025252127001
            }]
        }
        res.send((JSON.stringify(r)))
    }catch(err){
        var r ={
        status:0,
        desc:"data error"
        }
       res.send((JSON.stringify(r)))
    }
    
});

module.exports = router;