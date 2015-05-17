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
        	format: 'mp3',
        	//format: 'amr',
        	tags: [sessionId, 'lecturus']
      	});
      	
  		//var command = ffmpeg(temp_path)
    		//.audioCodec('libmp3lame') //libmp3lame libfaac
   			//.format('mp3');
 
  		//var t = command.clone().save("./tmp/" + uniqueid + ".mp3");
  		//console.log('converted file', t);
 
  		new ffmpeg( { source: temp_path } )
      		.toFormat('mp3')
          .audioBitrate('128k')
          //.audioFrequency(22050)
          .audioChannels(2)
          .audioCodec('libmp3lame')
          .audioQuality(0)
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

module.exports = router;