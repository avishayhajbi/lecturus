var fs = require("fs-extra");
var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var formidable = require('formidable');
var cloudinary = require('cloudinary');
var ffmpeg = require('fluent-ffmpeg');
var ffmpegCommand = ffmpeg();
var gcm = require('node-gcm');

//delay for 2 minutes before updating the elements
arrangeElementsDelayMS = 120000;

/**
 * @inner
 * @memberof session
 * @function updateSessionStatus
 * @desc This function will find the suitable session according to 'sessionId' passed in the request, check if email passed in the request 
 *  belongs to the session 'owner', if yes it will alter session property 'recordStarts' to needed one in the 'sessions' collection.
 * @param {json} data - The object with the data
 * @param {string} data.email - name@gmail.com
 * @param {string} data.sessionId - name@gmail.com
 * @param {number} data.status - 0/1
 * @param {number} data.timestamp - {0-9}*
 * @returns {json} status: 1/0
 */

exports.updateSessionStatus = function (req,res,next)
{
  //create new empty variables
  var reqOwner, reqSession, reqStatus, reqTimestamp;  //temporary variables
  var r = { };                    //response object 
  
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
              
                    //re-arrange elements value
                    //updateSessionElements(tempElements, AsessionId);
                    // re-arrange elements after 30 seconds
              		setTimeout(function()
              		{
              			arrangeSessionElements(reqSession);
              		}, arrangeElementsDelayMS);
              
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
};

/*
 * This function will reagange session elents according to their timestamp and so will create the session format for web site use.
 */

function arrangeSessionElements(sessionId)
{
 	console.log("UPDATESESSIONELEMENTS.");
	var elemStructure = { };
	
	//connect to the database
	MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, nativeDB) 
	{
		console.log("UPDATESESSIONELEMENTS:Trying to connect to the db.");
		             
  		// if connection failed
      	if (err) 
      	{
			console.log("UPDATESESSIONELEMENTS:connection error ",err);
			return;
      	}
      	
       	//select users collection
      	var collection = nativeDB.collection('sessions');
  
      	// find session from sessions collection
      	collection.findOne({ sessionId : sessionId }, 
      	function (err, sessionObj) 
      	{
  			//check if error occured during session search
 			if (err) 
    		{
      			console.log("UPDATESESSIONELEMENTS:failure during session search, the error: ", err);
      			nativeDB.close(); 
      			return;
			}

			//check that the session was found - highliy unexpetable
      		if ( !sessionObj )
      		{
        		console.log("UPLOADIMAGE:session: " + sessionId + " was not found.");
        		nativeDB.close();
        		return;
    		}
    		else                // if the session exists, update
        	{ 
        		//rearange the tags in order to fit the structure    	 	   	
			   	(sessionObj.tags).forEach(function (tag,key) 
			   	{
			   		//create unique id for current tag
			      	tag.id = new Date().getTime()+key;
			      	
			      	//check that the spot is available in the structure (using timestamp)
			     	if (elemStructure[tag.timestamp])
			     	{
			     		//not available - add (using ush because that saved in an array)
			       		elemStructure[tag.timestamp].tags.push(tag);
			     	}
			     	else
			     	{
			     		//available - create new array
			       		elemStructure[tag.timestamp] = {
			         		tags:[tag]
			       		};
			     	}
				});
		
				//rearange the images in order to fit the structure 
			   	(sessionObj.images).forEach(function (image,key) 
			   	{
			   		//create unique id for current image
			      	image.id = new Date().getTime()+key;
			      	
			      	//check that the spot is available in the structure (using timestamp)
			    	if (elemStructure[image.timestamp])
			    	{
			          	elemStructure[image.timestamp].photo = image; //it should push the image one minute right
			        }
			        else
			        {
			          	elemStructure[image.timestamp] = {
			            	photo:image
			          };
			        }
			  	});
      
		      	collection.update(
		  		{ sessionId : sessionId }, 
		  		{ $set : {elements : elemStructure} }, 
		  		{ upsert : false, safe : true, fsync : true }, 
		      	function(err) 
		      	{ 
		        	if (err)
		        	{
		          		console.log("UPDATESESSIONELEMENTS:session: " + sessionId + " was not updated, err is: " + err);
		            	nativeDB.close(); // TODO REMOVE 
		            	return;
		          	} 
		          	else 
		          	{
		            	console.log("UPDATESESSIONELEMENTS:session: " + sessionId + " was updated successfully.");
		            	nativeDB.close(); // TODO REMOVE 
		            	return;
		          	}
		        });
			}
		});
	});       
 }
 
/*
 * 
 */
function informSessionStart(sessionId) 
{  	
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
function informSessionStop(sessionId) 
{  	
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
exports.seekSessionStandby = function (req,res,next)
{
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
};


/**
 * @inner
 * @memberof session
 * @function updateSessionStatus
 * @desc This function will find the suitable session according to 'sessionId' passed in the request, check if email passed in the request 
 *  belongs to the session 'owner', if yes it will alter session property 'pauseTime' so the session would became paused or unpaused.
 * @param {json} data - The object with the data
 * @param {string} data.email - name@gmail.com
 * @param {string} data.sessionId - name@gmail.com
 * @param {number} data.status - 0:stop pause / 1:pause
 * @param {number} data.timestamp - {0-9}*
 * @returns {json} status: 1/0
 **/
exports.pauseSession = function (req,res,next)
{
  	//create new empty variables
  	var reqOwner, reqSession, reqStatus, reqTimestamp;  //temporary variables
  	var r = { };                    					//response object 
  
  	//try to parse the json data
  	try
  	{
      	reqSession = req.body.sessionId;
      	reqOwner = req.body.email;
      	reqStatus = req.body.status;
      	reqTimestamp = req.body.timestamp;
    }
    catch(err)
    {
      	console.log("pauseSession:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
   	} 

	//check that all needed properties were received in the request
	if (    typeof reqSession === 'undefined' || reqSession == null || reqSession == "" ||
        	typeof reqOwner === 'undefined' || reqOwner == null || reqOwner == "" ||
        	typeof reqTimestamp === 'undefined' || reqTimestamp == null || reqTimestamp == "" ||
      		typeof reqStatus === 'undefined' || reqStatus == null || reqStatus == ""  ) 
  	{
    	console.log("pauseSession:request must contain following properties: sessionId, email, status and timestamp.");
      	r.status = 0;
      	r.desc = "request must contain following properties: sessionId, email, status and timestamp.";
      	res.json(r);  
      	return; 
  	}

  	// TODO. remove 
   	console.log("pauseSession:Session owner is: " + reqOwner);
   	console.log("pauseSession:Session id is: " + reqSession);
   	console.log("pauseSession:Session status is: " + reqStatus);
   	console.log("pauseSession:Session timestamp is: " + reqTimestamp);  
 
 	//search for the session document in the sessions collection
  	db.model('sessions').findOne( 
	{ sessionId : reqSession },
    //{ participants : true, owner : true, _id : false }, - does not wotk with this
    function (err, sessionObj)
    {
    	//check if the error occured during the search 
        if (err) 
        {
          	console.log("pauseSession:failure during session search, the error: ", err);
          	r.status = 0;
          	r.desc = "failure during session search";
          	res.json(r);  
          	return;
        }
        
        //check if the session exists in the database
      	if ( !sessionObj )  //session was not found case
        {
          	console.log("pauseSession:session: " + reqSession + " was not found.");
          	r.status = 0;
          	r.desc = "session: " + reqSession + " was not found.";
          	res.json(r);
          	return;
      	}
      	else //session was found case
      	{
      		// check if the user is the session owner
			if (sessionObj.owner == reqOwner )  
			{
        		if (reqStatus == 1)     //start pause case
            	{
            		//check that session is in progress
              		if ( sessionObj.startTime == 0 || sessionObj.stopTime != 0 )
              		{
                  		console.log("pauseSession:session: " + reqSession + " is not in progress.");
                  		r.status = 0;
                  		r.desc = "session: " + reqSession + " is not in progress.";
                  		res.json(r);  
                  		return;             
              		}
              		
              		//check if the session was already paused
              		if ( sessionObj.pauseTime != 0 )
              		{
                  		console.log("pauseSession:session: " + reqSession + " was already paused.");
                  		r.status = 0;
                  		r.desc = "ession: " + reqSession + " was already paused.";
                  		res.json(r);  
                  		return;             
              		}
              		
              		//update pause time
          			sessionObj.pauseTime = reqTimestamp;
          			
          			//save current updated session
            		sessionObj.save(function(err, saveObj) 
            		{
            			//check if the error occured during the save 
                  		if (err)
                  		{
              				console.log("pauseSession:failure during session save, the error: ", err);
                    		r.status = 0;
                    		r.desc = "failure during session save.";
                    		res.json(r);  
                    		return;           
            			}

            			//inform participants that session has been paused
            			informParticipants(reqSession, 8);
             
                  		console.log("pauseSession:session: " + reqSession + " was successfully paused.");
                  		r.status = 1;
                  		r.desc = "session: " + reqSession + " was successfully paused.";
                  		res.json(r);
                  		return; 
               		}); 
            	}
	        	if (reqStatus == 0)   //stop pause case
				{
					//check that the session was paused before
	            	if (sessionObj.pauseime == 0 )   // need to start the session first
	              	{ 
	            		console.log("pauseSession:session: " + reqSession + ", was not paused.");
	              		r.status = 0;
	              		r.desc = "session: " + reqSession + ", was not paused.";
	              		res.json(r);  
	              		return;             
	              	}
	             	
	             	//zero pause timer
					sessionObj.pauseTime = 0;
					
					//save current updated session
	              	sessionObj.save(function(err, saveObj) 
	              	{ 
	                  	if (err)
	                  	{
	                    	console.log("UPDATESESSIONSTATUS:failure during session save, the error: ", err);
	                    	r.status = 0;
	                    	r.desc = "failure during session save.";
	                    	res.json(r);  
	                    	return;           
	                  	}	
	                     
	                    //inform participants that session was unpaused
	                    informParticipants(reqSession, 9);
	                    
	                	console.log("pauseSession:session: " + reqSession + " was successfully unpaused.");
	                	r.status = 1;
	                	r.desc = "session: " + reqSession + " was successfully unpaused.";
	                	res.json(r);
	                	return; 
	              	});           
	          	}
			}
        	else
        	{
            	console.log("pauseSession:user: " + reqOwner + " is not a session owner.");
            	r.status = 0;
            	r.desc = "user: " + reqOwner + " is not a session owner.";
            	res.json(r);
            	return;
      		}
      	}                               
  });
};

/*
*
*/
function informParticipants(sessionId, messageId) 
{  	
	//create new empty variables
	var registrationIds = [];												//create an empty array for participants registration ids
	var message = new gcm.Message();										//create new gcm message
	var sender = new gcm.Sender('AIzaSyAjgyOeoxz6TC8vXLydERm47ZSIy6tO_6I');	//create new gcm object
	message.delay_while_idle = 1;											//set gcm message delay
	var users = [];															//create an empty array for participants and session owner
	
	//define message type
	switch(messageId)
	{
		case 2:
			console.log("informParticipants:inform that session: " + sessionId + " was started.");
			message.addData('message', 'start session');
			message.addData('status', '2');
			message.addData('sessionId', sessionId);
			break;
		case 3:
			console.log("informParticipants:inform that session: " + sessionId + " was stopped.");
			message.addData('message', 'stop session');
			message.addData('status', '3');
			message.addData('sessionId', sessionId);
			break;
	    case 8: //pause session case
	    	console.log("informParticipants:inform that session: " + sessionId + " was paused.");
			message.addData('message', 'pause session');
			message.addData('status', '8');
			message.addData('sessionId', sessionId);
	        break;
	    case 9:	//unpause session case
    		console.log("informParticipants:inform that session: " + sessionId + " was unpaused.");
			message.addData('message', 'unpause session');
			message.addData('status', '9');
			message.addData('sessionId', sessionId);
	        break;
	}
	 
	//search for the session in the session collection   	
    db.model('sessions').findOne( 
	{ sessionId : sessionId }, 
	function (err, sessionObj )
	{
		//check that the session search did not faile    	
		if (err) 
		{
 			console.log("informParticipants:failure during session search, the error is: ", err);	
  			return;
		}
    		
		//check if the session exists
        if (sessionObj == null)
        {
         	console.log("informParticipants:session: " + sessionId + " was not found.");	
          	return;
        }
	    
	    //save session participants and owner in the sme array 
	    users = sessionObj.participants;
	    users.push(sessionObj.owner);
	        	        
        //seach for the participant's google registration id and owner's full name
        //validation that each user exists in the users collection before sending him a message
        db.model('users').find( 
		{ email : { $in : users } }, 
     	{ regId : true, _id : false },
		function (err, arrUsers)
		{
			console.log("informParticipants:Array of users: " + arrUsers);
			
			//check for a failure during user search
    		if (err) 
    		{
     			console.log("informParticipants:failure occured during users search, the error is: ", err);	
      			return;
    		}
    		
    		//check that the session contains at least one participant
    		if ( arrUsers.length == 0 )
    		{
     			console.log("informParticipants:no session participans were found.");	
      			return;
    		}
    		else
    		{
				//fetch participants registration ids
		     	(arrUsers).forEach (function (user) 
		     	{
		     		if (user.email == sessionObj.owner)
		     		{
		     			console.log("informParticipants:session owner's name is: " + user.name); 
		     			message.addData('ownerId', user.name);
		     		}
		     		else
		     		{
			      		console.log("informParticipants:participant's registration id: " + user.regId); 		
		      			registrationIds.push(user.regId);
		     		}

		    	});
		    	
	      		//send the message to all session participants
	      		sender.sendNoRetry(message, registrationIds, function(err, sentResult) 
				{
					//check if an error occured during sending the gcm messages
				  	if(err) 
				  	{
				  		console.log("informParticipants:error is: " + err);
				  	}
				  	else 
				  	{
				  	   	console.log("informParticipants:message were sent successfully, the result is:" + sentResult);
			  	  	}
				});
    		}
   		});                    
	});
}
