/*
get session id to know the relevant directory
*/
router.get("/session/mergeAudios/:sessionId?", function(req, res) {
  fldname = _public+req.query.sessionId;
  var mergedRecName=req.query.sessionId+'.mp3';
  files = fs.readdirSync(fldname),
  dhh = fs.createWriteStream(fldname+'/'+mergedRecName);
  // fs.renameSync(currentname, newname);

  // create an array with filenames (time)
  files.forEach(function (file) {
      if (file.indexOf(".mp3")!= -1 && file.indexOf(mergedRecName) == -1){
        clips.push(file.substring(0, file.length-4));  
     }
  });

  // Sort
  clips.sort(function (a, b) {
      return a - b;
  });

  merge();

  res.send(JSON.stringify({"status":1,"desc":"success"}))
});

// recursive function
function merge() {
    if (!clips.length) {
        dhh.end("Done");
        return;
    }
    currentfile = fldname +"/"+ clips.shift() + '.mp3';
    stream = fs.createReadStream(currentfile);
    stream.pipe(dhh, {end: false});
    stream.on("end", function() {
        console.log(currentfile + ' appended');
        merge();        
    });
    stream.on("error", function() {
        console.log('error while merging');
    });
}








/*
get image by session id
return audio file or status 0 (fail)
*/
router.get('/session/getImage/:sessionId?:imageId?', function (req, res) {
  var fldname = _public+req.query.sessionId;
  var iid = "/"+req.query.imageId;
  try{
    var headerOptions = {
      'Content-Type': 'image/jpg'
    }
    res.writeHead(200, headerOptions);
    res.end(fs.readFileSync(fldname+iid), 'binary');
   
   
  }catch(err){
    res.send(JSON.stringify({"status":0,"desc":"fail"})); 
  }
});

/*
get session id and audio file
return audio file of status 0 (fail)
*/
router.get('/session/getAudio/:sessionId?:videoId?', function (req, res) {
  var fldname = _public+req.query.sessionId;
  var vid = "/"+req.query.videoId;
  try{
    var stat = fs.statSync(fldname+vid);
    //https://groups.google.com/forum/#!topic/nodejs/gzng3IJcBX8
    var headerOptions = {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
      'Content-Range': "bytes " + 0 + "-" + stat.size + "/" + stat.size, 
      "Accept-Ranges": "bytes"
    }
    
    res.writeHead(200, headerOptions );
    
   var options = { 
      flags: 'r',
      encoding: null,
      fd: null,
      mode: 0666,
      bufferSize: 64*1024,
      start: 0, 
      end: stat.size
    }
    var readStream = fs.createReadStream(fldname+vid, options);

    var temp=[];
    
    readStream.on('open', function () {
      readStream.pipe(res,'binary');
    });

    readStream.on('end', function() {
       res.end();
    });

    readStream.on('error', function(err) {
      res.end({"status":0,"desc":"failed while transfering"});
    });

  }catch(err){
    res.send(JSON.stringify({"status":0,"desc":"fail"}));
  }
});

var files, clips = [], stream, currentfile, dhh;
var _public='./';

/* // receive all related data 
  cloudinary.api.resources_by_tag("1426236025252127001", function(result){
    console.log(result)
  });
  cloudinary.api.resources_by_tag("1426236025252127001",
    function(result){
      console.log(result)
  }, { resource_type: 'raw' });
  */

  function CreateSessionDirectory(dirName){
  //check if directory exist else create
  if (fs.existsSync(dirName)) {
  }
  else fs.mkdirSync(dirName);
}



function lecturusCallback (obj){
  //return 'lecturusCallback('+obj+');';
  return obj;
}

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