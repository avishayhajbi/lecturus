var fs = require("fs-extra");
var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var formidable = require('formidable');
var cloudinary = require('cloudinary');
var ffmpeg = require('fluent-ffmpeg');
var ffmpegCommand = ffmpeg();
//var gcm = require('node-gcm');

/** @namespace session */

/**
 * @inner
 * @memberof session
 * @function uploadTags
 * @desc This function will find the suitable 'session' document in 'sessions' collection. 
 *  Tags could be uploaded only after the session was stated and until it was ended.
 * @param {json} data - The object with the data
 * @param {string} data.email - name@gmail.com
 * @param {string} data.sessionId - text
 * @param {array} data.tags - [{timestamp: number , text: text}]
 * @returns {json} status: 1/0
 */
exports.uploadTags = function(req, res, next)
{
  	var sessionId, email, tags;
  	var currentTime = new Date().getTime();
  	var r = { };
  	var tagsToAdd = [ ];

  	//try to parse json data
    try
    {
      sessionId = req.body.sessionId;
      tags = req.body.tags;
      email = req.body.email;
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
    
    if (    typeof sessionId === 'undefined' || sessionId == null || sessionId == "" ||
      		typeof tags === 'undefined' || tags == null || tags == "" ||    //TODO. add validation for array correctness
      		typeof email === 'undefined' || email == null || email == ""  )   // if one of the properties do not exists in the request and it is empty
  	{
      	console.log("UPLOADTAGS:request must contain sessionId, email and tags: [] properties.");
      	r.status = 0; 
        r.desc = "request must contain sessionId, email and tags: [] properties.";
        res.json(r); 
        return;
	}
 
   //  MongoClient.connect(config.mongoUrl, { native_parser : true }, function(err, nativeDB)
  	// {
   //  	console.log("UPLOADTAGS:Trying to connect to the db");
    
   //    	//check if connection failed
   //    	if (err) 
   //    	{
   //      	console.log("MongoLab connection error: ", err);
   //      	r.status = 0;
   //      	r.desc = "failed to connect to MongoLab.";
   //      	res.json(r);
   //      	return;
   //    	}
    
   //    //specify the collection
   //      var collection = nativeDB.collection('sessions');
        
        //find needed session document

        //TODO do all the insert in a one query
        db.model('sessions').findOne(
      	{ sessionId : sessionId },    
    	function(err, sessionObj)
    	{
      		//check if error occured during session search
      		if (err) 
        	{
          		console.log("UPLOADTAGS:failure during session search, the error: ", err);
          		r.status = 0;
          		r.desc = "failure during session search";
          		res.json(r);
          		// nativeDB.close(); 
          		return;
        	}
        
        	//check that the session was found
          	if ( !sessionObj )
          	{
            	console.log("UPLOADTAGS:session: " + sessionId + " was not found.");
            	r.status = 0;
            	r.desc = "session: " + sessionId + " was not found";
            	res.json(r);
            	// nativeDB.close();
            	return;
        	}
        	else
        	{
        		console.log("UPLOADTAGS:delay: " + arrangeElementsDelayMS);
        		console.log("UPLOADTAGS:current time: " + currentTime);
        		console.log("UPLOADTAGS:session stop time: " + sessionObj.stopTime);
        		console.log("UPLOADTAGS:period of time from session stop: " + (currentTime - sessionObj.stopTime));
	
				//check that 
	            if (sessionObj.startTime == 0 || ( sessionObj.stopTime != 0 && (currentTime - sessionObj.stopTime > arrangeElementsDelayMS) ) )
	            {
	              	console.log("UPLOADTAGS:session: " + sessionId + " is not in progress.");
	              	r.status = 0;
	              	r.desc = "session: " + sessionId + " is not in progress";
	              	res.json(r);
	              	// nativeDB.close(); 
	              	return;           
	            }

				//check that the uploader belong to the session
				if (sessionObj.participants.indexOf(email) != -1 || sessionObj.owner == email )
            	{
              		(tags).forEach (function (tag) 
              		{
	                	  tag.email = email;
	                  	tag.rating = { positive : { users : [], value : 0 }, negative : { users : [], value : 0 } };
	                  	console.log("UPLOADTAGS:tag: " + tag);
	                  	tagsToAdd.push(tag);
                	});

              
                db.model('sessions').update( 
          			{ sessionId : sessionId }, 
          			{ $push: { tags: { $each : tagsToAdd } } }, 
              	function(err, obj) 
              		{  
                		//console.log("UPLOADTAGS: save");
                		if (err)
                		{
                      		console.log("UPLOADTAGS:failure session save, the error: ", err);
                      		r.status = 0;
                      		r.desc = "failure session save";
                      		res.json(r);
                      		//nativeDB.close();   
                      		return;           
                  		}
                  		
	                    console.log("UPLOADTAGS:tags from user: " + email + " were uploaded to the session: " + sessionId + " successfully.");
                    	r.status = 1;
	                    r.desc = "tags from user: " + email + " were uploaded to the session: " + sessionId + " successfully.";
	                    res.json(r);
	                   // nativeDB.close(); 
	                    return; 
                	});
            	}
            	else
            	{
	                console.log("UPLOADTAGS:user: " + email + " does not participate in the session: " + sessionId);
	                r.status = 0;
	                r.desc = "user: " + email + " does not participate in the session: " + sessionId;
	                res.json(r);
	                //nativeDB.close(); 
	                return;
              	}
          	}

    	});
  	//}); 
};

/**
 * @inner
 * @memberof session
 * @function uploadImage
 * @desc insert image into session id if recordStarts true
 * @param {json} data - The object with the data
 * @param {string} data.email - name@gmail.com
 * @param {string} data.sessionId - text
 * @param {number} data.timastamp - {0-9}*
 * @returns {json} status: 1/0
 */
exports.uploadImage = function(req, res, next)
{
  	var userip = req.connection.remoteAddress.replace(/\./g , '');
    var uniqueid = new Date().getTime()+userip;
    var sessionId, timestamp, email; 
    var file; //store file information
    var form = new formidable.IncomingForm();
    var r = { };

	//parse the request using formidable module
    form.parse(req, function(error, fields, files) 
    {
      	console.log('UPLOADIMAGE:parse.');
      	
  		//
		if (error) 
      	{
        	console.log("UPLOADIMAGE:error occured wrile receiving an image, error: ", error);
        	r.status = 0;
        	r.desc = "error occured wrile receiving an image";
        	res.json(r);
        	return;
      	}
      	
        //TODO. REMOVE - print file information 
        console.log("UPLOADIMAGE:files:", JSON.stringify(files));
        console.log("UPLOADIMAGE:fields:", JSON.stringify(fields));
        
        sessionId = fields.sessionId;
        timestamp = fields.timestamp;
        email = fields.email;
		file = files.file; 
  	});
  
  	/* TODO. REMOVE - writen only for debug
    form.on('progress', function(bytesReceived, bytesExpected) 
    {
      var percent_complete = (bytesReceived / bytesExpected) * 100;
      console.log(percent_complete.toFixed(2));
    });
	*/
	
	form.on('error', function(err) 
    {
      	console.log("UPLOADIMAGE:error." + err);
      	console.error(err);
      	
  		//
		if (err) 
      	{
        	console.log("UPLOADIMAGE:error occured wrile receiving an image, error: ", err);
        	r.status = 0;
        	r.desc = "error occured wrile receiving an image";
        	res.json(r);
        	return;
      	}
    });
  
  	form.on('end', function(error, fields, files) 
    {
    	//var r = { };
    	var imageToAdd = { };
      	console.log('UPLOADIMAGE:end.');
      
      	//temporary location of the uploaded file 
      	var temp_path = this.openedFiles[0].path;
      	console.log("UPLOADIMAGE:uploaded file temp path: " + temp_path);

      	//file name of the uploaded file
      	var file_name = this.openedFiles[0].name;
      	console.log("UPLOADIMAGE: uploaded file name: " + file_name);

      	var stream = cloudinary.uploader.upload_stream(function(result) 
		{ 
          	//connect to the database
      		MongoClient.connect(config.mongoUrl, {native_parser : true}, function(err, nativeDB) 
          	{
              	//check if mongodb connection failed return error message and exit
        		if (err) 
              	{
                	console.log("UPLOADIMAGE:connection error ",err);
                	r.status = 0;
                	r.desc = "err db";
                	res.json(r);
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
              			console.log("UPLOADIMAGE:failure during session search, the error: ", err);
              			r.status = 0;
              			r.desc = "failure during session search.";
              			res.json(r);
              			nativeDB.close(); 
              			return;
        			}

					//check that the session was found
              		if ( !sessionObj )
              		{
                		console.log("UPLOADIMAGE:session: " + sessionId + " was not found.");
                		r.status = 0;
                		r.desc = "session: " + sessionId + " was not found.";
                		res.json(r);
                		nativeDB.close();
                		return;
            		}
            		else                // if the session exists, update
                	{              		
						//check that the uploader belong to the session
						if (sessionObj.participants.indexOf(email) == -1 && sessionObj.owner != email )
            			{
	                		console.log("UPLOADIMAGE:user: " + email + " does not belong to the session: "+ sessionId);
	                		r.status = 0;
	                		r.desc = "user: " + email + " does not belong to the session: "+ sessionId;
	                		res.json(r);
	                		nativeDB.close();
	                		return;
            			}
            			
	                	imageToAdd.email = email;
	                	imageToAdd.timestamp = timestamp;
	                	imageToAdd.url = result.url;
	                  	console.log("UPLOADIMAGE:image: " + imageToAdd);
              
                    	//insert new image to sessions collection 
                   		collection.update( 
                   		{ sessionId : sessionId }, 
                    	{ $push: { images: imageToAdd } },
                    	//{ upsert : true, safe : true, fsync : true}, 
                    	function( err, result ) 
                    	{ 
                  			if (err)
                  			{
                        		console.log("UPLOADIMAGE:failure occured while saving the session, the error: ", err);
		                        r.status = 0;
		                        r.desc = "failure occured while saving the session.";
		                        res.json(r);
		                        nativeDB.close();   
		                        return;           
                    		}
                    
	                        console.log("UPLOADIMAGE:list of images was updated.");
	                        r.status = 1 ;
	                        r.desc = "list of images was updated.";
	                        nativeDB.close();
	                        res.json(r);
                    	});
                  	}
              	});
      		});
    	},
    	{
			public_id : uniqueid, 
	        crop : 'limit',
	        width : 640,
	        height : 360, 
	        tags : [sessionId, 'lecturus']
		});
        
    	var file_reader = fs.createReadStream(temp_path).pipe(stream);
  	});
};


/**
 * @inner
 * @memberof session
 * @function uploadAudio
 * @desc insert audio into session id if recordStarts true
 * @param {json} data - The object with the data
 * @param {string} data.email - name@gmail.com
 * @param {string} data.sessionId - text
 * @param {number} data.timastamp - {0-9}*
 * @returns {json} status: 1/0
 */
exports.uploadAudio = function(req, res, next)
{
  	var userip = req.connection.remoteAddress.replace(/\./g , '');
  	var uniqueid = new Date().getTime()+userip;
  	var sessionId;
  	var timestamp, email, file, audioLength;
  	console.log('-->UPLOAD AUDIO<--');
  	var form = new formidable.IncomingForm();

  	form.parse(req, function(error, fields, files) 
  	{
    	console.log('-->PARSE<--');
      
      	//logs the file information 
      	console.log("files", JSON.stringify(files));
      	console.log("fields", JSON.stringify(fields));
      	sessionId= fields.sessionId;
      	timestamp = fields.timestamp;
      	email = fields.email;
      	audioLength = parseInt(fields.audioLength, 10);
  	});

  	/*TODO. REMOVE - only for debug purpose
  	form.on('progress', function(bytesReceived, bytesExpected) 
    {
      	var percent_complete = (bytesReceived / bytesExpected) * 100;
      	console.log(percent_complete.toFixed(2));
    });
	*/
	
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
          console.log(result);  //TODO. Remove
          var r={};
      
          MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, dataBase) 
          {

            // if mongodb connection failed return error message and exit
            if (err) 
            {
                console.log("connection error ",err);
                r.status=0;
                r.desc="err db";
                res.json(r);
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
                        res.json(r);
                    });
                  }
                else 
                { // if the session does not exist return status 0
                    console.log("session not exist",sessionId);
                    r.status = 0;
                    r.desc="session not exist";
                    dataBase.close();
                    res.json(r);
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
                res.json(r);
                return;
            }
        });
  //var file_reader = fs.createReadStream(t._currentOutput.target).pipe(stream);
  //var file_reader = fs.createReadStream(temp_path).pipe(stream);
    });
};
