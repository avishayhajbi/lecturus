var express = require('express');
var fs = require("fs-extra");
var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var formidable = require('formidable');
var router = express.Router();
var cloudinary = require('cloudinary');
var ffmpeg = require('fluent-ffmpeg');
var ffmpegCommand = ffmpeg();
var gcm = require('node-gcm');

sessionPreview = {
  title : true, description:true, participants:true, owner:true, course:true, degree : true, lecturer:true, 
  sessionId:true, totalSecondLength:true, rating:true, views:true, timestamp:true , _id : false
};

cloudinary.config({ 
  cloud_name: 'hakrhqyps', 
  api_key: '437118412619984', 
  api_secret: '2y8KTIp1PGzNUQgcwDQsjqMQiU4' 
  //cdn_subdomain: true
});

router.get('/session', function( req, res ) 
{
	res.render('session',
	{
   title:"Session API"
 });
});

/* /session/createSession -- precondition
 * 	This function will receive json with user email, any other fields: name , description, lecturer, degree, course, more data as wanted.
 *
 * /session/createSession -- postcondition
 *  This function will return json with sessionId: the id of new created session, timestamp: session creation time at the server, status: 1 = success / 0 = failure.
 * 
 * /session/createSession -- description
 *	This function will create new 'session' document in the 'sessions' collection, it will assign email assession owner. 
 * 	This function will set all the data, received in the request, in the new created session. 
 *
 * /session/createSession -- example
 *	email		vandervidi@gmail.com
 */
 router.post('/session/createSession', function( req, res ) 
 {
	// create timestamp and uniqeid
  var date = new Date().getTime();
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = date + userip;
  var r = { };
  
  try
  {
    //try to parse json data
    var data = req.body;
  }
  catch( err )
  {
    console.log("failure while parsing the request, the error:" + err);
    r.status = 0;
    r.desc = "failure while parsing the request";
    res.json(r);
    return;
  }
  if ( !data.email || data.email == "" || !data.org || data.org == "" ) // if data.email and data.org property exists in the request is not empty
  {
    r.status = 0; 
    r.desc = "request must contain a property email";
    res.json(r); 
    return;
  }

  db.model('users').find( { email : data.email },
    { _id:false },
    function (err, result)
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
    
    // if the user do not exist
    if (!result.length)
    {
      console.log("the user does not exist: "+data.email);
      r.uid = 0;
      r.status = 0;
      r.desc = "the user does not exist: "+data.email;
      res.json(r);
      return;
    }
    else{
      data.sessionId = uniqueid;
      data.owner = data.email;
      date.timestamp = date;
      
      var newSession =  new Session(data);
      newSession.save(function (err,obj) {
        if (err) 
        {
          console.log("failure during insertion of new session, the error: ", err);
          r.uid = 0;
          r.status = 0;
          r.desc = "failure during insertion of new session";
          res.json(r);
          return;
        }
        else
        {
          console.log("session: " + obj.sessionId + " has completed successfully.");
          r.sessionId = obj.sessionId;
          r.timestamp = date;
          r.owner = obj.owner;
          r.status = 1;
          r.desc = "session: " + obj.sessionId + " has completed successfully.";
          res.json(r);
          return;                           
        }
      });
    }
  });
});


/* /session/getUserSessions -- precondition
 *	This function must receive json with email: userId
 *
 * /session/getUserSessions -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure 
 *
 * /session/getUserSessions -- description
 *	This function will find all the 'session' documents in the 'sessions' collection by user id (email). 
 * 	This function searches for user id both in 'session' document's 'owner' and 'participants' properties.
 *
 * /session/getUserSessions -- example
 *  email		vandervidi@gmail.com
 */
 router.post("/session/getUserSessions", function( req, res)
 {
   var userId, r= { };

   try
   {
        // try to parse the json data
        data = req.body;
        userId = req.body.email;
        data.from = req.body.from || 0;
        data.to = req.body.to || 8;
      }
      catch(err)
      {
        console.log("failure while parsing the request, the error:", err);
        r.status = 0;
        r.desc = "failure while parsing the request";
        res.json(r);
        return;
      }

  if ( userId && userId != "" )	// if data.email property exists in the request is not empty
  {
  	console.log("user id is: " + userId);

    // get sessions collection 
    //var collection = app.get('mongodb').collection('sessions');
    //var collection = connectMongo().collection('sessions');

    db.model('sessions').find( {$and:[{ $or: [ { owner : userId }, {participants : userId}   ] },{stopTime:{ $gt: 0  }} ]},
    sessionPreview).sort({stopTime: -1}).skip(data.from).limit(data.to)
    .exec(function(err, docs)
    {

       console.log("Searching for the session collection");

      // failure while connecting to sessions collection
      if (err) 
      {
        console.log("failure while searching for a session, the error: ", err);
        r.uid = 0;
        r.status = 0;
        r.desc = "failure while searching for a session.";
        res.json(r);
        return;
      }
      else
      {
        console.log("sessions with user: " + userId + " participation: " + docs);
        r.length = docs.length;
        r.status = 1;
        r.userRecordings = docs;
        r.desc = "sessions with user: " + userId + " participation.";
        res.json(r);		                	
      }
    });
  }
  else
  {
   console.log("data.email propery does not exist in the query or it is empty");
   r.status = 0;
   r.desc = "data.email propery does not exist in the query or it is empty";
   res.json(r);  
   return;	  	
 }
});


/* /session/addMembers -- precondition
 *	This function must receive json with sessionId, participants: array[emails], email: belong to the session owner.
 *
 * /session/addMembers -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure.
 *
 * /session/addMembers -- description
 *	This function will send GCM sessages to each user that the function received in the request.
 *
 * /session/addMembers -- example
 *  sessionId 			1427559374447127001
 *  participants[1] 	somemail1@gmail.com
 *  participants[2] 	somemail2@gmail.com 
 *  participants[3] 	somemail3@gmail.com
 */
 router.post("/session/addMembers", function(req, res ) 
 {  	
  	 //create new empty variables
  	var timestamp = new Date().getTime();	//create timestamp 
    var newParticipants, sessionOnwer, sessionId;
	var r = { };	//response object	
	var message = new gcm.Message();	//create new gcm message
	var sender = new gcm.Sender('AIzaSyAjgyOeoxz6TC8vXLydERm47ZSIy6tO_6I');	//create new gcm object
	
	try
 	{
        // try to parse the json data
        newParticipants = req.body.participants; // participans = array
		sessionId = req.body.sessionId;
		sessionOnwer = req.body.email;
	}
	catch(err)
	{
	 	console.log("ADDMEMBERS:failure while parsing the request, the error:", err);
	 	r.status = 0;
	 	r.desc = "failure while parsing the request";
	 	res.json(r);
		return;
	}
		
    if ( newParticipants.length == 0 )
    {
    	console.log("ADDMEMBERS:no participants were sent.");
      	r.status = 0;
      	r.desc = "no participants were sent.";
      	res.json(r);
      	return; 	
    }
    /*
    else	
    {
     	(newParticipants).forEach (function (currParticipant) 
     	{
      		console.log("ADDMEMBERS:new participant: " + currParticipant);
    	});
	}
	*/
	
    if (  typeof sessionId === 'undefined' || sessionId == null || sessionId == "" )	// if data.sessionId property exists in the request is not empty
    {
		console.log("ADDMEMBERS:sessionId propery does not exist in the query or it is empty");
		r.status = 0;
		r.desc = "sessionId propery does not exist in the query or it is empty";
		res.json(r);  
		return;	        	
    }
   	else
    {
    	console.log("ADDMEMBERS:Session id is: " + sessionId);
    	
        db.model('sessions').findOne( 
		{ sessionId : sessionId }, 
		function (err, sessionObj)
		{    	
    		if (err) 
    		{
     			console.log("ADDMEMBERS:failure during session search, the error: ", err);
      			r.status = 0;
      			r.desc = "failure during user search";
     			res.json(r);	
      			return;
    		}
    		
			// if the org do not exist
	        if (sessionObj == null)
	        {
	         	console.log("ADDMEMBERS:session was not found.");
	          	r.status = 0;
	          	r.desc = "session was not found.";
	         	res.json(r);	
	          	return;
	        }
	        
	        if (sessionObj.owner != sessionOnwer)
	        {
	         	console.log("ADDMEMBERS:email, reseived in the request, does not belong to session owner.");
	          	r.status = 0;
	          	r.desc = "email, reseived in the request, does not belong to session owner.";
	         	res.json(r);	
	          	return;
	        }
	        
	        // seach for the participants google registration id
	        // validation that each user exists in the users collection before adding it to the session
	        db.model('users').find( 
			{ email : { $in : newParticipants } }, 
	     	{ regId : true, _id : false },
			function (err, result)
			{
				console.log("ADDMEMBERS:Result id is: " + result);
				// failure during user search
	    		if (err) 
	    		{
	     			console.log("ADDMEMBERS:failure during user search, the error: ", err);
	      			r.status = 0;
	      			r.desc = "failure during user search";
	     			res.json(r);	
	      			return;
	    		}
	    		if ( result.length == 0 )
	    		{
	     			console.log("ADDMEMBERS:no registration ids were found.");
	      			r.status = 0;
	      			r.desc = "no registration ids were found.";
	     			res.json(r);	
	      			return;
	    		}
	    		else
	    		{
	    			message.addData('message', 'join session.');
					message.addData('sessionId', sessionId);
					message.addData('ownerId', sessionOnwer);
					message.delay_while_idle = 1;
					
			     	(result).forEach (function (currRes) 
			     	{
			      		console.log("ADDMEMBERS:participant's registration id: " + currRes.regId);
			      		var registrationIds = [];
			      		registrationIds.push(currRes.regId);
			      		
			      		//send each participant a gcm message - async
			      		sender.sendNoRetry(message, registrationIds, function(err, sentResult) 
						{
						  	if(err) 
						  	{
						  		console.error("ADDMEMBERS:error is: " + err);
						  	}
						  	else 
						  	{
						  	   console.log("ADDMEMBERS:message sending to: " + currRes.regId + " resulted with:" + sentResult);
					  	  	}
						});
			    	});
	
	     			console.log("ADDMEMBERS:messages were sent.");
	      			r.status = 1;
	      			r.desc = "messages were sent.";
	     			res.json(r);	
	      			return;
	    		}
	   		});
   		});                    
	}
});


/*
 * This function will receive an array and delete all duplicate entries.
 */
 function arrayUnique( array ) 
 {
  var a = array.concat();

  for(var i = 0; i < a.length; ++i) 
  {
    for(var j = i + 1; j < a.length; ++j) 
    {
      if(a[i] === a[j])
       a.splice(j--, 1);
   }
 }

 return a;
};







/* /session/updateViews -- precondition
 * 	This function will receive json with sessionId.
 *
 * /session/updateViews -- postcondition
 * 	This function will return json with status: 1 = success / 0 = failure.
 *
 * /session/updateViews -- description
 * 	This function will update session views counter. The session must be completed.
 * 
 * /session/updateViews -- example
 *  sessionId				142964947916810933728
 *  userId           avishayhajbi@gmail.com
 */
 router.post("/session/updateViews", function(req, res )
 {
   var r = { };

   try
   {
    var sessionId = req.body.sessionId;
    var userId = req.body.userId;
  }
  catch( err )
  {
    console.log("UPDATEVIEWS: failure while parsing the request, the error:" + err);
    r.status = 0;
    r.desc = "failure while parsing the request";
    res.json(r);
    return;
  }

  if ( typeof sessionId === 'undefined' || sessionId == null || sessionId == "" ||
       typeof userId === 'undefined' || userId == null || userId == "" )		// if one the propertiey do not exists in the request and it is empty
  {
   console.log("UPDATEVIEWS:request must contain sessionId property.");
   r.status = 0;	
   r.desc = "request must contain sessionId and userId property.";
   res.json(r); 
   return;
 }

 db.model('sessions').findOne( {$and:[{ sessionId : sessionId },{stopTime:{$gt:0}} ]},
    //{ participants : true, owner : true, _id : false },	- does not wotk with this
    function (err, result)
    {
      if (err) 
      {
        console.log("UPDATEVIEWS:failure during session search, the error: ", err);
        r.status = 0;
        r.desc = "failure during session search";
        res.json(r);	
        return;
      }
      if ( !result )
      {
       console.log("UPDATEVIEWS:session: " + sessionId + " was not found.");
       r.status = 0;
       r.desc = "session: " + sessionId + " was not found";
       res.json(r);
       return;
     }
     else
     {

      ++result.views;
       result.save(function(err, obj) 
       { 
        console.log("UPDATEVIEWS: save");
        if (err)
        {
         console.log("UPDATEVIEWS:failure session save, the error: ", err);
         r.status = 0;
         r.desc = "failure session save";
         res.json(r); 
         return;          
       }

       // console.log("UPDATEVIEWS:session: " + sessionId + " views counter was updated.");
       // r.status = 1;
       // r.desc = "session: " + sessionId + " views counter was updated";
       // res.json(r);
       // return;
     });
             
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
          else if (userResult.lastViews.indexOf(sessionId) == -1)
          {
            userResult.lastViews.unshift(sessionId);
            userResult.save(function(err, obj) 
            { 
              if (err)
              {
               console.log("UPDATEUSER:failure user save, the error: ", err);
               r.status = 0;
               r.desc = "failure UPDATEUSER save";
               res.json(r); 
               return;          
             }
             console.log("UPDATEVIEWS:session: " + sessionId + " views counter was updated.");
             r.status = 1;
             r.desc = "session: " + sessionId + " views counter was updated";
             res.json(r);
             return;
             
           });
            
          }
          else
          {
           console.log("UPDATEVIEWS:session: " + sessionId + " views counter was updated.");
           r.status = 1;
           r.desc = "session: " + sessionId + " views counter was updated";
           res.json(r);
           return;
         }
       });
}
});	
});





/* /session/getSessionById -- precondition
 * 	This function will receive json with user videoId, userId ,edit: true = add 1 to view counter / false = dont add 1 to view counter.
 *
 * /session/getSessionById -- postcondition
 *  This function will return json with info:, status: 1 = success / 0 = failure.
 * 
 * /session/getSessionById -- description
 *	This function will find 'session' document in the 'sessions' collection, accordint to the sessionId received in the request. 
 * 	This function will increase session view counter only if edit property, received in the request, is true. 
 *
 * /session/getSessionById -- example
 *	userId		vandervidi@gmail.com
    sessionId 123
    org shenkar
    edit true/false
    */
router.post('/session/getSessionById', function (req, res) 
{
	var r = { };

 	try
 	{
		var sessionId = req.body.sessionId;
       	var org = req.body.org;
    	var userId = req.body.userId;   	//TODO handel get video only if the user from the same org
      	var edit = req.body.edit || "false"; 			//TODO handel pluse minus views counter
  	}
	catch(err)
	{
	 	console.log("failure while parsing the request, the error:", err);
	 	r.status = 0;
	 	r.desc = "failure while parsing the request";
	 	res.json(r);
	} 
	db.model('sessions').findOne( { $and : [ { sessionId : sessionId }, { stopTime : { $gt: 0  } }, { org : org } ] }, { _id : false },
  { _id : false }).lean().exec(function( err, doc )
  {
    if (err) 
        {
              console.log("failure while searching for the session, the error: ", err);
              r.status = 0;
              r.desc = "failure while searching for the session.";
              res.json(r);
              return;
        }
        else if (doc)
        {
            if (edit=="true")
            {
              console.log("the session: " + sessionId + " was found.");
              r.status = 1;
              r.info = doc;
              r.desc = "the session: " + sessionId + " was found.";
              res.json(r); 
              return; 
            }
          getUsersData(doc, userId, function(result)
          {            
            doc.users = result;
            console.log("the session: " + sessionId + " was found.");
            r.status = 1;
            r.info = doc;
            r.desc = "the session: " + sessionId + " was found.";
            res.json(r); 
            return;
            }); 
      }
        else
        {
            console.log("the session: " + sessionId + " was not found.");
            r.status = 0;
            r.info = [];
            r.desc = "the session: " + sessionId + " was not found.";
            res.json(r); 
            return;  
        }
  });
});


/* /session/getAllVideos -- precondition
 *  This function will receive json with email.
 *
 * /session/getAllVideos -- postcondition
 *  This function will return json with info:, status: 1 = success / 0 = failure and all related videos.
 * 
 * /session/getAllVideos -- description
 *  This function will find 'user' document in the 'users' collection, accordint to the email received in the request. 
 *  This function will return all sessions by the user organization. 
 *
 * /session/getAllVideos -- example
 *  email   vandervidi@gmail.com
 */
router.get("/session/getAllVideos/:email?", function(req, res) {
    var r ={};
    var data={};
    try
    {
        data = req.query;
        data.from = req.query.from || 0;
        data.to = req.query.to || 10;
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

    db.model('users').findOne({email:data.email}, {org:true,_id:false},
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

            db.model('sessions').find({org:docs.org}, sessionPreview).sort({'views': -1}).skip(data.from).limit(data.to)
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
                    db.model('sessions').find({org:docs.org}).count().exec(function(err, result){ console.log(result)});
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

/* /session/getMembers -- precondition
 *	This function must receive json with sessionId, email: that belongs to one of the participants
 *
 * /session/getMembers -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure, participants: []
 *
 * /session/getMembers -- description
 *	This function will find the 'session' document in the 'sessions' collection by sessionId that will be received in the request.
 *	This function will extract all the emails from 'participants' property in the 'session' document.
 *
 * /session/getMembers -- example
 *  sessionId 			1427559374447127001
 *  email			 	somemail1@gmail.com
 */
 router.post("/session/getMembers", function(req, res ) 
 {  	
  	 //create new empty variables
    var participants = Array();
    var participantsEmails = Array();
	var r = { };	//response object	

	try
 {
        // try to parse the json data
        data = req.body;

        if ( data.sessionId && data.sessionId != "" )	// if data.sessionId property exists in the request is not empty
        {
        	console.log("Session id is: " + data.sessionId);
        	
	        // connect to mongodb
	        MongoClient.connect(config.mongoUrl, { native_parser : true }, function(err, db) /* TODO. REMOVE */
         {
          console.log("Trying to connect to the db.");

	            // if connection failed
	            if (err) 
	            {
               console.log("MongoLab connection error: ", err);
               r.uid = 0;
               r.status = 0;
               r.desc = "failed to connect to MongoLab.";
               res.json(r);
               return;
             }

	            // get sessions collection 
	            var collection = db.collection('sessions');
	            
	            collection.find( { sessionId : data.sessionId } ).toArray( function (err, docs) 
	            {
	            	console.log("Searching for the session collection");
	            	
	                // failure while connecting to sessions collection
	                if (err) 
	                {
                   console.log("failure while searching for a session, the error: ", err);
                   r.status = 0;
                   r.desc = "failure while searching for a session.";
                   res.json(r);
                   return;
                 }

	                // the session do not exist
	                if ( !docs.length ) 
	                {
                   console.log("session: " + data.sessionId + " do not exist.");
                   r.status = 0;
                   r.desc = "session: " + data.sessionId + " was not found.";
                   res.json(r);
                   return; 
                 }
                 else
                 {
	                	// there is only one session with this sessionId
	                	//TODO. add validation for existance or received email in the session document
	                	/*

                    */
                    participants = docs[0].participants;

                    console.log("participants: " + participants);

                    (participants).forEach (function (participant) 
                    {
                     console.log("session participants: " + participant.user);
						  	// we get an array of existing participants
						  	participantsEmails.push( participant.user );
              });

						//exclude email received in the request from the result
						var index = participantsEmails.indexOf(data.email);
						if (index > -1) 
						{
							console.log("email belongs to one of the participants.");
              participantsEmails.splice(index, 1);
            }

						//newParticipants = arrayUnique(oldParticipants.concat(newParticipants));

            console.log("session participants were found.");
            r.status = 1;
            r.participants = participantsEmails;
            r.desc = "session participants were found.";
            db.close();		/* TODO REMOVE */
            res.json(r);		                	
          }

        });
});
}
else
{
  console.log("data.sessionId propery does not exist in the query or it is empty");
  r.status = 0;
  r.desc = "data.sessionId propery does not exist in the query or it is empty";
  res.json(r);  
  return;			
}
}	                        
catch(err)
{
 console.log("failure while parsing the request, the error:", err);

 r.desc = "failure while parsing the request";
 res.json(r);

}

});



/* /session/deleteImage -- precondition
  data with imageurl
  */
/* /session/deleteImage -- postcondition
    delete the image from the cloud by its url
    json data with status 1/0
*/

router.post('/session/deleteImage', function(req, res) 
{
  	var imageUrl;
  	var r = { };
  	
  	try
  	{
  		imageUrl = req.body.imageurl;	//TODO. should be imageUrl = camel case
  	}
  	catch( err )
    {
  		console.log("DELETEIMAGE:failure while parsing the request, the error:" + err);
    	r.status = 0;
    	r.desc = "failure while parsing the request.";
    	res.json(r);
    	return;
    }
  	
  	if ( !imageUrl || imageUrl == '' ) 
  	{
	    console.log("DELETEIMAGE:request must contain an image URL.");
	    r.status = 0;
	    r.desc = "request must contain an image URL.";
	    res.json(r);
	    return;
  	}
  	
  	var temp = imageUrl.split('/');
  	cloudinary.uploader.destroy(temp[temp.length-1].split(".")[0], 
  	function(result) 
  	{ 
    	console.log("DELETEIMAGE:result is: " + result);
	    if (result.result == "not found")
	    {
	      console.log("DELETEIMAGE:image was not found.");
	      r.status = 0;
	      r.desc = "image was not found.";
	      res.json(r);
	      return;
	    }
	    
	    console.log("DELETEIMAGE:image was deleted.");
	    r.status = 1;
	    r.desc = "image was deleted.";
	    res.json(r);
	    return;
  });

});





module.exports = router;