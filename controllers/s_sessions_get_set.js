// var express = require('express');
var fs = require("fs-extra");
var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var formidable = require('formidable');
// var router = express.Router();
var cloudinary = require('cloudinary');
var ffmpeg = require('fluent-ffmpeg');
var ffmpegCommand = ffmpeg();
var gcm = require('node-gcm');


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
exports.updateSessionStatus = function (req,res,next){
  //create new empty variables
  var reqOwner, reqSession, reqStatus, reqTimestamp;  //temporary variables
  var r = { };                    //response object 
  var tempElements;
  
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

  if (    typeof reqSession === 'undefined' || reqSession == null || reqSession == "" ||
        typeof reqOwner === 'undefined' || reqOwner == null || reqOwner == "" ||
        typeof reqTimestamp === 'undefined' || reqTimestamp == null || reqTimestamp == "" ||
      typeof reqStatus === 'undefined' || reqStatus == null || reqStatus == ""  ) // if one of the property do not exists in the request and it is empty
  {
    console.log("UPDATESESSIONSTATUS:request must contain following properties: sessionId, email, status and timestamp.");
      r.status = 0;
      r.desc = "request must contain following properties: sessionId, email, status and timestamp.";
      res.json(r);  
      return; 
  }

  // TODO. remove 
   console.log("UPDATESESSIONSTATUS:Session owner is: " + reqOwner);
   console.log("UPDATESESSIONSTATUS:Session id is: " + reqSession);
   console.log("UPDATESESSIONSTATUS:Session status is: " + reqStatus);
   console.log("UPDATESESSIONSTATUS:Session timestamp is: " + reqTimestamp);  
 
  db.model('sessions').findOne( { sessionId : reqSession },
    //{ participants : true, owner : true, _id : false }, - does not wotk with this
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
        
      if ( !result )  //session was not found case
        {
          console.log("UPDATESESSIONSTATUS:session: " + reqSession + " was not found");
          r.status = 0;
          r.desc = "session: " + reqSession + " was not found";
          res.json(r);
          return;
      }
      else //session was found case
      {
          if (result.owner == reqOwner )  // check if the user is the session owner
          {
        if (reqStatus == 1)     //start session case
            {
              if ( result.startTime != 0 )
              {
                  console.log("UPDATESESSIONSTATUS:can not restart session: " + reqSession);
                  r.status = 0;
                  r.desc = "can not restart session: " + reqSession;
                  res.json(r);  
                  return;             
              }
                
          //getUserFriends( result.owner, result.participants );  //TODO. check for correctness...
          
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

            //inform participants that session has started sesstion
            informSessionStart(reqSession); 
             
                  console.log("UPDATESESSIONSTATUS:session: " + reqSession + " was started successfully.");
                  r.status = 1;
                  r.desc = "session: " + reqSession + " was started successfully.";
                  res.json(r);
                  return; 
               }); 
            }
        if (reqStatus == 0)   //stop session case
          {
            if (result.startTime == 0 )   // need to start the session first
              { 
            console.log("UPDATESESSIONSTATUS:can not stop session: " + reqSession + ", it was not started yet.");
              r.status = 0;
              r.desc = "can not stop session: " + reqSession + ", it was not started yet.";
              res.json(r);  
              return;             
              }
              if (result.stopTime != 0 )    // the session was stoped before
              {
                  console.log("UPDATESESSIONSTATUS:can not stop session: " + reqSession + ", it was already stopped.");
                  r.status = 0;
                  r.desc = "can not stop session: " + reqSession + ", it was already stopped.";
                  res.json(r);  
                  return;             
              }
              
                tempElements = result.elements; 
                var AsessionId = result.sessionId;  //TODO. erase
             
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
              
                    //rearrange elements value
                    updateSessionElements(tempElements, AsessionId);
              
                    //inform participants that session has stopped sesstion
                    informSessionStop(reqSession);
                    
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
}
// router.post("/session/updateSessionStatus", function(req, res ) 
// {
	
// });

/*
 * This function will reagange session events according to their timestamp and so will create the session format for web site use.
 */
function updateSessionElements(oldElements, session){
 	console.log("UPDATESESSIONELEMENTS.");
	var elemTemp = { };
  	   	
   	(oldElements.tags).forEach(function (tag) 
   	{
      tag.id = new Date().getTime();
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
      image.id = new Date().getTime();
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
            	dataBase.close(); // TODO REMOVE 
            	return;
          	} 
          	else 
          	{
            	console.log("session updated");
            	dataBase.close(); // TODO REMOVE 
            	return;
          	}
        });
 	});      
 }
 


/*
 * 
 */
function informSessionStart(sessionId) {  	
	//create new empty variables
	var message = new gcm.Message();	//create new gcm message
	var sender = new gcm.Sender('AIzaSyAjgyOeoxz6TC8vXLydERm47ZSIy6tO_6I');	//create new gcm object
	 
	console.log("INFORMSESSIONSTART:inform that session: " + sessionId + " has started.");
		    	
    db.model('sessions').findOne( 
	{ sessionId : sessionId }, 
	function (err, sessionObj )
	{    	
		if (err) 
		{
 			console.log("INFORMSESSIONSTART:failure during session search, the error: ", err);	
  			return;
		}
    		
		// if the session do not exist
        if (sessionObj == null)
        {
         	console.log("INFORMSESSIONSTART:session was not found.");	
          	return;
        }
	        	        
        // seach for the participants google registration id
        // validation that each user exists in the users collection before adding it to the session
        db.model('users').find( 
		{ email : { $in : sessionObj.participants } }, 
     	{ regId : true, _id : false },
		function (err, arrUsers)
		{
			console.log("INFORMSESSIONSTART:Array of users: " + arrUsers);
			
			// failure during user search
    		if (err) 
    		{
     			console.log("INFORMSESSIONSTART:failure during users search, the error: ", err);	
      			return;
    		}
    		if ( arrUsers.length == 0 )
    		{
     			console.log("INFORMSESSIONSTART:no session participans were found.");	
      			return;
    		}
    		else
    		{
    			message.addData('message', 'start session');
    			message.addData('status', '2');
				message.addData('sessionId', sessionId);
				message.delay_while_idle = 1;
				
		     	(arrUsers).forEach (function (user) 
		     	{
		      		console.log("INFORMSESSIONSTART:participant's registration id: " + user.regId);
		      		var registrationIds = [];
		      		registrationIds.push(user.regId);
		      		
		      		//send each participant a gcm message - async
		      		sender.sendNoRetry(message, registrationIds, function(err, sentResult) 
					{
					  	if(err) 
					  	{
					  		console.error("INFORMSESSIONSTART:error is: " + err);
					  	}
					  	else 
					  	{
					  	   console.log("INFORMSESSIONSTART:message sending to: " + currRes.regId + " resulted with:" + sentResult);
				  	  	}
					});
		    	});

    		}
   		});                    
	});
}

/*
 * 
 */
function informSessionStop(sessionId) {  	
	//create new empty variables
	var message = new gcm.Message();	//create new gcm message
	var sender = new gcm.Sender('AIzaSyAjgyOeoxz6TC8vXLydERm47ZSIy6tO_6I');	//create new gcm object
	
	console.log("INFORMSESSIONSTOP:inform that session: " + sessionId + " has started.");
	    	
    db.model('sessions').findOne( 
	{ sessionId : sessionId }, 
	function (err, sessionObj )
	{    	
		if (err) 
		{
 			console.log("INFORMSESSIONSTOP:failure during session search, the error: ", err);	
  			return;
		}
    		
		// if the session do not exist
        if (sessionObj == null)
        {
         	console.log("INFORMSESSIONSTOP:session was not found.");	
          	return;
        }
	        	        
        // seach for the participants google registration id
        // validation that each user exists in the users collection before adding it to the session
        db.model('users').find( 
		{ email : { $in : sessionObj.participants } }, 
     	{ regId : true, _id : false },
     	//'-_id -regId',
		function (err, arrUsers)
		{
			console.log("INFORMSESSIONSTOP:Array of users: " + arrUsers);
			
			// failure during user search
    		if (err) 
    		{
     			console.log("INFORMSESSIONSTOP:failure during users search, the error: ", err);	
      			return;
    		}
    		if ( arrUsers.length == 0 )
    		{
     			console.log("INFORMSESSIONSTOP:no session participans were found.");	
      			return;
    		}
    		else
    		{
    			message.addData('message', 'stop session');
    			message.addData('status', '3');
				message.addData('sessionId', sessionId);
				message.delay_while_idle = 1;
				
		     	(arrUsers).forEach (function (user) 
		     	{
		      		console.log("INFORMSESSIONSTOP:participant's registration id: " + user.regId);
		      		var registrationIds = [];
		      		registrationIds.push(user.regId);
		      		
		      		//send each participant a gcm message - async
		      		sender.sendNoRetry(message, registrationIds, function(err, sentResult) 
					{
					  	if(err) 
					  	{
					  		console.error("INFORMSESSIONSTOP:error is: " + err);
					  	}
					  	else 
					  	{
					  	   console.log("INFORMSESSIONSTOP:message sending to: " + currRes.regId + " resulted with:" + sentResult);
				  	  	}
					});
		    	});

    		}
   		});                    
	});
}


/*
 * 
 */
exports.seekSessionStandby = function (req,res,next){
    var sessionId, email;
    var r = { };
      var message = new gcm.Message();  //create new gcm message
      var sender = new gcm.Sender('AIzaSyAjgyOeoxz6TC8vXLydERm47ZSIy6tO_6I'); //create new gcm object

      try
      {
        sessionId = req.body.sessionId;
        email = req.body.email;
      }
      catch( err )
      {
        console.log("SEEKSESSIONSTANDBY:failure while parsing the request, the error:" + err);
        r.status = 0;
        r.desc = "failure while parsing the request.";
        res.json(r);
        return;
      }
      
      if (  typeof sessionId === 'undefined' || sessionId == null || sessionId == "" ||
          typeof email === 'undefined' || email == null || email == "" )  //check if sessionId, currOwner and futureOwner properties exist in the request and not empty
      {
        console.log("SEEKSESSIONSTANDBY:request must contain sessionId and email properties.");
        r.status = 0; 
        r.desc = "request must contain sessionId and email properties.";
        res.json(r); 
        return;
      }
      
      db.model('sessions').findOne( { sessionId : sessionId },
    //{ _id : false },
    function( err, sessionObj )
    {
      console.log("SEEKSESSIONSTANDBY:session is: " + sessionObj);
      
        // failure during session search
        if (err) 
        {
          console.log("SEEKSESSIONSTANDBY:failure during session search, the error: ", err);
          r.status = 0;
          r.desc = "failure during session search.";
          res.json(r);  
          return;
        }
        
      // if the sessions do not exist
      if (sessionObj == null)
      {
        console.log("SEEKSESSIONSTANDBY:session was not found.");
        r.status = 0;
        r.desc = "session was not found.";
        res.json(r);  
        return;
      }
      
          if (sessionObj.owner == email)  //email belongs to the owner case
          {
            if (sessionObj.participants.length == 0)
            {
              console.log("SEEKSESSIONSTANDBY:session: " + sessionId + " has no participants.");
              r.status = 0;
              r.desc = "session: " + sessionId + " has no participants.";
              res.json(r);  
              return;
            }
            
        //find first participant in the users database
        db.model('users').findOne( { email : sessionObj.participants[0] },
          { _id : false },
          function( err, userObj )
          {
            console.log("SEEKSESSIONSTANDBY:user is: " + userObj);
            
            // failure during session search
            if (err) 
            {
              console.log("SEEKSESSIONSTANDBY:failure during user search, the error: ", err);
              r.status = 0;
              r.desc = "failure during user search.";
              res.json(r);  
              return;
            }
            
          // if the sessions do not exist
          if (userObj == null)
          {
            console.log("SEEKSESSIONSTANDBY:user was not found.");
            r.status = 0;
            r.desc = "user was not found.";
            res.json(r);  
            return;
          }
          
            //set message details
            message.addData('message', 'switch owner');
            message.addData('status', '4');
            message.addData('sessionId', sessionId);
            message.delay_while_idle = 1; 
            
            var participantRegId = [];
            participantRegId.push(userObj.regId);           
            
          //send gcm request to the first participant in the list
          sender.sendNoRetry(message, participantRegId, function(err, sentResult) 
          {
            if(err) 
            {
              console.error("SEEKSESSIONSTANDBY:error is: " + err);
            }
            else 
            {
             console.log("SEEKSESSIONSTANDBY:message sending to: " + userObj.regId + " resulted with:" + sentResult);
           }
         });
          
          console.log("SEEKSESSIONSTANDBY:request to replace you as session owner was sent to: " + sessionObj.participants[0]);
          r.status = 1;
          r.desc = "request to replace you as session owner was sent to: " + sessionObj.participants[0];
          res.json(r);  
          return;
        });
              }
              else              //email belongs to the one of session participants case
              {
              var nextParticipant = sessionObj.participants.indexOf(email)+1;

              //check if the next participant do not exist = current user is the last participant in the participants list
              if (sessionObj.participants.length >= nextParticipant)
              {
              //find the session owner in the users database
              db.model('users').findOne( { email : sessionObj.owner },
                { _id : false },
                function( err, userObj )
                {
                  console.log("SEEKSESSIONSTANDBY:user is: " + userObj);
                  
              // failure during session search
              if (err) 
              {
                console.log("SEEKSESSIONSTANDBY:failure during user search, the error: ", err);
                r.status = 0;
                r.desc = "failure during user search.";
                res.json(r);  
                return;
              }
              
              // if the user do not exist - not likely
              if (userObj == null)
              {
                console.log("SEEKSESSIONSTANDBY:user was not found.");
                r.status = 0;
                r.desc = "user was not found.";
                res.json(r);  
                return;
              }

              var ownerRegId = [];
              ownerRegId.push(userObj.regId); 

                //send gcm message to session owner = stop this session
                message.addData('message', 'standby not found');
                message.addData('status', '7');
                message.addData('sessionId', sessionId);
                message.delay_while_idle = 1;         
                
                sender.sendNoRetry(message, ownerRegId, function(err, sentResult) 
                {
                  if(err) 
                  {
                    console.error("SEEKSESSIONSTANDBY:error is: " + err);
                  }
                  else 
                  {
                   console.log("SEEKSESSIONSTANDBY:message sending to: " + userObj.regId + " resulted with:" + sentResult);
                 }
               });
                
                console.log("SEEKSESSIONSTANDBY:user: " + email + " was the last participant in the session.");
                r.status = 1;
                r.desc = "user: " + email + " was the last participant in the session.";
                res.json(r);  
                return;
              });
              }
              else
              {
              //find the session owner in the users database
              db.model('users').findOne( { email : sessionObj.participants[nextParticipant] },
                { _id : false },
                function( err, userObj )
                {
                  console.log("SEEKSESSIONSTANDBY:user is: " + userObj);
                  
              // failure during session search
              if (err) 
              {
                console.log("SEEKSESSIONSTANDBY:failure during user search, the error: ", err);
                r.status = 0;
                r.desc = "failure during user search.";
                res.json(r);  
                return;
              }
              
            // if the user do not exist - not likely
            if (userObj == null)
            {
              console.log("SEEKSESSIONSTANDBY:user was not found.");
              r.status = 0;
              r.desc = "user was not found.";
              res.json(r);  
              return;
            }
            
            message.addData('message', 'switch owner');
            message.addData('status', '4');
            message.addData('sessionId', sessionId);
            message.delay_while_idle = 1; 
            
            var nextParticipantRegId = [];
            nextParticipantRegId.push(userObj.regId); 
            
                //send gcm message to the nexparticipant = swith owner
                sender.sendNoRetry(message, nextParticipantRegId, function(err, sentResult) 
                {
                  if(err) 
                  {
                    console.error("SEEKSESSIONSTANDBY:error is: " + err);
                  }
                  else 
                  {
                   console.log("SEEKSESSIONSTANDBY:message sending to: " + userObj.regId + " resulted with:" + sentResult);
                 }
               });
                
                console.log("SEEKSESSIONSTANDBY:message was sent to the next participant in the list: " + sessionObj.participants[nextParticipant]);
                r.status = 1;
                r.desc = "message was sent to the next participant in the list: " + sessionObj.participants[nextParticipant];
                res.json(r);  
                return;           
              });
      }
      }
      });
}
// router.post('/session/seekSessionStandby', function(req, res)
// {
  
// });
// module.exports = router;