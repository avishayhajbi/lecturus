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

router.get('/session', function (req, res) {
	res.render('session',{
    title:"Session API"
  });
});

/* /session/createSession -- precondition
  json data with email, name, description, lecturer, degree, course, more data as wanted
*/
/* /session/createSession -- postcondition
  create new session with and return the session id with timestamp and status 1/0
  json data with sessionId, server timestamp, status: 1 = success / 0 = failure
*/
router.post('/session/createSession', function (req, res) 
{
	// create timestamp and uniqeid
  var date = new Date().getTime();
 	var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = date + userip;
	try {
      // try to parse the json data
      var data = req.body;
      console.log("email is: " + req.body.email);
      if ( data.email && data.email != "" )	{ // if data.email property exists in the request is not empty
        // connect to mongodb
        MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {//TODO. REMOVE
        	console.log("Trying to connect to db.");
            var r={};
            
            // if connection failed
            if (err) {
            
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
                    data.elements = [
                        {
                        	time : { // integer
                            	tags : [], // {email, text, rating {positive:{ users[] , rate},negative:{ users[], rate} } }
                            	images : [] // {email, url}
                        	}
                      	}
                    ];
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
  catch(err){
  	console.log("failure while parsing the request, the error:", err);
    var r={
      status : 0,
      desc : "failure while parsing the request"
    };
      res.send((JSON.stringify(r)));
  }
});

/* /session/addMembers -- precondition
 *	This function must receive json with sessionId, participants: array[emails]
*/
/* /session/addMembers -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure 
*/
/* /session/addMembers -- description
 *	This function will find the 'session' document in the 'sessions' collection by sessionId that will be received in the request
 *	This function will insert all user's emails received in the request into the 'session' document as session 'participants'.
 */
/* /session/addMembers -- example
 * sessionId 		1427559374447127001
 * participants[1] 	somemail1@gmail.com
 * participants[2] 	somemail2@gmail.com 
 * participants[3] 	somemail3@gmail.com
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
        
        if ( newParticipants.length == 0	)
        {
        	console.log("no participants were sent.");
            r.uid = 0;
            r.status = 0;
            r.desc = "no participants were sent.";
            res.send((JSON.stringify(r)));
            return; 	
        }
        else
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
	                    console.log("filure while searching for a session, the error: ", err);
	                    r.uid = 0;
	                    r.status = 0;
	                    r.desc = "filure while searching for a session.";
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
        r.status = 0;
        r.desc = "failure while parsing the request";
        res.send((JSON.stringify(r)));
        return;
    }
    //res.send(JSON.stringify({"status":1,"desc":"success"}));
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

/* /session/getSessionInProgress -- precondition
  json data with email
*/
/* /session/getSessionInProgress -- postcondition
  return all the active settions with the same participants as the user previous sessions  
  json data with status 1/0, all current active sesions that the user was participant 
*/
router.post("/session/getSessionInProgress", multipartMiddleware, function(req, res ) 
{
 	var sessionId = _public+req.body.sessionId[0];
  	var userip = req.connection.remoteAddress.replace(/\./g , '');
  	var uniqueid = new Date().getTime()+userip;
	  
 	res.send(JSON.stringify({"status":1,"desc":"success"}));
});

/* /session/startRecording -- precondition
  json data with sessionId, email, recording true/false, timestamp
*/
/* /session/startRecording -- postcondition
  store the information inside mongodb session collection like session.recordStarts and 
  uploading an audio and image and tags enable iff its true
  json data with status 1/0
*/
router.post("/session/startRecording",multipartMiddleware, function(req, res ) {
  var sessionId = _public+req.body.sessionId[0];
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  res.send(JSON.stringify({"status":1,"desc":"success"}));
});

/* /session/stopRecording -- precondition
  json data with sessionId, email, recording true/fale, timestamp
*/
/* /session/stopRecording -- postcondition
    store the information inside mongodb session collection like session.recordStarts and 
    uploading an audio and image and tags disable iff its false
  json data with status 1/0
*/
router.post("/session/stopRecording",multipartMiddleware, function(req, res ) 
{
	var sessionId = _public+req.body.sessionId[0];
  	var userip = req.connection.remoteAddress.replace(/\./g , '');
  	var uniqueid = new Date().getTime()+userip;
  
  	res.send(JSON.stringify({"status":1,"desc":"success"}));
});

/* /session/updateSession -- precondition
  json data with sessionId and any other data
*/
/* /session/updateSession -- postcondition
  update the session in mongo collection session
  json data with status 1/0
*/
router.post("/session/updateSession",multipartMiddleware, function(req, res ) {
  var sessionId = _public+req.body.sessionId[0];
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  res.send(JSON.stringify({"status":1,"desc":"success"}));
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
  json data with sessionId, tags[json data with timestamp{text, email}]
*/
/* /session/uploadTag -- postcondition
  if recordStarts true can insert tags into session id
  json data with status 1/0
*/
router.post("/session/uploadTag",multipartMiddleware, function(req, res ) {
  var sessionId = _public+req.body.sessionId[0];
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  res.send(JSON.stringify({"status":1,"desc":"success"}));
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
  var sessionId; // save session id
  var file; // save file info

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
            
        var stream = cloudinary.uploader.upload_stream(function(result) { 
           if (result.error){
              console.log(result); 
              response.send(JSON.stringify({"status":0,"desc":result.error}));
            }
            else {
              console.log(result);
              response.send(JSON.stringify({"status":1,"desc":"success","desc":result.url}));
            }
        },
        {
          public_id: uniqueid, 
          crop: 'limit',
          width: 2000,
          height: 2000,
          eager: [
            { width: 200, height: 200, crop: 'thumb' },
            { width: 200, height: 250, crop: 'fit', format: 'jpg' }
          ],                                     
          tags: ['1426236025252127001', 'lecturus']
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
  var file; // save file info

    console.log('-->UPLOAD AUDIO<--');
    var form = new formidable.IncomingForm();
   
    form.parse(request, function(error, fields, files) 
    {
        console.log('-->PARSE<--');
        //logs the file information 
        console.log("files",JSON.stringify(files));
        console.log("fields",JSON.stringify(fields));
        sessionId= fields.sessionId;
        file = files.file; // file.size
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
            
        var stream = cloudinary.uploader.upload_stream(function(result) { 
           if (result.error){
              console.log(result); 
              response.send(JSON.stringify({"status":0,"desc":result.error, "received_data":result.error}));
            }
            else {
              console.log(result);
              response.send(JSON.stringify({"status":1,"desc":"success", "received_data":result.url}));
            }
        },
        {
          public_id: uniqueid, 
          resource_type: 'raw',
          format: 'mp3',
          tags: ['1426236025252127001', 'lecturus']
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
  var edit = req.query.edit;
 
  try{
   var temp = {
    "videoId": "123aeEg",
    "title": "אוטומטים שיעור 1.3.14",
    "description": "no description",
    "public": true,
    "degree": 33,
    "course": 3313110,
    "lecturer": "kimhi",
    "totalSecondLength": 412,
    "uploadBy": "iofirag@gmail.com",
    "timestamp":"12/5/2015",
    "praticipant": [
      {
        "user": "vandervidi@gmail.com",
        "user": "avishayhajbi@gmail.com"
      }
    ],
    "audio": [
      {
        "sound": "http://res.cloudinary.com/hakrhqyps/raw/upload/v1427226573/1426236786297227001.mp3",
        "length": 214,
        "startSecond": 0,
        "user": "iofirag@gmail.com"
      }, {
        "sound": "http://res.cloudinary.com/hakrhqyps/raw/upload/v1427226581/1426236786297227002.mp3",
        "length": 198,
        "startSecond": 215,
        "user": "iofirag@gmail.com"
      }
    ],
    "elements": {
      "6": {
        "photo": {
          "url": "http://res.cloudinary.com/hakrhqyps/image/upload/v1427416506/04_fo4yui.jpg",
          "user": "vandervidi@gmail.com"
        },
        "tag": {
          "text": "this is tags 6",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "24": {
        "photo": {
          "url": "http://res.cloudinary.com/hakrhqyps/image/upload/v1427416499/02_zqcb9j.jpg",
          "user": "vandervidi@gmail.com"
        }
      },
      "210": {
        "tag": {
          "text": "audio-1 end",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "220": {
        "photo": {
          "url": "http://res.cloudinary.com/hakrhqyps/image/upload/v1427416494/01_luyefj.jpg",
          "user": "vandervidi@gmail.com"
        },
        "tag": {
          "text": "this is titles 220",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "379": {
        "photo": {
          "url": "http://res.cloudinary.com/hakrhqyps/image/upload/v1427416502/03_rsxjoo.jpg",
          "user": "vandervidi@gmail.com"
        },
        "tag": {
          "text": "this is titles 379",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "380": {
        "tag": {
          "text": "this is titles 380",
          "user": "vandervidi@gmail.com"
        }
      },
      "381": {
        "photo": {
          "url": "http://res.cloudinary.com/hakrhqyps/image/upload/v1427416494/01_luyefj.jpg",
          "user": "vandervidi@gmail.com"
        },
        "tag": {
          "text": "this is titles 381",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "382": {
        "tag": {
          "text": "this is titles 382",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "383": {
        "photo": {
          "url": "http://res.cloudinary.com/hakrhqyps/image/upload/v1427416502/03_rsxjoo.jpg",
          "user": "avishayhajbi@gmail.com"
        },
        "tag": {
          "text": "this is titles 383",
          "user": "vandervidi@gmail.com"
        }
      }
    },
    "status": 1
  }

  temp.status=1;
  res.send(JSON.stringify(temp));
  }catch(err){
    res.send(JSON.stringify({"status":0,"desc":"fail"}));
  }
});


module.exports = router;