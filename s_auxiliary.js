var express = require('express');
var fs = require("fs-extra");
var router = express.Router();
var gcm = require('node-gcm');
//var gcm = require('gcm').GCM;

/* /auxiliary/getCourses -- precondition
 * data with email
 *
 * /auxiliary/getCourses -- postcondition
 * return all related courses to user
 * json data with status 1/0, all user courses hierarchy
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

/* 
 
*/
router.post("/auxiliary/getCoursesByOrg", function(req, res) {
    try{
        // try to get data
        var org = req.body.org;    

        // check if email field exist and no empty
        if (org && org!="")
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
            var collection = db.collection('academic_degrees');
            // try to find user id 
            collection.find({org:org}, {_id:false, academicId:false, org: false}).toArray(function (err, docs) {
                // if the user not exist
                if (!docs.length) {
                    r.status=0;
                    r.desc="org not exist";
                    db.close();
                    res.send((JSON.stringify(r)))
                }
                // if the user exist return organization courses
                else {
                    r ={
                        status:1,
                        check: docs[0].check,
                        degrees: docs[0][org]
                    }
                    db.close();
                    res.send((JSON.stringify(r)))
                }
            });
        });
        // if data.email not exist or empty
        else{
            r.status=0;
            r.desc="org error";
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

/* 

*/
router.post("/auxiliary/checkCoursesChanges", function(req, res) {
    try{
        // try to get data
        var data = req.body;    
        
        // check if email field exist and no empty
        if (data && data!="" )
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
            var collection = db.collection('academic_degrees');
            // try to find user id 
            collection.find({org:data.org}, {_id:false, academicId:false, org: false}).toArray(function (err, docs) {
                // if the user not exist
                if (!docs.length) {
                    r.status=0;
                    r.desc="org not exist";
                    db.close();
                    res.send((JSON.stringify(r)))
                }
                // if the user exist return organization courses
                else {
                    data.check = data.check || 0;
                    if (docs[0].check == data.check)
                        r ={
                            status:2,
                            desc:'no courses changes'
                        //info: docs[0]
                        //degrees: (fs.existsSync('./courses/'+org+'.json'))?JSON.parse(fs.readFileSync('./courses/'+org+'.json', 'utf8')):[]
                    }
                    else 
                        r ={
                            status:1,
                            check: docs[0].check,
                            degrees: docs[0][data.org]  
                        }
                        db.close();
                        res.send((JSON.stringify(r)))
                    }
                });
});
        // if data.email not exist or empty
        else{
            r.status=0;
            r.desc="org error";
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

/* /auxiliary/getSessionsByCourse -- precondition
  data with email, degree (id), course (id)

   /auxiliary/getSessionsByCourse -- postcondition
    return all related videos by combination between user email degree and course
    json data with status 1/0, all related videos
*/
router.get("/auxiliary/getSessionsByCourse/:email?:degree?:course?", function(req, res) {
    var r ={};
    var data={};
    try
    {
        data.email = req.query.email;
        data.degreeId = parseInt(req.query.degree);
        data.courseId = parseInt(req.query.course);
        data.from = req.body.from || 0;
        data.to = req.body.to || 24;
    }catch(err){
        var r ={
            status:0,
            desc:"data error"
        }
        res.json(r);
        return;
    }
      if ( !data || data.email == '' )  // if data.name property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property name or its empty";
        res.json(r); 
        return;
    }

    console.log("looking for: "+data.name)
    db.model('sessions').find(  {$and:[{ degreeId : data.degreeId},
    {courseId : data.courseId || {$exists:true} }, {stopTime:{ $gt: 0  }} ] },
    sessionPreview).skip(data.from).limit(data.to)
    .exec(function(err, docs)
    {    
        // failure while connecting to sessions collection
        if (err) 
        {
            console.log("failure while trying get videos, the error: ", err);
            r.status = 0;
            r.desc = "failure while trying get videos.";
            res.json(r);
            return;
        }
        else
        {
            console.log("videos found "+ docs);
            r.status = 1;
            r.length=docs.length;
            r.res = docs;
            r.desc = "gfiltered videos";
            res.json(r);  
            return;                        
        }
    });         
});
/* /auxiliary/searchSessions -- precondition
   This function will receive data with name and org

    /auxiliary/searchSessions -- postcondition
    return all related videos by the query
    json data with status 1/0, length, res (for the results)

    /auxiliary/searchSessions -- description
    find sessions by searching into title, description, degree and course

    /auxiliary/searchSessions -- example
    name some_name
    org shenkar
*/
router.post("/auxiliary/searchSessions", function(req, res) {
    var r ={};
    var data={};
    try
    {
        data = req.body;
        data.from = req.body.from || 0;
        data.to = req.body.to || 24;
    }catch(err){
        var r ={
            status:0,
            desc:"data error"
        }
        res.json(r);
        return;
    }
      if ( !data || data.name == '' )  // if data.name property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property name or its empty";
        res.json(r); 
        return;
    }

    console.log("looking for: "+data.name)
    db.model('sessions').find( {$and:[{org:data.org}, {stopTime:{ $gt: 0  }} ,
    {$or:[{ title:{$regex : ".*"+data.name+".*"}},{ description:{$regex : ".*"+data.name+".*"}},
    { degree:{$regex : ".*"+data.name+".*"}},{ course:{$regex : ".*"+data.name+".*"}}, ]} ]  },
    sessionPreview).skip(data.from).limit(data.to)
    .exec(function(err, docs)
    {    
        // failure while connecting to sessions collection
        if (err) 
        {
            console.log("failure while trying get videos, the error: ", err);
            r.status = 0;
            r.desc = "failure while trying get videos.";
            res.send((JSON.stringify(r)));
            return;
        }
        
        else if (docs)
        {
            console.log("videos found "+ docs);
            r.status = 1;
            r.length=docs.length;
            r.res = docs;
            r.desc = "get videos.";
            res.send((JSON.stringify(r))); 
            return;                         
        }
    });         
});

/* /auxiliary/getTopRated -- precondition
   This function will receive data with org

    /auxiliary/getTopRated -- postcondition
    return all related videos in ordr by views
    json data with status 1/0, length, res (for the results)
*/
router.post("/auxiliary/getTopRated", function(req, res) {
    var r ={};
    var data={};
    try
    {
        data = req.body;
        data.from = req.body.from || 0;
        data.to = req.body.to || 24;
    }catch(err){
        var r ={
            status:0,
            desc:"data error"
        }
        res.json(r);
        return;
    }
      if ( !data || data.org == '' )  // if data.org property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property name or its empty";
        res.json(r); 
        return;
    }

    console.log("looking for videos: "+data.ord);
    db.model('sessions').find({$and:[{org:data.org},{stopTime:{$gt:0}}]}, sessionPreview).sort({views: -1}).skip(data.from).limit(data.to)
    .exec(function(err, docs)
    { 
        // failure while connecting to sessions collection
        if (err) 
        {
            console.log("failure while trying get videos, the error: ", err);
            r.status = 0;
            r.desc = "failure while trying get videos.";
            res.json(r);
            return;
        }
        
        else if (docs)
        {
            //console.log("videos found "+ docs);
            r.status = 1;
            r.length=docs.length;
            r.res = docs;
            r.desc = "get videos.";
            res.json(r); 
            return;                         
        }
    });         
});


/* /auxiliary/followedUsers -- precondition
   This function will receive data with email

    /auxiliary/followedUsers -- postcondition
    return all related videos user follow list
    json data with status 1/0, length, res (for the results)

    /auxiliary/followedUsers -- description
    This function will return all user favorites ordered by last update.

    /auxiliary/followedUsers -- example
    email: vandervidi@gmail.com
*/
router.post("/auxiliary/followedUsers", function(req, res) {
    var r ={};
    var data={};
    try
    {
        data = req.body;
        data.from = req.body.from || 0;
        data.to = req.body.to || 4;
    }catch(err){
        var r ={
            status:0,
            desc:"data error"
        }
        res.json(r);
        return;
    }
      if ( !data || !data.email ||data.email == '' )  // if data.name property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property email or its empty";
        res.json(r); 
        return;
    }

    db.model('users').findOne({email:data.email}, {follow:true,org:true,_id:false},
    function(err, docs)
    { 
        // failure while connecting to sessions collection
        if (err) 
        {
            console.log("failure while trying get videos, the error: ", err);
            r.status = 0;
            r.desc = "failure while trying get videos.";
            res.json(r);
            return;
        }
        
        else if (docs)
        {

            db.model('sessions').find({$and:[{owner:{$in:docs.follow}},{org:docs.org},{stopTime:{$gt:0}}]}, sessionPreview).sort({owner:1,views: -1}).skip(data.from).limit(data.to)
            .exec(function(err, result)
            { 
                // failure while connecting to sessions collection
                if (err) 
                {
                    console.log("failure while trying get videos, the error: ", err);
                    r.status = 0;
                    r.desc = "failure while trying get videos.";
                    res.json(r);
                    return;
                }
                
                else if (result)
                {
                    result = createKeyValJSON(result,'owner');
                    //console.log("videos found "+ result);
                    r.status = 1;
                    r.length=result.length;
                    r.res = result;
                    r.desc = "get videos.";
                    res.json(r); 
                    return;                         
                }
            });                        
        }
    });         
});

/*  
    auxiliary/userFavorites -- precondition
    This function will receive data with userId

    /auxiliary/userFavorites -- postcondition
    return all related videos user favorite list
    json data with status 1/0, length, res (for the results)

    /auxiliary/favritesActions -- description
    This function will return all user favorites ordered by last update.
  
    /auxiliary/favritesActions -- example
    userId           avishayhajbi@gmail.com
*/
router.post("/auxiliary/getUserFavorites", function(req, res) {
    var r ={};
    var data={};
    try
    {
        data = req.body;
        data.from = req.body.from || 0;
        data.to = req.body.to || 4;
    }catch(err){
        var r ={
            status:0,
            desc:"data error"
        }
        res.json(r);
        return;
    }
      if ( !data || !data.userId || data.userId == '' )  // if data.name property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property name or its empty";
        res.json(r); 
        return;
    }

    db.model('users').findOne({email:data.userId}, {favorites:true, org:true,_id:false},
    function(err, docs)
    { 
        // failure while connecting to sessions collection
        if (err) 
        {
            console.log("failure while trying get videos, the error: ", err);
            r.status = 0;
            r.desc = "failure while trying get videos.";
            res.json(r);
            return;
        }
        
        else if (docs)
        {
            db.model('sessions').find({$and:[{sessionId:{$in:docs.favorites}},{org:docs.org},{stopTime:{$gt:0}}]}, sessionPreview).sort({owner:1,views: -1}).skip(data.from).limit(data.to)
            .exec(function(err, result)
            { 
                // failure while connecting to sessions collection
                if (err) 
                {
                    console.log("failure while trying get videos, the error: ", err);
                    r.status = 0;
                    r.desc = "failure while trying get videos.";
                    res.json(r);
                    return;
                }
                
                else if (result)
                {
                    console.log("videos found "+ result);
                    r.status = 1;
                    r.length=result.length;
                    r.res = result;
                    r.desc = "get videos.";
                    res.json(r); 
                    return;                         
                }
            });                        
        }
    });         
});

/* /auxiliary/favritesActions -- precondition
 *  This function will receive json with sessionId and userId.
 *
 * /auxiliary/favritesActions -- postcondition
 *  This function will return json with status: 1 = success / 0 = failure.
 *
 * /auxiliary/favritesActions -- description
 *  This function will user favorites .
 * 
 * /auxiliary/favritesActions -- example
 *  sessionId               142964947916810933728
 *  userId           avishayhajbi@gmail.com
 */
 router.post("/session/addRemoveFavorites", function(req, res )
 {
   var r = { };

   try
   {
    var sessionId = req.body.sessionId;
    var userId = req.body.userId;
  }
  catch( err )
  {
    console.log("UPDATEFAVIRTES: failure while parsing the request, the error:" + err);
    r.status = 0;
    r.desc = "failure while parsing the request";
    res.json(r);
    return;
  }

  if ( typeof sessionId === 'undefined' || sessionId == null || sessionId == "" ||
       typeof userId === 'undefined' || userId == null || userId == "" )        // if one the propertiey do not exists in the request and it is empty
  {
   console.log("UPDATEFAVIRTES:request must contain sessionId property.");
   r.status = 0;    
   r.desc = "request must contain sessionId and userId property.";
   res.json(r); 
   return;
 }

 db.model('sessions').findOne( {$and:[{ sessionId : sessionId },{stopTime:{$gt:0}} ]},
    //{ participants : true, owner : true, _id : false },   - does not wotk with this
    function (err, result)
    {
      if (err) 
      {
        console.log("UPDATEFAVIRTES:failure during session search, the error: ", err);
        r.status = 0;
        r.desc = "failure during session search";
        res.json(r);    
        return;
      }
      if ( !result )
      {
       console.log("UPDATEFAVIRTES:session: " + sessionId + " was not found.");
       r.status = 0;
       r.desc = "session: " + sessionId + " was not found";
       res.json(r);
       return;
     }
     else
     {
      db.model('users').findOne({email: userId} ,
        function (err, userResult)
        {
          // failure during user search
          if (err) 
          {
            console.log("failure during user search, the error: ", err);
            r.uid = 0;
            r.status = 0;
            r.desc = "failure during user search";
            res.json(r);    
            return;
          }
          else if (userResult.favorites.indexOf(sessionId) == -1)
          {
            userResult.favorites.unshift(sessionId);
            userResult.save(function(err, obj) 
            { 
              if (err)
              {
               console.log("UPDATEFAVIRTES:failure user save, the error: ", err);
               r.status = 0;
               r.desc = "failure UPDATEFAVIRTES save";
               res.json(r); 
               return;          
             }

             userResult.save(function(err, obj) 
             { 
              console.log("UPDATEFAVIRTES: save");
              if (err)
              {
               console.log("UPDATEFAVIRTES:failure session save, the error: ", err);
               r.status = 0;
               r.desc = "failure session save";
               res.json(r); 
               return;          
             }

             console.log("UPDATEFAVIRTES:session: " + userId + " favorites was updated.");
             r.status = 1;
             r.desc = "session: " + sessionId + " favirtes was updated";
             res.json(r);
             return;
           });
           });
            
          }
          else
          {
           var index =  userResult.favorites.indexOf(sessionId);
           userResult.favorites.splice(index, 1);
           userResult.save(function(err, obj) 
             { 
              console.log("UPDATEFAVIRTES: save");
              if (err)
              {
               console.log("UPDATEFAVIRTES:failure user favorites save, the error: ", err);
               r.status = 0;
               r.desc = "failure user favorites save";
               res.json(r); 
               return;          
             }

             console.log("UPDATEFAVIRTES:user: " + userId + " update favorites was updated.");
             r.status = 1;
             r.desc = "user: " + userId + " update favorites was updated";
             res.json(r);
             return;
           });
         }
       });
}
}); 
});

/*only for testing*/
 router.post("/auxiliary/testGCM", function(req, res) 
 {
 	console.log("TESTGCM");
 	
	// Create a message
	var message = new gcm.Message();
	message.addData({'message': 'Hello from Max.', 'timestamp': '111'});
	//message.addData('timestamp', 111);
	message.delay_while_idle = 1;
	
	/*
	var message = new gcm.Message({
	    //collapseKey: 'demo',
	    //delayWhileIdle: true,
	    //timeToLive: 3,
	    data: {
	        message : 'Hello from Max.',
	        timestamp : '111'
	    }
	});
	*/
	// Change the message data
	/*
	message.addData({
	    key1: 'message1',
	    key2: 'message2'
	});
	*/

	// Set up the sender with you API key
	var sender = new gcm.Sender('AIzaSyAjgyOeoxz6TC8vXLydERm47ZSIy6tO_6I');

	// Add the registration IDs of the devices you want to send to
	var registrationIds = [];
	registrationIds.push('APA91bGyfbb5HkMckV6L2hThQYynXBGUFYDjSQkG5wOq3mbINk_WbpDb7t44ENvRTzmUQ-7xLNCHYEsWO1DW4Jv9FGzN9D4VHyoLIDFD-WLJQo9KyeTBfX2oxezU0apSyskrf_Rw39jwPLOGfVZlEafBO0z1J4ufTg');
	//registrationIds.push('APA91bGGZTl1Ed_BpsSH0Ga66xpw5MN2Xx36pGPtttXKIzHTnke0346pM2yeGUwXuMJEAE1UVyWOocF9v');
	//registrationIds.push('APA91bH902yz8BfkkJdiQZWFygXk27m_LTB37NDKwfeOYBe2qiRx4t5qpRp-iwqaBgL8HY9s3v8ZpTkz899w1bN0AAmcqgvnwPMmgF076HtwSKvTXPcAFD1J8X3MIrvnrLbBVLIZ7ulPjRX8-h3oGnXcJ_YLmhEftg');
	
	// Send the message (trying only once)
	sender.sendNoRetry(message, registrationIds, function(err, gcmResult) 
	//sender.send(message, registrationIds, function (err, result) 
	{
		console.log("TESTGCM:sendNoRetry function");
	  	if(err) 
	  	{
	  		console.error("TESTGCM:error is: " + err);
	  	}
	  	else 
	  	{
	  	   console.log("TESTGCM:Sent with message ID: ", gcmResult);
  	  	}
	});	
		
 });
 
/* 
    /auxiliary/lastViews -- precondition
    This function will receive data with userId

    /auxiliary/lastViews -- postcondition
    return all related videos user last views list
    json data with status 1/0, length, res (for the results)

    /auxiliary/favritesActions -- description
    This function will return all user last views ordered by last viewed .
  
    /auxiliary/favritesActions -- example
    userId           avishayhajbi@gmail.com
*/
router.post("/auxiliary/lastViews", function(req, res) {
    var r ={};
    var data={};
    try
    {
        data = req.body;
        data.from = req.body.from || 0;
        data.to = req.body.to || 24;
    }catch(err){
        var r ={
            status:0,
            desc:"data error"
        }
        res.json(r);
        return;
    }
      if ( !data || data.userId == '' )  // if data.name property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property name or its empty";
        res.json(r); 
        return;
    }

    db.model('users').findOne({email:data.userId}, {lastViews:true,org:true,_id:false},
    function(err, docs)
    { 
        // failure while connecting to sessions collection
        if (err) 
        {
            console.log("failure while trying get lastViews, the error: ", err);
            r.status = 0;
            r.desc = "failure while trying get lastViews.";
            res.json(r);
            return;
        }
        
        else if (docs)
        {
            db.model('sessions').find({$and:[{sessionId:{$in:docs.lastViews}},{org:docs.org},{stopTime:{$gt:0}}]}, sessionPreview).sort({owner:1,views: -1}).skip(data.from).limit(data.to)
            .exec(function(err, result)
            { 
                // failure while connecting to sessions collection
                if (err) 
                {
                    console.log("failure while trying get lastViews, the error: ", err);
                    r.status = 0;
                    r.desc = "failure while trying get lastViews.";
                    res.json(r);
                    return;
                }
                
                else if (result)
                {
                    //result = createKeyValJSON(result,'owner');
                    //console.log("videos found "+ result);
                    r.status = 1;
                    r.length=result.length;
                    r.res = result;
                    r.desc = "lastViews.";
                    res.json(r); 
                    return;                         
                }
            });                        
        }
    });         
});

createKeyValJSON = function (arr , key){
    var temp = {}, uid = '';
    for ( k in arr ){
        if (uid != arr[k][key])
        {
            uid = arr[k][key];
            temp[uid] = [];
        }
        temp[uid].push(arr[k]);
    }
    return temp;
};

module.exports = router;