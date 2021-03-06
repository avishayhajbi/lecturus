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
 * @param {string} email - name@gmail.com
 * @param {string} sessionId - text
 * @param {array} tags - [{timestamp: number , text: text}]
 * @returns {json} status: 1/0
 */
exports.uploadTags = function(req, res, next)
{
	//create new empty variables
  	var sessionId, email, tags;
  	var r = { };				//response variable
  	var tagsToAdd = [ ];

	//save the current time
	var currentTime = new Date().getTime();

  	//try to parse the received data
    try
    {
		sessionId = req.body.sessionId;
		tags = req.body.tags;
		email = req.body.email;
    }  
	catch( err )
	{
		logger.error("uploadTags:failure occurred while parsing the request, the error:" + err);
		r.status = 0;
		r.desc = "failure occurred while parsing the request.";
		res.json(r);
		return;
  	}

	logger.debug("session id: " + sessionId);
	logger.debug("user email: " + email);
	logger.debug("session tags: " + tags);

	//check that all needed properties were received in the request
    if (    typeof sessionId === 'undefined' || sessionId == null || sessionId == "" ||
      		typeof tags === 'undefined' || tags == null || tags == "" ||    //TODO. check that array is not empty
      		typeof email === 'undefined' || email == null || email == ""  )
  	{
		logger.error("uploadTags:request must contain sessionId, email and tags: [] properties.");
      	r.status = 0; 
        r.desc = "request must contain sessionId, email and tags: [] properties.";
        res.json(r); 
        return;
	}

	//TODO do all the insert in a one query

	//search for the session document in the sessions collection
	db.model('sessions').findOne(
	{ sessionId : sessionId },
	function(err, sessionObj)
	{
		//check if error occurred during the search
		if (err)
		{
			logger.error("uploadTags:failure occurred during the search, the error: ", err);
			r.status = 0;
			r.desc = "failure occurred during the search.";
			res.json(r);
			return;
		}
        
		//check that the session was found
		if ( !sessionObj )
		{
			logger.error("uploadTags:session: " + sessionId + " was not found.");
			r.status = 0;
			r.desc = "session: " + sessionId + " was not found";
			res.json(r);
			return;
		}
		else
		{
			logger.debug("uploadTags:delay: " + arrangeElementsDelayMS);
			logger.debug("uploadTags:current time: " + currentTime);
			logger.debug("uploadTags:session stop time: " + sessionObj.stopTime);
			logger.debug("uploadTags:period of time from session stop: " + (currentTime - sessionObj.stopTime));
	
			//check that the session is still in progress
			if (sessionObj.startTime == 0 || ( sessionObj.stopTime != 0 && (currentTime - sessionObj.stopTime > arrangeElementsDelayMS) ) )
			{
				logger.error("uploadTags:session: " + sessionId + " is not in progress.");
				r.status = 0;
				r.desc = "session: " + sessionId + " is not in progress";
				res.json(r);
				return;
			}

			//check that the uploader belongs to the session
			if (sessionObj.participants.indexOf(email) != -1 || sessionObj.owner == email )
			{
				//create an object that suits the structure for each tag received in the request
				(tags).forEach (function (tag)
				{
					//associate the tag with the uploader
					tag.email = email;
					//set rating properties
					tag.rating = { positive : { users : [], value : 0 }, negative : { users : [], value : 0 } };
					//add new created tag to the temporary list
					tagsToAdd.push(tag);
				});

              	//update the session document
                db.model('sessions').update(
				{ sessionId : sessionId },
          		{ $push: { tags: { $each : tagsToAdd } } },
              	function(err, obj) 
				{
					logger.debug("uploadTags:entered save part.");
					//check if failure occurred during the save
					if (err)
					{
						logger.error("uploadTags:failure occurred during the save, the error: ", err);
						r.status = 0;
						r.desc = "failure occurred during the save.";
						res.json(r);
						return;
					}
                  	
     				// if (obj.stopTime != 0)
					// {
					// 	logger.info("uploadTags:session: " + sessionId + " is closed.");
					// 	r.status = 2;
					// 	r.desc = "session: " + sessionId + " is closed";
					// 	res.json(r);
					// 	return;
					// }

					logger.info("uploadTags:tags from user: " + email + " were uploaded to the session: " + sessionId + " successfully.");
					r.status = 1;
					r.desc = "tags from user: " + email + " were uploaded to the session: " + sessionId + " successfully.";
					res.json(r);
					return;
				});
			}
			else
			{
				logger.error("uploadTags:user: " + email + " does not participate in the session: " + sessionId);
				r.status = 0;
				r.desc = "user: " + email + " does not participate in the session: " + sessionId;
				res.json(r);
				return;
			}
		}
	});
};

/**
 * @inner
 * @memberof session
 * @function uploadImage
 * @desc insert image into session id if recordStarts true
 * @param {string} email - name@gmail.com
 * @param {string} sessionId - text
 * @param {number} timastamp - {0-9}*
 * @returns {json} status: 1/0
 */
exports.uploadImage = function(req, res, next)
{
	//create new empty variables
    var sessionId, timestamp, email; //store file information
    var currentTime = new Date().getTime();
    var file; 									
    var r = { };

	//save user ip
	var userip = req.connection.remoteAddress.replace(/\./g , '');

	//create unique id for the image
	var uniqueid = new Date().getTime() + userip;

	//create new incoming form object
	var form = new formidable.IncomingForm();

	//parse the request using formidable module
    form.parse(req, function(error, fields, files) 
    {
      	logger.info("uploadImage:enter parse function.");
      	
  		//check if error occurred during the parse
		if (error) 
      	{
        	logger.error("uploadImage:error occurred while receiving an image, the error is: " + error);
        	r.status = 0;
        	r.desc = "error occurred while receiving an image.";
        	res.json(r);
        	return;
      	}

        logger.debug("uploadImage:files:", JSON.stringify(files));
		logger.debug("uploadImage:fields:", JSON.stringify(fields));

		//save the data received in the request
        sessionId = fields.sessionId;
        timestamp = fields.timestamp;
        email = fields.email;
		file = files.file; 
  	});
  
  	/* TODO. REMOVE - written only for debug purpose
    form.on('progress', function(bytesReceived, bytesExpected) 
    {
      var percent_complete = (bytesReceived / bytesExpected) * 100;
      console.log(percent_complete.toFixed(2));
    });
	*/

	//check for errors during the transmission
	form.on('error', function(err) 
    {
      	logger.error("uploadImage:error occurred during the transmission of an image, the error is: " + err);
		r.status = 0;
		r.desc = "error occurred during the transmission of an image.";
		res.json(r);
		return;
    });

	//check for the end of the transmission
  	form.on('end', function(error, fields, files) 
    {
		logger.info("uploadImage:enter end function.");

		//create new empty variable
    	var imageToAdd = { };
      
      	//save the temporary location of the uploaded image file
      	var temp_path = this.openedFiles[0].path;
		logger.debug("uploadImage:uploaded file temp path: " + temp_path);

      	//save the file name of the uploaded image file
      	var file_name = this.openedFiles[0].name;
		logger.debug("uploadImage: uploaded file name: " + file_name);

      	var stream = cloudinary.uploader.upload_stream(function(result) 
		{

			//search for the session document in the sessions collection
			db.model('sessions').findOne(
			{ sessionId : sessionId },
			function (err, sessionObj)
			{
				//check if an error occurred during the search
				if (err)
				{
					logger.error("uploadImage:failure occurred during the search, the error: ", err);
					r.status = 0;
					r.desc = "failure occurred during the search.";
					res.json(r);
					return;
				}

				//check that the session was found
				if ( !sessionObj )
				{
					logger.error("uploadImage:session: " + sessionId + " was not found.");
					r.status = 0;
					r.desc = "session: " + sessionId + " was not found.";
					res.json(r);
					return;
				}
				else                // if the session exists, update
				{
					//check that the uploader belongs to the session
					if (sessionObj.participants.indexOf(email) == -1 && sessionObj.owner != email )
					{
						logger.error("uploadImage:user: " + email + " does not belong to the session: " + sessionId);
						r.status = 0;
						r.desc = "user: " + email + " does not belong to the session: " + sessionId;
						res.json(r);
						return;
					}

					//update the image object so it would fit to the scheme
					imageToAdd.email = email;
					imageToAdd.timestamp = timestamp;
					imageToAdd.url = result.url;
					logger.debug("uploadImage:new image object is: " + imageToAdd);
              
                    //update the session document - insert new image object to sessions collection
					db.model('sessions').update(
					{ sessionId : sessionId },
					{ $push : { images : imageToAdd } },
					function( err, result )
					{
						//check if an error occurred during the save
						if (err)
						{
							logger.error("uploadImage:failure occurred while saving the session, the error: ", err);
							r.status = 0;
							r.desc = "failure occurred while saving the session.";
							res.json(r);
							return;
						}

						// if (result.stopTime != 0)
						// {
						// 	logger.info("uploadImage:session: " + sessionId + " is closed.");
						// 	r.status = 2;
						// 	r.desc = "session: " + sessionId + " is not closed";
						// 	res.json(r);
						// 	return;
						// }

						logger.info("uploadImage:list of images was updated.");
						r.status = 1 ;
						r.desc = "list of images was updated.";
						res.json(r);
						return;	
					});
				}
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
 * @param {string} email - name@gmail.com
 * @param {string} sessionId - text
 * @param {number} timastamp - {0-9}*
 * @returns {json} status: 1/0
 */
exports.uploadAudio = function(req, res, next)
{
	logger.info("uploadAudio:enter the main function.");

	//create new empty variables
  	var sessionId;
  	var timestamp, email, file, audioLength;
	var r = { };

	//create new incoming form object
  	var form = new formidable.IncomingForm();

	//save user ip
	var userip = req.connection.remoteAddress.replace(/\./g , '');

	//create unique id for the audio
	var uniqueid = new Date().getTime() + userip;

  	form.parse(req, function(error, fields, files) 
  	{
		logger.info("uploadAudio:enter parse function.");
      
      	logger.debug("files", JSON.stringify(files));
		logger.debug("fields", JSON.stringify(fields));

		//save the data received in the request
      	sessionId = fields.sessionId;
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
		logger.error("uploadAudio:error occurred during the transmission of an audio, the error is: " + err);
		r.status = 0;
		r.desc = "error occurred during the transmission of an audio.";
		res.json(r);
		return;
  	});

    form.on('end', function(error, fields, files) 
    {
		logger.info("uploadAudio:enter end function.");

		//create new empty variable
		var audioToAdd = { };

      	//save the temporary location of the uploaded audio file
      	var temp_path = this.openedFiles[0].path;
     	logger.debug("uploadAudio:uploaded file temp path: " + temp_path);

      	//save the file name of the uploaded audio file
     	var file_name = this.openedFiles[0].name;
		logger.debug("uploadAudio:uploaded file name: " + file_name);

      	var stream = cloudinary.uploader.upload_stream(function(result)
      	{
			//search for the session document in the sessions collection
			db.model('sessions').findOne(
			{ sessionId : sessionId },
			function (err, sessionObj)
            {
				//check if failure occurred during the search
				if (err)
				{
					logger.error("uploadAudio:failure occurred while searching for the session, the error: ", err);
					r.status = 0;
					r.desc = "failure occurred while searching for the session.";
					res.json(r);
					return;
				}

                //check that the session exists
                if ( !sessionObj )
				{
					logger.error("uploadAudio:session: " + sessionId + " was not found.");
					r.status = 0;
					r.desc = "session: " + sessionId + " was not found.";
					res.json(r);
					return;
				}
				else
				{
					//check that the uploader belongs to the session
					if (sessionObj.participants.indexOf(email) == -1 && sessionObj.owner != email )
					{
						logger.error("uploadAudio:user: " + email + " does not belong to the session: " + sessionId);
						r.status = 0;
						r.desc = "user: " + email + " does not belong to the session: " + sessionId;
						res.json(r);
						return;
					}

					//update the audio object so it would fit to the scheme
					audioToAdd.length = audioLength;
					audioToAdd.timestamp = timestamp;
					audioToAdd.email = email;
					audioToAdd.url = result.url;
					//set the position of the current audio file (0 = beginning of the session)
					audioToAdd.startAt = (sessionObj.audios.length)?sessionObj.audios[sessionObj.audios.length-1].startAt + sessionObj.audios[sessionObj.audios.length-1].length : 0;

					//count session total length (time of the whole record)
					sessionObj.totalSecondLength += audioLength;

					//add new audio to the list of session audios
					sessionObj.audios.push(audioToAdd);

					//update the session document
					// db.model('sessions').update(
					// { sessionId : sessionId },
					// { $set : { audios : sessionObj.audios, totalSecondLength : sessionObj.totalSecondLength } },
					// { upsert : true, safe : true, fsync : true},
					sessionObj.save(function(err, result)
                    {
						//check if an error occurred during the save
						if (err)
						{
							logger.error("uploadAudio:failure occurred while saving the session, the error: ", err);
							r.status = 0;
							r.desc = "failure occurred while saving the session.";
							res.json(r);
							return;
						}

                        logger.info("uploadAudio:list of audios was updated.");
                        r.status = 1;
                        r.desc = "list of audios was updated.";
                        res.json(r);
						return;
                    });
			  	}
			//});
        	});
      	},
      	{
			public_id: uniqueid,
			resource_type: 'raw',
			format: 'mp3',
			//format: 'amr',
			tags: [sessionId, 'lecturus']
        });

		//convert the audio from AMR to MP3 format using FFMPEG library
      	new ffmpeg( { source: temp_path } )
			//calibrate the audio file using FFMPEG library
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
               		logger.error("uploadAudio:converting AMR audio to MP3 has failed, the error is: " +  err);
                	r.status = 0;
                	r.desc = "converting AMR audio to MP3 has failed.";
                	res.json(r);
                	return;
           		}
        	});

    });
};