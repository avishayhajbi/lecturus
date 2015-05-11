var express = require('express');
var fs = require("fs-extra");
var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var formidable = require('formidable');
var router = express.Router();
var path = require('path');
var cloudinary = require('cloudinary');
var Q = require('q');
var ffmpeg = require('fluent-ffmpeg');
var ffmpegCommand = ffmpeg();
var gcm = require('node-gcm');

sessionPreview = {
  name : true,description:true, participants:true, owner:true,course:true,degree:true,lecturer:true, 
  sessionId:true, totalSecondLength:true, rating:true, views:true , _id:false
}

cloudinary.config({ 
  cloud_name: 'hakrhqyps', 
  api_key: '437118412619984', 
  api_secret: '2y8KTIp1PGzNUQgcwDQsjqMQiU4' 
  //cdn_subdomain: true
});

var files, clips = [], stream, currentfile, dhh;
var _public='./';

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
      delete data.email;
      var newSession =  new Session(data);
      newSession.save(function (err) {
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
          console.log("session: " + data.sessionId + " has completed successfully.");
          r.sessionId = data.sessionId;
          r.timestamp = date;
          r.owner = data.owner;
          r.status = 1;
          r.desc = "session: " + data.sessionId + " has completed successfully.";
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
      sessionPreview ,
      function (err, docs) 
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
 *	This function must receive json with sessionId, participants: array[emails]
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
    var newParticipants;
	var r = { };	//response object	
	var message = new gcm.Message();	//create new gcm message
	var sender = new gcm.Sender('AIzaSyAjgyOeoxz6TC8vXLydERm47ZSIy6tO_6I');	//create new gcm object
	
	try
 	{
        // try to parse the json data
        newParticipants = req.body.participants; // participans = array
		sessionId = req.body.sessionId;
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
    else	//TODO. ERASE
    {
     	(newParticipants).forEach (function (currParticipant) 
     	{
      		console.log("ADDMEMBERS:new participant: " + currParticipant);
    	});
	}

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
				message.addData('sessionId', 111);
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


/* 	/session/getUserSessionsInProgress -- precondition
 *	This function must receive json with email: user id
 *
 * /session/getUserSessionsInProgress -- postcondition
 *	This function will return json with array of sessions, status: 1 = success / 0 = failure 
 *
 * /session/getUserSessionsInProgress -- description
 *	This function will find the 'session' documents in the 'sessions' collection by user email that will be received in the request.
 *	This function will expract all the 'session' 'participants' from those sessions and find all opened 'session' document with those users.
 *
 * /session/getUserSessionsInProgress -- example
 *  email 	somemail1@gmail.com
 */
 router.post("/session/getUserSessionsInProgress", function(req, res) 
 {
   var userId, r = { }, tempFriends = new Array(), tempParticipants = new Array();
   var counter = 0;
   try
   {
        // try to parse the json data
        data = req.body;
        userId = req.body.email;
      }
      catch(err)
      {
        console.log("failure while parsing the request, the error:", err);
        r.status = 0;
        r.desc = "failure while parsing the request";
        res.json(r);
      }

    if ( userId && userId != "" )	// if data.email property exists in the request is not empty
    {
    	console.log("user id is: " + userId);


       	//var promise = Q.fcall(getUserAcquaintances( userId));
       	
       	getUserAcquaintances( userId ).then( function( friends )
         {
          console.log("2. friends are: " + tempFriends);

          db.model('sessions').find(	{ $or: [ { owner : { $in : tempFriends } }, { participants: { $elemMatch: { user : { $in : tempFriends } } } } ] }, { sessionId : true, _id : false }, function (err, result)
          {
            if (err) 
            {
             console.log("-->getUserSessionsInProgress<-- Err: " + err);
	        		// TODO.
           }

           if (result)
           {
            console.log("the result is: " + result);
	 				/*
        			(result).forEach(function(currdocument)
        			{
		        		console.log("owner is " + currdocument.owner);
		        		tempFriends = tempFriends.concat( currdocument.owner );
		        		console.log("participants are: " + currdocument.participants);
		        		(currdocument.participants).forEach( function(participant)
		        		{
		        			tempFriends = tempFriends.concat( participant.user );
		        		});
        			});
          */
        }
        else
        {
         console.log("-->getUserSessionsInProgress<-- No session in progress were found.");
	        		//TODO.
	        	}  

          });
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


/* /session/updateSessionStatus -- precondition
 *  This function will receive json with sessionId, email: session owner's email, status: 1 = start / 0 = stop.
 * 	
 * /session/updateSessionStatus -- postcondition
 *  This function will return json with status: 1 = success / 0 = failure.
 *  
 * /session/updateSessionStatus -- description
 *  This function will find the suitable session according to 'sessionId' passed in the request, check if email passed in the request 
 *  belongs to the session 'owner', if yes it will alter session property 'recordStarts' to needed one in the 'sessions' collection.
 * 
 * /session/updateSessionStatus -- example
 *  sessionId	  	1427559374447127001
 *  email		    somemail1@gmail.com	
 *	status	    	0 (stop) or 1 (start) // TODO. check why does not work with booleans
 * 	timestamp		1023103210
 */
 router.post("/session/updateSessionStatus", function(req, res ) 
 {
	//create new empty variables
	var reqOwner, reqSession, reqStatus;	//temporary variables
	var r = { };							//response object	

	try
 	{
    	// try to parse the json data
    	reqSession = req.body.sessionId;
    	reqOwner = req.body.email;
    	reqStatus = req.body.status;
    	reqTimestamp = req.body.timestamp;
    }
    catch(err)
    {
     	console.log("UPDATESESSIONSTATUS:failure while parsing the request, the error:", err);
     	r.status = 0;
     	r.desc = "failure while parsing the request";
     	res.json(r);
     	return;
   } 

	if (  	typeof reqSession === 'undefined' || reqSession == null || reqSession == "" ||
     		typeof reqOwner === 'undefined' || reqOwner == null || reqOwner == "" ||
     		typeof reqTimestamp === 'undefined' || reqTimestamp == null || reqTimestamp == "" ||
			typeof reqStatus === 'undefined' || reqStatus == null || reqStatus == ""	)	// if one of the property do not exists in the request and it is empty
	{
		console.log("UPDATESESSIONSTATUS:request must contain following properties: sessionId, email, status and timestamp.");
    	r.status = 0;
    	r.desc = "request must contain following properties: sessionId, email, status and timestamp.";
    	res.json(r);  
    	return;	
	}

	// TODO. remove 
	 console.log("session owner is: " + reqOwner);
	 console.log("Session id is: " + reqSession);
	 console.log("Session status is: " + reqStatus);
	 console.log("Session timestamp is: " + reqTimestamp);  
 
 	db.model('sessions').findOne( { sessionId : reqSession },
    //{ participants : true, owner : true, _id : false },	- does not wotk with this
    function (err, result)
    {
    	//console.log("result: " + result);
      	if (err) 
      	{
	        console.log("UPDATESESSIONSTATUS:failure during session search, the error: ", err);
	        r.status = 0;
	        r.desc = "failure during session search";
	        res.json(r);	
	        return;
      	}
      	
     	if ( !result )	//session was not found case
      	{
       		console.log("UPDATESESSIONSTATUS:session: " + reqSession + " was not found");
       		r.status = 0;
       		r.desc = "session: " + reqSession + " was not found";
       		res.json(r);
       		return;
     	}
     	else //session was found case
     	{
       		if (result.owner == reqOwner )	// check if the user is the session owner
       		{
				if (reqStatus == 1)			//start session case
        		{
         			if (result.startTime != 0 )
         			{
			           	console.log("UPDATESESSIONSTATUS:can not restart session: " + reqSession);
			           	r.status = 0;
			          	r.desc = "can not restart session: " + reqSession;
			           	res.json(r);	
			           	return; 						
         			}
         				
					//getUserFriends( result.owner, result.participants ); 	//TODO. check for correctness...
					result.startTime = reqTimestamp;
         			result.save(function(err, obj) 
         			{ 
		           		if (err)
		           		{
							console.log("UPDATESESSIONSTATUS:failure session save, the error: ", err);
				            r.status = 0;
				            r.desc = "failure session save";
				            res.json(r);	
				            return;     			
	           			}
		
				    			//console.log("obj is: " + obj); object after the update
		             	console.log("UPDATESESSIONSTATUS:session: " + reqSession + " was started successfully.");
		             	r.status = 1;
		             	r.desc = "session: " + reqSession + " was started successfully.";
		             	res.json(r);
		             	return; 
		           }); 
       			}
				if (reqStatus == 0)		//stop ssession case
       			{
	     			if (result.startTime == 0 )		// need to start the session first
	         		{	
						console.log("UPDATESESSIONSTATUS:can not stop session: " + reqSession + ". it was not started yet.");
	   					r.status = 0;
	   					r.desc = "can not stop session: " + reqSession + ". it was not started yet.";
	   					res.json(r);	
	   					return; 						
	         		}
		        	if (result.stopTime != 0 )		// the session was stoped before
		         	{
			           	console.log("UPDATESESSIONSTATUS:can not stop session: " + reqSession + ". it was already stopped.");
			           	r.status = 0;
			           	r.desc = "can not stop session: " + reqSession + ". it was already stopped.";
			           	res.json(r);	
			           	return; 						
		         	}
		         	
					//result.recordStarts = false; //TODO. remove, no need to set false. once started, we can not restart the session.
					//result.elements = closeSessionFunction(result.elements);	// TODO. convert the function to be async
					updateSessionElements(result.elements, result.sessionId);
					result.stopTime = reqTimestamp;
         			result.save(function(err, obj) 
         			{ 
		           		if (err)
		           		{
			             	console.log("UPDATESESSIONSTATUS:failure session save, the error: ", err);
			             	r.status = 0;
			             	r.desc = "failure session save";
			             	res.json(r);	
			             	return;     			
		           		}

		    			//console.log("obj is: " + obj); object after the update
             			console.log("UPDATESESSIONSTATUS:session: " + reqSession + " was stopped successfully.");
             			r.status = 1;
             			r.desc = "session: " + reqSession + " was stopped successfully.";
             			res.json(r);
             			return; 
           			}); 					
       			}
       		}
	     	else
	     	{
		      	console.log("UPDATESESSIONSTATUS:user: " + reqOwner + " is not a session owner.");
		      	r.status = 0;
		      	r.desc = "user: " + reqOwner + " is not a session owner.";
		      	res.json(r);
		      	return;
			}
	        	//console.log("UPDATESESSIONSTATUS:result: " + result);
	        //} 
      }               	              
	});
});

/*
 * This function will create a ;ist of user friends from the session participants.
 */
 function getUserFriends( owner, participants )
 {
   var friends = new Array(), tempFriends = new Array();
   console.log("owner is: " + owner);
   console.log("participants are: " + participants);

   participants.push(owner);
   friends = arrayUnique(participants);

   (friends).forEach( function(friend)
   {
		tempFriends = participants.slice(); // TODO. shallow copy, would it work???
		
   db.model('users').findOne( { email : friend },
	    //{ participants : true, owner : true, _id : false },	- does not wotk with this
	    function (err, result)
	    {
	    	//console.log("result: " + result);
       if (err) 
       {
         console.log("GETUSERFRIENDS:failure during session search, the error: ", err);
         return;
       }
       if ( !result )
       {
        console.log("GETUSERFRIENDS:user: " + friend + " was not found");
      }
      else
      {
	        	//find the email of the currect person in the friends array
	        	var index = tempFriends.indexOf(friend);
	        	//remove the email from the friends array
	        	if (index > -1) 
	        	{
             tempFriends.splice(index, 1);
           }

           result.friends = arrayUnique( result.friends.concat( tempFriends ) );
           result.save(function(err, obj) 
           { 
            if (err)
            {
              console.log("GETUSERFRIENDS:failure user save, the error: ", err);  			
            }

	    			//console.log("obj is: " + obj); object after the update
            console.log("GETUSERFRIENDS:user: " + friend + " was saved successfully."); 
          });
         }	
       });	
});
}
/*
 * This function will reagange session events according to their timestamp and so will create the session format for web site use.
 */
 function closeSessionFunction(elements)
 {
	var elemTemp = { };
   	
   	(elements.tags).forEach(function (tag) 
   	{
     	if (elemTemp[tag.timestamp])
     	{
       		elemTemp[tag.timestamp].tags.push(tag);
     	}
     	else
     	{
       		elemTemp[tag.timestamp] = {
         	tags:[tag]
       		};
     	}
	});
   	(elements.images).forEach(function (image) 
   	{
    	if (elemTemp[image.timestamp])
    	{
          	elemTemp[image.timestamp].photo = image; //it should push the image one minutes right
        }
        else
        {
          	elemTemp[image.timestamp] = {
            photo:image
          };
        }
  	});
	  		MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) // TODO. REMOVE *
			{
	    		console.log("Trying to connect to the db.");
	    		//var r = { }; 
	    		             
	      		// if connection failed
		      	if (err) 
		      	{
		        	console.log("MongoLab connection error: ", err);
		        	r.status = 0;
		        	r.desc = "failed to connect to MongoLab.";
		        	res.send((JSON.stringify(r)));
		        	return;
		      	}
	          
	          	collection.update({ sessionId : data.sessionId }, { $set : result }, {upsert:false ,safe:true , fsync: true}, 
	          	function(err, update_res) 
	          	{ 
	            	if (err)
	            	{
	              		console.log("session not updated "+err);
	              		r.status=0;
	              		r.desc="session not updated";
	                	db.close(); // TODO REMOVE 
	                	res.send((JSON.stringify(r)))
	                	return;
	              	} 
	              	else 
	              	{
	                	console.log("session updated");
	                	r.status=1;
	                	r.desc="session updated";
	                	db.close(); // TODO REMOVE 
	                	res.send((JSON.stringify(r)));
	                	return;
	              	}
	            });
	          
	     	});      
   return elemTemp;
 }

/*
 * This function will reagange session events according to their timestamp and so will create the session format for web site use.
 */
 function updateSessionElements(oldElements, session)
 {
 	console.log("UPDATESESSIONELEMENTS.");
	var elemTemp = { };
  	   	
   	(oldElements.tags).forEach(function (tag) 
   	{
     	if (elemTemp[tag.timestamp])
     	{
       		elemTemp[tag.timestamp].tags.push(tag);
     	}
     	else
     	{
       		elemTemp[tag.timestamp] = {
         	tags:[tag]
       		};
     	}
	});
   	(oldElements.images).forEach(function (image) 
   	{
    	if (elemTemp[image.timestamp])
    	{
          	elemTemp[image.timestamp].photo = image; //it should push the image one minutes right
        }
        else
        {
          	elemTemp[image.timestamp] = {
            photo:image
          };
        }
  	});

	MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, dataBase) // TODO. REMOVE *
	{
		console.log("Trying to connect to the db.");
		             
  		// if connection failed
      	if (err) 
      	{
        	console.log("MongoLab connection error: ", err);
        	return;
      	}
      	
      	// get sessions collection 
      	var collection = dataBase.collection('sessions');
      	          
      	//collection.update({ sessionId : data.sessionId }, { $set : result }, {upsert:false ,safe:true , fsync: true},
      	collection.update({ sessionId : session }, { $set : {elements : elemTemp} }, { upsert : false, safe : true, fsync : true }, 
      	function(err) 
      	{ 
        	if (err)
        	{
          		console.log("session not updated "+err);
            	db.close(); // TODO REMOVE 
            	return;
          	} 
          	else 
          	{
            	console.log("session updated");
            	dataBase.close(); // TODO REMOVE 
            	return;
          	}
        });
      	dataBase.close(); // TODO REMOVE 
 	});      
 }
 
/* /session/updateSession -- precondition
 *  json data with session details as the cliet receive
 * 
 * /session/updateSession -- postcondition
 * json data with status 1/0
 *
 * /session/updateSession -- descrition
 * update the session in mongo collection session
 *
 * /session/updateSession -- example
 */
 router.post("/session/updateSession", function(req, res ) 
 {
   var data = req.body;
   console.log("data.sessionId ",data.sessionId)

  MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) // TODO. REMOVE *
  {
    console.log("Trying to connect to the db.");
    var r ={};              
      // if connection failed
      if (err) 
      {
        console.log("MongoLab connection error: ", err);
        r.uid = 0;
        r.status = 0;
        r.desc = "failed to connect to MongoLab.";
        res.send((JSON.stringify(r)));
        return;
      }
      //console.log(JSON.stringify(sessionId))
      // get sessions collection 
      var collection = db.collection('sessions');
      //TODO. check that 'recordStarts' value differs from expected, else return status '0' - failure.                    
      collection.find( {$and:[{ sessionId:data.sessionId },{owner : data.owner}] }).toArray(function (err, docs)
      { 
          // failure while connecting to sessions collection
          if (err) 
          {
            console.log("failure while trying close session, the error: ", err);
            r.status = 0;
            r.desc = "failure while trying update session.";
            res.send((JSON.stringify(r)));
            return;
          }
          
          else if (docs.length)
          {
            collection.update({sessionId:data.sessionId},{ $set : data }, {upsert:false ,safe:true , fsync: true}, 
              function(err, result) { 
                if (err)
                {
                  console.log("session not updated "+err);
                  r.status=0;
                  r.desc="session not updated";
                    db.close(); // TODO REMOVE 
                    res.send((JSON.stringify(r)))
                    return;
                  } 
                  else 
                  {
                    console.log("session updated");
                    r.status=1;
                    r.desc="session updated";
                    db.close(); // TODO REMOVE 
                    res.send((JSON.stringify(r)));
                    return;
                  }
                });
          }
          else
          {
           console.log("session not found or you are not the owner");
           r.status=0;
           r.desc="not found or you are not the owner";
           db.close(); // TODO REMOVE 
           res.send((JSON.stringify(r)))
         }
       });         
});
});

/* /session/updateSessionRating -- precondition
 * 	This function will receive json with sessionId, email: user's id, rating: 0 = decrease / 1 = increase.
 *
 * /session/updateSessionRating -- postcondition
 *  This function will return json with status: 1 = success / 0 = failure.
 *
 * /session/updateSessionRating -- description
 * 	This function will find the needed session and check if the user participates in it.
 * 	It will update the rating and the voters list according to the rating property, received in the request.
 * 	If the user already voted oposite to his current vote, the function will remove him from the oposite list and reduce the oposite rating by 1.
 * 	If his has voted similarmy to his current vote, nothing will be changed in the rating.
 * 
 * /session/updateSessionRating -- example
 *  sessionId		142964947916810933728
 * 	email			somemail1@gmail.com
 * 	rating 			1	
 */
 router.post("/session/updateSessionRating", function(req, res ) 
 {
  var r = { };
  var votedBefore = -1;

  try
  {
   var sessionId = req.body.sessionId;
   var rating = req.body.rating;
   var email = req.body.email;
 }  
 catch( err )
 {
   console.log("UPDATESESSIONRATING: failure while parsing the request, the error:" + err);
   r.status = 0;
   r.desc = "failure while parsing the request";
   res.json(r);
   return;
 }

    //TODO. Remove
    console.log("session id: " + sessionId);
    console.log("user email: " + email);
    console.log("session rating: " + rating);
    
    if (  	typeof sessionId === 'undefined' || sessionId == null || sessionId == "" ||
     typeof rating === 'undefined' || rating == null || rating == "" ||		
			typeof email === 'undefined' || email == null || email == ""	)		// if one of the properties do not exists in the request or it is empty
    {
    	console.log("UPDATESESSIONRATING:request must contain sessionId, email and rating properties.");
    	r.status = 0;	
     r.desc = "request must contain sessionId, email and rating properties.";
     res.json(r); 
     return;
   }

   db.model('sessions').findOne( {$and:[{ sessionId : sessionId }, { stopTime : { $gt : 0 }} ]},
    //{ participants : true, owner : true, _id : false },	- does not wotk with this
    function (err, result)
    {
     if (err) 
     {
       console.log("UPDATESESSIONRATING:failure during session search, the error: ", err);
       r.status = 0;
       r.desc = "failure during session search";
       res.json(r);	
       return;
     }
     if ( !result )
     {
       console.log("UPDATESESSIONRATING:session: " + sessionId + " was not found.");
       r.status = 0;
       r.desc = "session: " + sessionId + " was not found";
       res.json(r);
       return;
     }
     else
     {

    		//check if this user woted before
    		if ( result.rating.positive.users.indexOf(email) != -1)		//voted positive
    		{
    			votedBefore = 1;
    		}
    		if ( result.rating.negative.users.indexOf(email) != -1)		//voted negative
    		{
    			votedBefore = 0;
       }

			if (rating == 0)	//negative case
			{
				if ( votedBefore == 0 )				//voted negative before -  remove the user from negative voters list and update the rating value
				{
					//decrease the negative rating of the session by 1
					--result.rating.negative.value; 
					
					//remove from negative voters list
					result.rating.negative.users.splice(result.rating.negative.users.indexOf(email), 1); 
					
					console.log("UPDATESESSIONRATING:user: " + email + " DOWN vote for session: " + sessionId + " was successfully removed.");
          r.desc = "user: " + email + " DOWN vote for session: " + sessionId + " was successfully removed.";
        }
        else
        { 
          			if ( votedBefore == 1 )			//voted positive before - remove the user from positive voters list and update the positive rating value 
          			{
	          			//decrease the positive rating of the session by 1
                  --result.rating.positive.value;

						//remove from positive voters list
						result.rating.positive.users.splice(result.rating.negative.users.indexOf(email), 1);            
					}
					
					//increase the negative rating of the session by 1
					++result.rating.negative.value;
					
					//add to the negative votes list
					result.rating.negative.users.push(email);
					
					console.log("UPDATESESSIONRATING:user: " + email + " DOWN vote for session: " + sessionId + " was successfully received.");
          r.desc = "user: " + email + " DOWN vote for session: " + sessionId + " was successfully received.";
        }
      }

			if (rating == 1)	//positive case
			{
				if ( votedBefore == 1 )				//voted positive before - remove the user from positive voters list and update the positive rating value
				{
          			//decrease the positive rating of the session by 1
               --result.rating.positive.value;

					//remove from positive voters list
					result.rating.positive.users.splice(result.rating.negative.users.indexOf(email), 1);
					
					console.log("UPDATESESSIONRATING:user: " + email + " UP vote for session: " + sessionId + " was successfully removed.");
          r.desc = "user: " + email + " UP vote for session: " + sessionId + " was successfully removed.";   						
        }
        else 
        {
          			if ( votedBefore == 0 )			//voted negative before -  remove the user from negative voters list and update the rating value
          			{
						//decrease the negative rating of the session by 1
						--result.rating.negative.value; 
						
						//remove from negative voters list
						result.rating.negative.users.splice(result.rating.negative.users.indexOf(email), 1);            
         }

					//increase the positive rating of the session by 1
					++result.rating.positive.value; 
					
					//add the user to the positive voters lists
					result.rating.positive.users.push(email);

					console.log("UPDATESESSIONRATING:user: " + email + " UP vote for session: " + sessionId + " was successfully received.");
          r.desc = "user: " + email + " UP vote for session: " + sessionId + " was successfully received.";	
        }	
      }

    		//result.markModified('participants');
    		result.save(function(err, obj) 
    		{ 
    			if (err)
    			{
           console.log("UPDATESESSIONRATING:failure session save, the error: ", err);
           r.status = 0;
           r.desc = "failure session save";
           res.json(r);	
           return;     			
         }

        //obj.rating.positive.users =  (obj.rating.positive.users.indexOf(email)!= -1)?true:false;
        //obj.rating.negative.users =  (obj.rating.negative.users.indexOf(email)!= -1)?true:false; 

         r.status = 1;
         r.res = {
            positive:{
                users: (obj.rating.positive.users.indexOf(email) != -1) ? true : false,
                value:obj.rating.positive.value 
            },
            negative:{
                users: (obj.rating.negative.users.indexOf(email) != -1) ? true : false,
                value:obj.rating.negative.value 
            }
         };
         res.json(r);
         return; 
       });
      }    
    }); 

});

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

/* /session/uploadTags -- precondition
 * 	This function will receive json with sessionId, email: uploader's id and tags: an array oj JSON objects [{timestamp ,text}].
 *
 * /session/uploadTags -- postcondition
 * 	This function will return json with status: 1 = success / 0 = failure.
 *
 * /session/uploadTags -- description
 * 	This function will find the suitable 'session' document in 'sessions' collection. 
 * 	Tags could be uploaded only after the session was stated and until it was ended.
 * 
 * /session/uploadTags -- example
 *  sessionId				142964947916810933728
 * 	email					somemail1@gmail.com
 * 	tags[0][timestamp]		11
 * 	tags[0][text]			tag1
 * 	tags[1][timestamp]		36
 * 	tags[1][text]			tag2
 */
 router.post("/session/uploadTags", function( req, res ) 
 {
   var r = { };

   try
   {
    var sessionId = req.body.sessionId;
    var tags = req.body.tags;
    var email = req.body.email;
  }  
  catch( err )
  {
    console.log("UPLOADTAGS: failure while parsing the request, the error:" + err);
    r.status = 0;
    r.desc = "failure while parsing the request";
    res.json(r);
    return;
  }

    //TODO. Remove
    //console.log("session id: " + sessionId);
    //console.log("user email: " + email);
    //console.log("session tags: " + tags);
    
    if (  	typeof sessionId === 'undefined' || sessionId == null || sessionId == "" ||
			typeof tags === 'undefined' || tags == null || tags == "" ||		//TODO. add validation for array correctness
			typeof email === 'undefined' || email == null || email == ""	)		// if one of the properties do not exists in the request and it is empty
    {
    	console.log("UPLOADTAGS:request must contain sessionId, email and tags: [] properties.");
    	r.status = 0;	
      r.desc = "request must contain sessionId, email and tags: [] properties.";
      res.json(r); 
      return;
    }
    db.model('sessions').findOne( { sessionId : sessionId },
    //{ participants : true, owner : true, _id : false },	- does not wotk with this
    function (err, result)
    {
      if (err) 
      {
        console.log("UPLOADTAGS:failure during session search, the error: ", err);
        r.status = 0;
        r.desc = "failure during session search";
        res.json(r);	
        return;
      }
      if ( !result )
      {
       console.log("UPLOADTAGS:session: " + sessionId + " was not found.");
       r.status = 0;
       r.desc = "session: " + sessionId + " was not found";
       res.json(r);
       return;
     }
     else
     {
       if (result.startTime == 0 || result.stopTime != 0)
       {
        console.log("UPLOADTAGS:session: " + sessionId + " is not in progress.");
        r.status = 0;
        r.desc = "session: " + sessionId + " is not in progress";
        res.json(r);
        return;        		
      }

      if (result.participants.indexOf(email) != -1 || result.owner == email )
      {
        (tags).forEach (function (tag) 
        {
         console.log("UPLOADTAGS:tag1: " + tag);	
		        	//console.log("UPLOADTAGS:tag1:timestamp: " + tag.timestamp);
		        	//console.log("UPLOADTAGS:tag1:text: " + tag.text);
		        	tag.email = email;
             tag.rating = { positive : { users : [], value : 0 }, negative : { users : [], value : 0 } };
             console.log("UPLOADTAGS:tag2: " + tag);
             result.elements.tags.push(tag);
           });

        		//result.markModified('participants');
        		result.save(function(err, obj) 
        		{ 
        			console.log("UPLOADTAGS: save");
        			if (err)
        			{
               console.log("UPLOADTAGS:failure session save, the error: ", err);
               r.status = 0;
               r.desc = "failure session save";
               res.json(r);	
               return;     			
             }

        			//console.log("obj is: " + obj); object after the update
              console.log("UPLOADTAGS:tags from user: " + email + " were uploaded to the session: " + sessionId + " successfully.");
              r.status = 1;
              r.desc = "tags from user: " + email + " were uploaded to the session: " + sessionId + " successfully.";
              res.json(r);
              return; 
            });

        	}
        	else
        	{
            console.log("UPLOADTAGS:user: " + email + " does not participate in the session: " + sessionId);
            r.status = 0;
            r.desc = "user: " + email + " does not participate in the session: " + sessionId;
            res.json(r);
            return;
          }
        	//console.log("UPLOADTAGS:result: " + result);
        }    
      });
});


/* /session/uploadImage -- precondition
 *  json data with file, sessionId, timestamp, email
 *
 * /session/uploadImage -- postcondition
 * json data with status 1/0
 *
 * /session/uploadImage -- postcondition
 * if recordStarts true can insert image into session id
 */
 router.post('/session/uploadImage', function(request, response) {
  var userip = request.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  var sessionId; 
  var file; // save file info
  var timestamp, email;

  console.log('-->UPLOAD IMAGE<--');
  var form = new formidable.IncomingForm();

  form.parse(request, function(error, fields, files) 
  {
    console.log('-->PARSE<--');
      //logs the file information 
      console.log("files",JSON.stringify(files));
      console.log("fields",JSON.stringify(fields));
      sessionId= fields.sessionId;
      file = files.file; // file.size
      timestamp = fields.timestamp;
      email = fields.email;
    });
  
  form.on('progress', function(bytesReceived, bytesExpected) 
  {
    var percent_complete = (bytesReceived / bytesExpected) * 100;
    console.log(percent_complete.toFixed(2));
  });

  form.on('error', function(err) 
  {
    console.log("-->ERROR<--");
    console.error(err);
  });
  
  form.on('end', function(error, fields, files) 
  {
    console.log('-->END<--');
    /* Temporary location of our uploaded file */
    var temp_path = this.openedFiles[0].path;
    console.log("temp_path: " + temp_path);

    /* The file name of the uploaded file */
    var file_name = this.openedFiles[0].name;
    console.log("file_name: " + file_name);

    var stream = cloudinary.uploader.upload_stream(function(result) 
    { 
      var r={};
      MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {

          // if mongodb connection failed return error message and exit
          if (err) 
          {
            console.log("connection error ",err);
            r.status=0;
            r.desc="err db";
            response.send((JSON.stringify(r)))
            return;
          }
          // if mongodb connection success asking for users collection
          var collection = db.collection('sessions');
          // find user id from users collection
          collection.find({sessionId:sessionId}).toArray(function (err, docs) 
          {
            // if the session exist update
            if (docs.length)
            {
              delete docs[0]._id;
              docs[0].elements.images.push({email: email,url: result.url,timestamp:timestamp});
              
                // insert new user to users collection 
                collection.update({sessionId:sessionId}, {$set : {elements:docs[0].elements}}, {upsert:true ,safe:true , fsync: true}, function(err, result) 
                { 
                  console.log("image list updated");
                  r.status=1;
                  r.desc="image uploaded";
                  db.close();
                  response.send((JSON.stringify(r)))
                });
              }
              else 
             { // if the session does not exist return status 0
              console.log("session not exist",sessionId);
              r.status=0;
              r.desc="session not exist";
              db.close();
              response.send((JSON.stringify(r)))
            }
          });
});
},
{
  public_id: uniqueid, 
  crop: 'limit',
  width: 640,
  height: 360,
        // eager: [
        //   { width: 200, height: 200, crop: 'thumb' },
        //   { width: 200, height: 250, crop: 'fit', format: 'jpg' }
        // ],                                     
        tags: [sessionId, 'lecturus']
      }      
      );
var file_reader = fs.createReadStream(temp_path).pipe(stream);
});
});

/* /session/uploadAudio -- precondition
 *  json data with file, sessionId, timestamp, email
 *
 * /session/uploadAudio -- postcondition
 * json data with status 1/0
 *
 * /session/uploadAudio -- postcondition
 * if recordStarts true can insert image into session id
 */
 router.post('/session/uploadAudio', function(request, response) 
 {
 	var userip = request.connection.remoteAddress.replace(/\./g , '');
  	var uniqueid = new Date().getTime()+userip;
  	var sessionId; // save session id
  	var timestamp, email, file, audioLength;
  	console.log('-->UPLOAD AUDIO<--');
  	var form = new formidable.IncomingForm();

  	form.parse(request, function(error, fields, files) 
  	{
  		console.log('-->PARSE<--');
        //logs the file information 
        //console.log("request", JSON.stringify(request));
        console.log("files", JSON.stringify(files));
        console.log("fields", JSON.stringify(fields));
        sessionId= fields.sessionId;
        timestamp = fields.timestamp;
        email = fields.email;
        audioLength = parseInt(fields.audioLength, 10);
	});

	form.on('progress', function(bytesReceived, bytesExpected) 
  	{
    	var percent_complete = (bytesReceived / bytesExpected) * 100;
    	console.log(percent_complete.toFixed(2));
  	});

  	form.on('error', function(err) 
  	{
   		console.log("-->ERROR<--");
   		console.error(err);
 	});

  	form.on('end', function(error, fields, files) 
  	{
    	console.log('-->END<--');
    	file = this.openedFiles[0];
    	/* Temporary location of our uploaded file */
    	var temp_path = this.openedFiles[0].path;
    	console.log("temp_path: " + temp_path);

    	/* The file name of the uploaded file */
    	var file_name = this.openedFiles[0].name;
    	console.log("file_name: " + file_name);

    	var stream = cloudinary.uploader.upload_stream(function(result) 
    	{ 
      		console.log(result);	//TODO. Remove
      		var r={};
      
      		MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, dataBase) 
      		{

        		// if mongodb connection failed return error message and exit
        		if (err) 
        		{
          			console.log("connection error ",err);
          			r.status=0;
          			r.desc="err db";
          			response.json(r);
		          	return;
		        }
		        
        		// if mongodb connection success asking for users collection
        		var collection = dataBase.collection('sessions');
        		// find user id from users collection
        		collection.find( { sessionId : sessionId }, { _id : false }).toArray(function (err, docs) 
        		{
            		// if the session exist update
            		if (docs.length)
            		{
                		//email url startAt length
                		docs[0].audios.push({
                  		length: audioLength,
                  		timestamp: timestamp,
                 		email: email,
                  		url: result.url,
                  		startAt: (docs[0].audios.length)?docs[0].audios[docs[0].audios.length-1].startAt + docs[0].audios[docs[0].audios.length-1].length : 0 
                		});
                		
                		docs[0].totalSecondLength+=audioLength;
                		// insert new user to users collection 
                		collection.update( { sessionId : sessionId }, { $set : { audios : docs[0].audios , totalSecondLength : docs[0].totalSecondLength } }, {upsert : true, safe : true, fsync : true}, function(err, result) 
                		{ 
                  			console.log("audio list updated");
                  			r.status = 1;
                  			r.desc = "audio uploaded";
                  			dataBase.close();
                  			response.json(r);
                		});
              		}
             		else 
             		{ // if the session does not exist return status 0
              			console.log("session not exist",sessionId);
              			r.status = 0;
              			r.desc="session not exist";
              			dataBase.close();
              			response.json(r);
            		}
          		});
    		});
    	},
    	{
      		public_id: uniqueid, 
      		resource_type: 'raw',
        	//format: 'mp3',
        	format: 'amr',
        	tags: [sessionId, 'lecturus']
      	});
      	
  		//var command = ffmpeg(temp_path)
    		//.audioCodec('libmp3lame') //libmp3lame libfaac
   			//.format('mp3');
 
  		//var t = command.clone().save("./tmp/" + uniqueid + ".mp3");
  		//console.log('converted file', t);
 
  		new ffmpeg( { source: temp_path } )
      		.toFormat('mp3')
      		.writeToStream(stream, function(data, err) 
      		{
		        if (err) 
		        {
		           console.log("converting failed ", sessionId);
		            r.status = 0;
		            r.desc = "converting failed";
		            response.json(r);
                return;
		        }
  			});
  //var file_reader = fs.createReadStream(t._currentOutput.target).pipe(stream);
  //var file_reader = fs.createReadStream(temp_path).pipe(stream);
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
      	var edit = req.body.edit; 			//TODO handel pluse minus views counter
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
            if (edit && edit=="true")
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

/* /session/getMembers -- precondition
 *	This function must receive json with sessionId, email.
 *
 * /session/getMembers -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure.
 *
 * /session/getMembers -- description
 *	This function will find the 'session' document in the 'sessions' collection by sessionId that will be received in the request.
 *	This function will insert the email of the user to 'participants' property in the 'session' document.
 *
 * /session/getMembers -- example
 *  sessionId 			1427559374447127001
 *  email			 	somemail1@gmail.com
 */
 router.post("/session/joinSession", function(req, res ) 
 {
	var r = { };	//response object	
	var allParticipants = new Array();

	try			//try to parse json data
	{
   		var email = req.body.email;
   		var sessionId = req.body.sessionId;
 	}
 	catch( err )
 	{
  		console.log("JOINSESSION: failure while parsing the request, the error:" + err);
  		r.status = 0;
  		r.desc = "failure while parsing the request";
  		res.json(r);
  		return;
	}
    if ( 	typeof email === 'undefined' || email == null || email == "" ||
    		typeof sessionId === 'undefined' || sessionId == null || sessionId == ""  )	// if email and sessionId properties do not exist in the request and empty
    {
    	console.log("JOINSESSION: request must contain a property email, sessionId.");
    	r.status = 0;	
      	r.desc = "request must contain a property email, sessionId.";
      	res.json(r); 
      	return;
    }
    
    db.model('sessions').findOne( { sessionId : sessionId },
    //{ participants : true, owner : true, _id : false },	- does not wotk with this
    function (err, result)
    {
      	if (err) 
  		{
    		console.log("JOINSESSION:failure during session search, the error: ", err);
			r.status = 0;
			r.desc = "failure during session search";
    		res.json(r);	
    		return;
  		}
      	if ( !result )
      	{
       		console.log("JOINSESSION:session: " + sessionId + " was not found");
       		r.status = 0;
       		r.desc = "session: " + sessionId + " was not found";
       		res.json(r);
       		return;
     	}
     	else
     	{
       		if (result.participants.indexOf(email) == -1 && result.owner != email )
       		{
        		result.participants.push(email);
        		//result.markModified('participants');
        		result.save(function(err, obj) 
        		{ 
        			if (err)
        			{
               			console.log("JOINSESSION:failure session save, the error: ", err);
               			r.status = 0;
               			r.desc = "failure session save";
               			res.json(r);	
               			return;     			
             		}

	        		//console.log("obj is: " + obj); object after the update
	              	console.log("JOINSESSION:user: " + email + " was joined to the session.");
	              	r.status = 1;
	              	r.desc = "user: " + email + " was joined to the session.";
	              	res.json(r);
	              	return; 
            	});
        	}
        	else
        	{
            	console.log("JOINSESSION:user: " + email + " already exists in the session");
            	r.status = 1;
            	r.desc = "user: " + email + " already exists in the session";
            	res.json(r);
            	return;
          }
          //console.log("JOINSESSION:result: " + result);
        }
      });
});

/* /session/deleteImage -- precondition
  data with imageurl
  */
/* /session/deleteImage -- postcondition
    delete the image from the cloud by her url
    json data with status 1/0
*/

router.post('/session/deleteImage', function(req, res) {
  var data = req.body.imageurl;
  var r ={};
  if (!data || data =='') 
  {
    console.log("image url not found");
    r.status = 0;
    r.desc = "image url not found";
    res.json(r);
    return;
  }
  var temp = data.split('/');
  cloudinary.uploader.destroy(temp[temp.length-1].split(".")[0], 
  function(result) 
  { 
    console.log(result) 
    if (result.result == "not found")
    {
      console.log("image was not found");
      r.status = 0;
      r.desc = "image was not found";
      res.json(r);
      return;
    }
    console.log("image deleted");
    r.status = 1;
    r.desc = "image deleted";
    res.json(r);
    return;
  });

});

module.exports = router;