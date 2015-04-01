var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var formidable = require('formidable');
var express = require('express');
var fs = require("fs-extra");
var mkdirp = require('mkdirp');
var router = express.Router();
var path = require('path');
var cloudinary = require('cloudinary');

cloudinary.config({ 
  cloud_name: 'hakrhqyps', 
  api_key: '437118412619984', 
  api_secret: '2y8KTIp1PGzNUQgcwDQsjqMQiU4' 
  //cdn_subdomain: true
});

var files, clips = [], stream, currentfile, dhh;
var _public='./';

router.get('/session', function (req, res) 
{
	res.render('session',
	{
    	title:"Session API"
  	});
});

/* /session/createSession -- precondition
 * json data with email, name , description, lecturer, degree, course, more data as wanted
 *
 * /session/createSession -- postcondition
 *  create new session with and return the session id with timestamp and status 1/0
 *  json data with sessionId, server timestamp, status: 1 = success / 0 = failure
*/
router.post('/session/createSession', function (req, res) 
{
	// create timestamp and uniqeid
  	var date = new Date().getTime();
 	var userip = req.connection.remoteAddress.replace(/\./g , '');
  	var uniqueid = date + userip;
  	var r = { };
  	
	try 
	{
      // try to parse the json data
      var data = req.body;
      console.log("email is: " + req.body.email);
      
      if ( data.email && data.email != "" )		// if data.email property exists in the request is not empty
      { 
        // connect to mongodb
        MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) 	//TODO. REMOVE
        {
        	console.log("Trying to connect to db.");

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
            
            // get users collection 
            var collection = db.collection('users');
            
            collection.find( {email : data.email} ).toArray( function (err, docs) {
            
            	console.log("Trying to find the user in the db.");
            	
                // failure while connecting to users collection
                if (err) {
                
                    console.log("filure while searching for a user, the error: ", err);
                    r.uid = 0;
                    r.status = 0;
                    r.desc = "filure while searching for a user.";
                    res.send((JSON.stringify(r)));
                    return;
                }

                // the user do not exist
                if ( !docs.length ) {
                
                    console.log("user: " + data.email + " do not exist.");
                    r.uid = 0;
                    r.status = 0;
                    r.desc = "user: " + data.email + " was not found.";
                    res.send((JSON.stringify(r)));
                    return; 
                }

                // get session collection (only if the user exists)
                var collection = db.collection('sessions');
                
                collection.find( {sessionId : uniqueid} ).toArray(function (err, docs) {
                	console.log("Trying to find the session in the db.");
                	
                    // failure while connecting to session collection 
                    if (err){ 
                      console.log("filure while searching for a session, the error: ", err);
                      r.uid = 0;
                      r.status = 0;
                      r.desc = "filure while searching for a session";
                      res.send((JSON.stringify(r)));
                      return;
                    }
                    
                    // if the session exists 
                    if ( docs.length )
                        // create another session id because the last one was taken
                        uniqueid += new Date().getTime();
                    
                    // set session id  
                    data.sessionId = uniqueid;
                    
                    // set session owner
                    data.owner = data.email;
                    data.length = 0;
                    data.rating = 
                    {
                      	positive : 
                      	{
                        	value : 0,
                        	users : []	//<<---shouldn't we call them voters?
                      	},
                      	negative : 
                      	{
                        	value : 0,
                        	users : []	//<<---shouldn't we call them voters?
                      	},
                    };
                    data.participants = [];
                    data.audios = []; // {email, url, length, startAt}
                    data.elements = {
                        	//time : { // integer
                            	tags : [], // {timestamp, email, text, rating {positive:{ users[] , rate},negative:{ users[], rate} } }
                            	images : [] // {timestamp, email, url}
                        	//}
                      	};
                    data.views = 0;
                    data.recordStarts = false;
                    data.active = true;
                    data.public = false;
                    data.timestamp = date;
                    delete data.email;

                    // insert new session into db
                    collection.insert( data, {upsert:true, safe:true , fsync: true}, function(err, result) {
                    	console.log("Trying to insert new session into the db.");
                        // failure during insertion of new session
                        if (err) {
                         	console.log("failure during insertion of new session, the error: ", err);
                         	r.uid = 0;
                          	r.status = 0;
                          	r.desc = "failure during insertion of new session";
                         	res.send((JSON.stringify(r)));
                          	return;
                        }

						          // succeeded to insert new session
                        console.log("session", result);
                        r.sessionId = uniqueid;
                        r.timestamp = date;
                        r.status = 1;
                        r.desc = "session created";
                        db.close();		//TODO. REMOVE 
                        res.send((JSON.stringify(r)));
                    });
                });
            });
        });
      } 
      else{	// if data.email does not exist or empty
          console.log("data.email propery does not exist in the query or it is empty");
          r.status = 0;
          r.desc = "data.email propery does not exist in the query or it is empty";
          res.send((JSON.stringify(r)));     
      }
  } // if the json data parsing failed
	catch(err)
  	{
  		console.log("failure while parsing the request, the error:", err);
    	r.status = 0;
    	r.desc = "failure while parsing the request";
    	res.send((JSON.stringify(r)));
  	}
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
	var userId, r= {};
	
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
        	
        // connect to mongodb
        MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) // TODO. REMOVE 
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
            
            collection.find( { $or: [ { owner : userId }, { participants: { $elemMatch: { user: userId } } } ] }  ).toArray( function (err, docs) 
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
                
                // no documents found
                if ( !docs.length ) 
                {
                    console.log("user: " + userId + " did not participate in any session.");
                    r.uid = 0;
                    r.status = 0;
                    r.desc = "user: " + userId + " did not participate in any session.";
                    res.json(r);
                    return; 
                }
                else
                {
                    console.log("sessions with user: " + userId + " participation: " + docs);
                    r.status = 1;
                    r.userRecordings = docs;
                    r.desc = "sessions with user: " + userId + " participation.";
                    db.close();		/* TODO REMOVE */
                    res.json(r);		                	
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

/* /session/addMembers -- precondition
 *	This function must receive json with sessionId, participants: array[emails]
 *
 * /session/addMembers -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure 
 *
 * /session/addMembers -- description
 *	This function will find the 'session' document in the 'sessions' collection by sessionId that will be received in the request
 *	This function will insert all user's emails received in the request into the 'session' document as session 'participants'.
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
  	var newParticipants = Array();
  	var oldParticipants, data;
	var r = { };	//response object	
  		        	
	try
  	{
        // try to parse the json data
        data = req.body;
        newParticipants = req.body.participants;
        
        if ( newParticipants.length == 0 )
        {
        	console.log("no participants were sent.");
            r.uid = 0;
            r.status = 0;
            r.desc = "no participants were sent.";
            res.send((JSON.stringify(r)));
            return; 	
        }
        else	//TODO. ERASE
        {
			(newParticipants).forEach (function (currParticipant) 
			{
			  	console.log("email: " + currParticipant);
			});
        }
         
        if ( data.sessionId && data.sessionId != "" )	// if data.sessionId property exists in the request is not empty
        {
        	console.log("Session id is: " + data.sessionId);
        	
	        // connect to mongodb
	        MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) /* TODO. REMOVE */
			{
				console.log("Trying to connect to the db.");
					            
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
	            
	            // get sessions collection 
	            var collection = db.collection('sessions');
	            
	            collection.find( { sessionId : data.sessionId } ).toArray( function (err, docs) 
	            {
	            	console.log("Searching for the session collection");
	            	
	                // failure while connecting to sessions collection
	                if (err) 
	                {
	                    console.log("failure while searching for a session, the error: ", err);
	                    r.uid = 0;
	                    r.status = 0;
	                    r.desc = "failure while searching for a session.";
	                    res.send((JSON.stringify(r)));
	                    return;
	                }
	                
	                // the session do not exist
	                if ( !docs.length ) 
	                {
	                    console.log("session: " + data.sessionId + " do not exist.");
	                    r.uid = 0;
	                    r.status = 0;
	                    r.desc = "session: " + data.sessionId + " was not found.";
	                    res.send((JSON.stringify(r)));
	                    return; 
	                }
	                else
	                {
	                	// there is only one session with this sessionId
	                	
        				(docs).forEach (function (currDoc) 
						{
						  	console.log("session participants: " + currDoc.participants);
						  	// we get an array of existing participants
						  	oldParticipants = currDoc.participants;
						});
						
						console.log("oldParticipants: " + oldParticipants);
						newParticipants = arrayUnique(oldParticipants.concat(newParticipants));
	                
						collection.update( { sessionId : data.sessionId }, { $set: { participants : newParticipants } }, function(err, result) 
						{ 
							// failure while connecting to sessions collection
			                if (err) 
			                {
			                    console.log("filure while update session participants, the error: ", err);
			                    r.uid = 0;
			                    r.status = 0;
			                    r.desc = "filure while update session participants.";
			                    res.send((JSON.stringify(r)));
			                    return;
			                }
			                else
			                {
		                        console.log("session participants were updated.");
		                        r.status = 1;
		                        r.desc = "session participants were updated.";
		                        db.close();		/* TODO REMOVE */
		                        res.send((JSON.stringify(r)));		                	
			                }
	                	});
                    }
                    
					/* TODO. Validate that each user exists in the db 
	                // get users collection (only if the session exists)
	                var collection = db.collection('users');
	                
	                
	                collection.find( {sessionId : uniqueid} ).toArray(function (err, docs) 
	                {
	                    // failure while connecting to session collection 
	                    if (err) 
	                    {
	                        console.log("filure while searching for a session, the error: ", err);
	                        r.uid = 0;
	                        r.status = 0;
	                        r.desc = "filure while searching for a session";
	                        res.send((JSON.stringify(r)));
	                        return;
	                    }
	                    
	                    // if the session exists 
	                    if ( docs.length )
	                        // create another session id because the last one was taken
	                        uniqueid += new Date().getTime(); 
	                });
	                */
             });
			});
		}
		else
		{
            console.log("data.sessionId propery does not exist in the query or it is empty");
            r.status = 0;
            r.desc = "data.sessionId propery does not exist in the query or it is empty";
            res.send((JSON.stringify(r)));  
            return;			
		}
	}	                        
    catch(err)
    {
    	console.log("failure while parsing the request, the error:", err);
        
        r.desc = "failure while parsing the request";
        res.send((JSON.stringify(r)));
       
    }

});

/*
 * This function will receive an array and delete all duplicate entries.
 */
function arrayUnique( array ) 
{
    var a = array.concat();
    
    for(var i=0; i<a.length; ++i) 
    {
        for(var j=i+1; j<a.length; ++j) 
        {
            if(a[i] === a[j])
            	a.splice(j--, 1);
        }
    }

    return a;
};

/* 	/session/getUserSessionsInProgress -- precondition
 *	This function must receive json with sessionId, participants: array[emails]
 *
 * /session/getUserSessionsInProgress -- postcondition
 *	This function will return json with array of sessions, status: 1 = success / 0 = failure 
 *
 * /session/getUserSessionsInProgress -- description
 *	This function will find the 'session' documents in the 'sessions' collection by user email that will be received in the request.
 *	This function will expract from those sessions all partisipans and check 
 *
 * /session/getUserSessionsInProgress -- example
 *  email 	somemail1@gmail.com
*/
router.post("/session/getUserSessionsInProgress", function(req, res ) 
{
 	var sessionId = _public+req.body.sessionId[0];
  	var userip = req.connection.remoteAddress.replace(/\./g , '');
  	var uniqueid = new Date().getTime()+userip;
	  
 	res.send(JSON.stringify({"status":1,"desc":"success"}));
});


/* /session/getUserRelatedVideos -- precondition
 * json data with email
 *
 * /session/getUserRelatedVideos -- postcondition
 * return all the videos that the user was involved with like owner or participent  
 * json data with status 1/0, all related videos  
*/
router.post("/session/getUserRelatedVideos",multipartMiddleware, function(req, res ) 
{
  //create new empty variables
  var email;  //temporary variables
  var r = {};              //response object 
                
  try
  {
    // try to parse the json data
    email = req.body.email;
    console.log(req.body,email)
      if ( email && email != "" ) // if email property exists in the request and is not empty
      {
        // connect to mongodb
        MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) // TODO. REMOVE 
        {
          console.log("Trying to connect to the db.");
                  
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
          
          // get sessions collection 
          var collection = db.collection('sessions');
          //TODO. check that 'recordStarts' value differs from expected, else return status '0' - failure.                  
          
          collection.find( { sessionId:123 }).toArray(function (err, docs)
          { 
            // failure while connecting to sessions collection
            if (err) 
            {
                console.log("failure while trying close session, the error: ", err);
                r.status = 0;
                r.desc = "failure while trying close session.";
                res.send((JSON.stringify(r)));
                return;
            }
            else
            {
              r.uid = 0;
              r.info = docs;
              r.status = 0;
              r.desc = "failed to connect to MongoLab.";
              res.send((JSON.stringify(r)));
            }
          });                  
        });
      }
      else
      {
              console.log("email propery does not exist in the query or it is empty");
              r.status = 0;
              r.desc = "email propery does not exist in the query or it is empty";
              res.send((JSON.stringify(r)));  
              return;     
    }
  }                         
  catch(err)
  {
    console.log("failure while parsing the request, the error:", err);
      r.status = 0;
      r.desc = "failure while parsing the request";
      res.send((JSON.stringify(r)));
      return;
  } 
});

/* /session/updateSessionStatus -- precondition
 *  This function will receive json with sessionId, email: session owner's email, status: 1 = start / 0 = stop.
 * 	
 * 
 * /session/updateSessionStatus -- postcondition
 *  This function will return json with status: 1 = success / 0 = failure.
 *  
 * /session/updateSessionStatus -- description
 *  This function will find the suitable session according to 'sessionId' passed in the request, check if email passed in the request 
 *  belongs to the session 'owner', if yes it will alter session property 'recordStarts' to needed one in the 'sessions' collection.
 * 
 * /session/updateSessionStatus -- example
 *  sessionId	1427559374447127001
 *  email		somemail1@gmail.com	
 *	status		1
*/
router.post("/session/updateSessionStatus",multipartMiddleware, function(req, res ) 
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
               
      if ( reqSession && reqSession != "" )	// if data.sessionId property exists in the request and is not empty
      {
      	console.log("Owner is: " + reqOwner);
      	console.log("Session id is: " + reqSession);
      	console.log("Session status is: " + reqStatus);
      	
        // connect to mongodb
        MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) /* TODO. REMOVE */
  			{
  				console.log("Trying to connect to the db.");
  		            
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
          
          // get sessions collection 
          var collection = db.collection('sessions');
          //TODO. check that 'recordStarts' value differs from expected, else return status '0' - failure.	                
  				
          collection.find( { sessionId:reqSession }).toArray(function (err, docs)
          { 
            // failure while connecting to sessions collection
            if (err) 
            {
                console.log("failure while trying close session, the error: ", err);
                r.status = 0;
                r.desc = "failure while trying close session.";
                res.send((JSON.stringify(r)));
                return;
            }
            else
            {
              if (docs.length)
              {
                // elements:closeSessionFunction(docs[0].elements)
                  collection.update( { 
                  $and : [ { sessionId : reqSession }, { owner : reqOwner } ] }, 
                  { $set : { recordStarts : reqStatus , elements: (reqStatus==1) ? closeSessionFunction(docs[0].elements) : docs[0].elements } }, function( err, result ) 
                  { 
                  // failure while connecting to sessions collection
                    if (err) 
                    {
                        console.log("failure while update session status, the error: ", err);
                        r.uid = 0;
                        r.status = 0;
                        r.desc = "failure while update session status.";
                        res.send((JSON.stringify(r)));
                        return;
                    }
                    
                    if (result === 0)
                    {
                        console.log("failed to find suitable session, the error: ", err);
                        r.uid = 0;
                        r.status = 0;
                        r.desc = "failed to find suitable session.";
                        res.send((JSON.stringify(r)));
                        return;
                    }
                    else
                    {
                          console.log("session status was updated, the result is: " + result);
                          r.status = 1;
                          r.desc = "session status was updated.";
                          db.close();   /* TODO REMOVE */
                          res.send((JSON.stringify(r)));                      
                    }
                });
              }
            }
          });                  
  			});
  		}
  		else
  		{
              console.log("data.sessionId propery does not exist in the query or it is empty");
              r.status = 0;
              r.desc = "data.sessionId propery does not exist in the query or it is empty";
              res.send((JSON.stringify(r)));  
              return;			
		}
	}	                        
  catch(err)
  {
  	console.log("failure while parsing the request, the error:", err);
      r.status = 0;
      r.desc = "failure while parsing the request";
      res.send((JSON.stringify(r)));
      return;
  }                   
});

/* /session/stopRecording -- precondition
 * json data with sessionId, email, recording true/fale, timestamp
 *
 * /session/stopRecording -- postcondition
 *  store the information inside mongodb session collection like session.recordStarts and 
 *  uploading an audio and image and tags disable iff its false
 *  and to manage elements order by timestamp for the website audio query
 * json data with status 1/0
*/
router.post("/session/stopRecording",multipartMiddleware, function(req, res ) 
{
	var sessionId = req.body.sessionId;
	var userip = req.connection.remoteAddress.replace(/\./g , '');
	var uniqueid = new Date().getTime()+userip;
  
  MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) /* TODO. REMOVE */
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
      console.log(JSON.stringify(sessionId))
      // get sessions collection 
      var collection = db.collection('sessions');
      //TODO. check that 'recordStarts' value differs from expected, else return status '0' - failure.                    
      collection.find( { sessionId:sessionId }).toArray(function (err, docs)
      { 
        // failure while connecting to sessions collection
        if (err) 
        {
            console.log("failure while trying close session, the error: ", err);
            r.status = 0;
            r.desc = "failure while trying close session.";
            res.send((JSON.stringify(r)));
            return;
        }
        else
        {
          if (docs.length)
            collection.update({sessionId:sessionId},{ $set : {elements:closeSessionFunction(docs[0].elements)} }, {upsert:true ,safe:true , fsync: true}, function(err, result) { 
                console.log("session closed");
                r.status=1;
                r.desc="session closed";
                db.close(); /* TODO REMOVE */
                res.send((JSON.stringify(r)))
             });
        }
      });         
  }); 
  	
});

/*
 * create the session format as the client want
*/
function closeSessionFunction(elements){
  var elemTemp={};
  (elements.tags).forEach (function (tag) 
  {
      if (elemTemp[tag.timestamp])
        elemTemp[tag.timestamp].tags.push(tag)
      else
      {
        elemTemp[tag.timestamp]={
          tags:[tag]
        }
      }
  });
  (elements.images).forEach (function (image) 
  {
      if (elemTemp[image.timestamp])
      {
          elemTemp[image.timestamp].photo = image;
      }
      else
      {
        elemTemp[image.timestamp]={
          photo:image
        }
      }
  });
  return elemTemp;
}
/* /session/updateSession -- precondition
 *  json data with session detailes
 * 
 * /session/updateSession -- postcondition
 * update the session in mongo collection session
 * json data with status 1/0
*/
router.post("/session/updateSession",multipartMiddleware, function(req, res ) {
  var data = req.body.data;
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) /* TODO. REMOVE */
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
      collection.find( { sessionId:data.sessionId }).toArray(function (err, docs)
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
          
          else
          {
              collection.update({sessionId:data.sessionId},{ $set : data }, {upsert:true ,safe:true , fsync: true}, function(err, result) { 
                  console.log("session updated");
                  r.status=1;
                  r.desc="session updated";
                  db.close(); /* TODO REMOVE */
                  res.send((JSON.stringify(r)))
               });
          }
      });         
  }); 
 
});

/* /session/updateSessionRating -- precondition
  json data with sessionId, email, rating true/false (positive/negative)
*/
/* /session/updateSessionRating -- postcondition
  check if the user not exist in votes (positive and negative) 
  json data with status 1/0
*/
router.post("/session/updateSessionRating",multipartMiddleware, function(req, res ) {
  var sessionId = _public+req.body.sessionId[0];
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  res.send(JSON.stringify({"status":1,"desc":"success"}));
});

/* /session/updateViews -- precondition
  json data with sessionId
*/
/* /session/updateViews -- postcondition
  update session views to ++ in the session collection
  json data with status 1/0
*/
router.post("/session/updateViews",multipartMiddleware, function(req, res ) {
  var sessionId = _public+req.body.sessionId[0];
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  res.send(JSON.stringify({"status":1,"desc":"success"}));
});

/* /session/uploadTag -- precondition
  json data with sessionId, tags[json data {timestamp ,text, email}]
*/
/* /session/uploadTag -- postcondition
  if recordStarts true can insert tags into session id
  json data with status 1/0
*/
router.post("/session/uploadTag",multipartMiddleware, function(req, res ) {
  var sessionId = req.body.sessionId;
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  var tags = req.body.tags;
  console.log(req.body,sessionId,tags)
  var r={};
  MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) 
  {
    // if mongodb connection failed return error message and exit
    if (err) 
    {
        console.log("connection error ",err);
        r.status=0;
        r.desc="err db";
        res.send((JSON.stringify(r)))
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
        (tags).forEach (function (tag) 
        {
          tag.rating = {positive:{ users:[] , rate:0},negative:{ users:[], rate:0} };
          console.log(tag)
          docs[0].elements.tags.push(tag);
        });
        delete docs[0]._id;
        // insert new user to users collection 
        collection.update({sessionId:sessionId},{ $set : {elements:docs[0].elements} }, {upsert:true ,safe:true , fsync: true}, function(err, result)
        { 
            console.log("tags list updated");
            r.status=1;
            r.desc="tags uploaded";
            db.close();
            res.send((JSON.stringify(r)))
        });
      }
      else 
      { // if the session does not exist return status 0
            console.log("session not exist",sessionId);
            r.status=0;
            r.desc="session not exist";
            db.close();
            res.send((JSON.stringify(r)))
      }
    });
  });
});

/* /session/uploadImage -- precondition
  json data with file, sessionId, timestamp, email
*/
/* /session/uploadImage -- postcondition
  if recordStarts true can insert tags into session id
  json data with status 1/0
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
  json data with file, sessionId, timestamp, email
*/
/* /session/uploadAudio -- postcondition
  if recordStarts true can insert tags into session id
  json data with status 1/0
*/
router.post('/session/uploadAudio', function(request, response) {
  var userip = request.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  var sessionId; // save session id
  var timestamp, email,file;
  var audioLength=30;//shound be received from the application
    console.log('-->UPLOAD AUDIO<--');
    var form = new formidable.IncomingForm();
   
    form.parse(request, function(error, fields, files) 
    {
        console.log('-->PARSE<--');
        //logs the file information 
        console.log("files",JSON.stringify(files));
        console.log("fields",JSON.stringify(fields));
        sessionId= fields.sessionId;
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
        file = this.openedFiles[0];
        /* Temporary location of our uploaded file */
        var temp_path = this.openedFiles[0].path;
        console.log("temp_path: " + temp_path);
            
        /* The file name of the uploaded file */
        var file_name = this.openedFiles[0].name;
        console.log("file_name: " + file_name);
            
        var stream = cloudinary.uploader.upload_stream(function(result) { 
           var r={};
            MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) 
            {
            
            // if mongodb connection failed return error message and exit
            if (err) {
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
                if (docs.length){

                    delete docs[0]._id;
                    //email url startAt length
                    docs[0].audios.push({
                      length: file.size,
                      timestamp:timestamp,
                      email: email,
                      url: result.url,
                      startAt: (docs[0].audios.length)?docs[0].audios[docs[0].audios.length-1].startAt+docs[0].audios[docs[0].audios.length-1].length:0 
                    });
                    docs[0].length+=file.size;
                    // insert new user to users collection 
                    collection.update({sessionId:sessionId}, {$set : {audios:docs[0].audios , length: docs[0].length}}, {upsert:true ,safe:true , fsync: true}, function(err, result) { 
                        console.log("audio list updated");
                        r.status=1;
                        r.desc="audio uploaded";
                        db.close();
                        response.send((JSON.stringify(r)))
                     });
                }
                 else { // if the session does not exist return status 0
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
          resource_type: 'raw',
          format: 'mp3',
          tags: [sessionId, 'lecturus']
        }      
      );
      var file_reader = fs.createReadStream(temp_path).pipe(stream);
    });
    
});


/* /session/getVideoById -- precondition
  data with videoId, edit true/false (info for data views conter)
*/
/* /session/getVideoById -- postcondition
  if edit is false session.views ++ any case return session details
  json data with status 1/0, all session data
*/
router.get('/session/getVideoById/:videoId?:edit?', function (req, res) {
  
    var videoId = req.query.videoId;
    var edit = req.query.edit; //TODO handel pluse minus views counter
    try{
      MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) // TODO. REMOVE 
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
          console.log(JSON.stringify(videoId))
          // get sessions collection 
          var collection = db.collection('sessions');
          //TODO. check that 'recordStarts' value differs from expected, else return status '0' - failure.                    
          collection.find( { sessionId:videoId }).toArray(function (err, docs)
          { 
            // failure while connecting to sessions collection
            if (err) 
            {
                console.log("failure while trying close session, the error: ", err);
                r.status = 0;
                r.desc = "failure while trying close session.";
                res.send((JSON.stringify(r)));
                return;
            }
            else
            {
             if (docs.length)
                console.log("video found");
                r.status = 1;
                r.info = (docs.length)?docs[0]:[];
                res.send((JSON.stringify(r)));
                
            }
          });         
      });
    }
    catch(err){
      console.log("failure while parsing the request, the error:", err);
      r.status = 0;
      r.desc = "failure while parsing the request";
      res.send((JSON.stringify(r)));
    } 
});


module.exports = router;