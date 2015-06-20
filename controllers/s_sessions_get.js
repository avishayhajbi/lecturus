var fs = require("fs-extra");
var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var formidable = require('formidable');
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
});

/** @namespace session */

/**
 * @inner
 * @memberof session
 * @function createSession
 * @desc create a new session
 * @param {string} email - name@gmail.com
 * @param {string} org - shenkar
 * @param {string} name - text
 * @param {string} description - text
 * @param {string} lecturer - text
 * @param {number} degree - {0-9}*
 * @param {number} course - {0-9}*
 * @returns {json} status: 1/0, 
 * sessionId: new created session id,
 * timestamp: session creation time at the server
 */
exports.createSession = function(req, res, next)
{
    // create timestamp and uniqeid
    var date = new Date().getTime();
    var userip = req.connection.remoteAddress.replace(/\./g , '');
    var uniqueid = date + userip;
    var r = { };

    //try to parse the received data
    try
    {
        var data = req.body;
    }
    catch( err )
    {
        logger.error("getUserFavorites:failure occurred while parsing the request, the error is:", err);
        r.status = 0;
        r.desc = "failure occurred while parsing the request.";
        res.json(r);
        return;
    }

    //check that all needed properties were received in the request
    if ( !data.email || data.email == "" || !data.org || data.org == "" )
    {
        r.status = 0;
        r.desc = "request must contain a property email";
        res.json(r);
        return;
    }

    //search for the user document in the users collection
    db.model('users').find(
    { email : data.email },
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
    else
    {
      data.sessionId = uniqueid;
      data.owner = data.email;
      data.timestamp = date;
      
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
 };

/**
 * @inner
 * @memberof session
 * @function getUserSessions
 * @desc This function will find all the 'session' documents in the 'sessions' collection by user id (email).
 * This function searches for user id both in 'session' document's 'owner' and 'participants' properties.
 * @param {string} email - name@gmail.com
 * @param {number} from - {0-9}*
 * @param {number} to - {0-9}*
 * @returns {json} status: 1/0, 
 * userRecordings: the result, 
 * length: userRecordings length
 */
exports.getUserSessions = function(req,res,next)
{
    var userId, r= { };

   try
   {
        // try to parse the json data
        data = req.body;
        userId = req.body.email;
        data.from = parseInt(req.body.from) || 0;
        data.to = parseInt(req.body.to) || 8;
      }
      catch(err)
      {
        console.log("failure while parsing the request, the error:", err);
        r.status = 0;
        r.desc = "failure while parsing the request";
        res.json(r);
        return;
      }

  if ( userId && userId != "" ) // if data.email property exists in the request is not empty
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
        createUsersJson(docs, function(result)
        {           
            r.users = result;
            console.log("sessions with user: " + userId + " participation: " + docs);
            r.length = docs.length;
            r.status = 1;
            r.userRecordings = docs;
            r.desc = "sessions with user: " + userId + " participation.";
            res.json(r);  
        });
                            
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
}

/**
 * @inner
 * @memberof session
 * @function addMembers
 * @desc This function will send GCM sessages to each user that the function received in the request.
 * @param {string} email - name@gmail.com
 * @param {string} sessionId - text
 * @param {array} participants - [emails]
 * @returns {json} status: 1/0
 */
exports.addMembers = function(req,res,next)
{
    //create new empty variables
    var timestamp = new Date().getTime(); //create timestamp
    var newParticipants, sessionOnwer, sessionId;
    var r = { };  //response object
    var message = new gcm.Message();  //create new gcm message
    var sender = new gcm.Sender('AIzaSyAjgyOeoxz6TC8vXLydERm47ZSIy6tO_6I'); //create new gcm object
  
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

    if (  typeof sessionId === 'undefined' || sessionId == null || sessionId == "" )  // if data.sessionId property exists in the request is not empty
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
        
      // if the session do not exist
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
            message.addData('message', 'join session');
            message.addData('status', '1');
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
                  logger.error("ADDMEMBERS:error is: " + err);
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
};

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

/**
 * @inner
 * @memberof session
 * @function updateViews
 * @desc This function will update session views counter. The session must be completed.
 * @param {json} data - The object with the data
 * @param {string} data.userId - name@gmail.com
 * @param {string} data.sessionId - text
 * @returns {json} status: 1/0
 */
exports.updateViews = function(req,res,next)
{
    var r = { };
    var sessionId, userId;

    //try to parse the received data
    try
    {
        sessionId = req.body.sessionId;
        userId = req.body.userId;
    }
    catch( err )
    {
        logger.error("updateViews: failure while parsing the request, the error:" + err);
        r.status = 0;
        r.desc = "failure while parsing the request";
        res.json(r);
        return;
    }

    //check that all needed properties were received in the request
    if ( typeof sessionId === 'undefined' || sessionId == null || sessionId == "" ||
       typeof userId === 'undefined' || userId == null || userId == "" )
    {
        logger.error("updateViews:request must contain sessionId and userId properties.");
        r.status = 0;
        r.desc = "request must contain sessionId and userId properties.";
        res.json(r);
        return;
    }

    //search for the session document in the sessions collection and update it's views
     db.model('sessions').findOne(
         { $and : [
             { sessionId : sessionId },
             { stopTime : { $gt : 0 } } ]
         },
        //{ participants : true, owner : true, _id : false }, - does not work with this
        function (err, result)
        {
            //check if failure occurred during the search
            if (err)
            {
                logger.error("updateViews:failure during session search, the error: ", err);
                r.status = 0;
                r.desc = "failure during session search";
                res.json(r);
                return;
            }

            //check if the session exists in the database
            if ( !result )
            {
                logger.error("updateViews:session: " + sessionId + " was not found.");
                r.status = 0;
                r.desc = "session: " + sessionId + " was not found";
                res.json(r);
                return;
            }
            else
            {
                //increase sessions views
                ++result.views;

                //save the update
                result.save(function(err, obj)
                {
                    console.log("updateViews: save");
                    if (err)
                    {
                        logger.error("updateViews:failure occurred during session save, the error: ", err);
                        r.status = 0;
                        r.desc = "failure occurred during session save.";
                        res.json(r);
                        return;
                    }

                    logger.error("updateViews:session: " + sessionId + " views counter was updated.");
                    r.desc = "session: " + sessionId + " views counter was updated.";
                });
                     
                db.model('users').findOne( { email : userId },
                    function (err, userResult)
                    {
                        //check if failure occurred during the search
                        if (err)
                        {
                            logger.error("updateViews:failure during the search, the error: ", err);
                            r.status = 0;
                            r.desc = "failure during the search.";
                            res.json(r);
                            return;
                        }

                        //check if the session exists in the database
                        if ( !userResult )
                        {
                            logger.error("updateViews:user: " + userId + " was not found.");
                            r.status = 0;
                            r.desc = "user: " + userId + " was not found";
                            res.json(r);
                            return;
                        }
                        else
                        {
                            //check if the session were already viewed by user
                            alreadyViewed = userResult.lastViews.indexOf(sessionId);

                            //if the session were already viewed by user, remove the session from user last views array
                            if (alreadyViewed != -1)
                            {
                                userResult.lastViews.splice(index,1);
                            }

                            //add the session to user last views array
                            userResult.lastViews.unshift(sessionId);

                            //save the update in users collection
                            userResult.save(function(err, obj)
                            {
                                if (err)
                                {
                                    logger.error("updateViews:failure occurred during user save, the error: ", err);
                                    r.status = 0;
                                    r.desc = "failure occurred during user save.";
                                    res.json(r);
                                    return;
                                }

                                logger.info("updateViews:session: " + sessionId + " views counter was updated.");
                                r.status = 1;
                                r.desc = r.desc + ". session: " + sessionId + " views counter was updated";
                                res.json(r);
                                return;

                            });
                        }
               });
            }
        });
}

/**
 * @inner
 * @memberof session
 * @function getSessionById
 * @desc This function will find 'session' document in the 'sessions' collection, accordint to the sessionId received in the request. 
 *  This function will increase session view counter only if edit property, received in the request, is true.
 * @param {string} userId - name@gmail.com
 * @param {string} sessionId - text
 * @param {string} org - shenkar
 * @param {boolean} edit - true/false
 * @returns {json} status: 1/0, 
 * info: the session data
 */
exports.getSessionById = function(req,res,next)
{
    //create new empty variables
    var r = { };
    var sessionId, org, userId,edit;

    //try to parse the received data
    try
    {
        sessionId = req.body.sessionId;
        org = req.body.org;
        userId = req.body.userId;               //TODO handel get video only if the user from the same org
        edit = req.body.edit || "false";      //TODO handel plus minus views counter
    }
    catch(err)
    {
        logger.error("getSessionById:failure occurred while parsing the request, the error is:", err);
        r.status = 0;
        r.desc = "failure occurred while parsing the request.";
        res.json(r);
        return;
    }

    //search for the session document in the sessions collection
    db.model('sessions').findOne(
        { $and : [
            { sessionId : sessionId },
            { stopTime : { $gt: 0  } },
            { org : org } ] },
        { _id : false },
        { _id : false }).lean().exec(function( err, doc )
    {

        //check if failure occurred during the search
        if (err)
        {
            logger.error("getSessionById:failure occurred while searching for the sessions, the error: ", err);
            r.status = 0;
            r.desc = "failure occurred while searching for the sessions.";
            res.json(r);
            return;
        }
        else if (doc)
        {
            if (edit == "true")
            {
                logger.info("getSessionById:the session: " + sessionId + " was found.");
                r.status = 1;
                r.info = doc;
                r.desc = "the session: " + sessionId + " was found.";
                res.json(r);
                return;
            }

            getUsersData(doc, userId, function(result)
            {
                doc.users = result;
                logger.info("getSessionById:the session: " + sessionId + " was found.");
                r.status = 1;
                r.info = doc;
                r.desc = "the session: " + sessionId + " was found.";
                res.json(r);
                return;
            });
        }
        else
        {
            logger.error("getSessionById:the session: " + sessionId + " was not found.");
            r.status = 0;
            r.info = [];
            r.desc = "the session: " + sessionId + " was not found.";
            res.json(r); 
            return;  
        }
    });
}

/*
 *
 */
createUsersJson = function(docs, callback)
{
    var usersList = [];

    docs.forEach(function(doc)
    {
        usersList.push(doc.owner);
        usersList.push(doc.participants.filter( function(v)
        {
            return v;
        }));
    });

    var merged = [ ];
    var merged = merged.concat.apply(merged, usersList);
    var uniqueArray = merged.filter(function(item, pos)
    {
        return merged.indexOf(item) == pos;
    });

    //console.log(uniqueArray);

    db.model('users').find(
        { email : { $in : uniqueArray } },
        { _id : false, name : true, lastName : true, image : true, email : true},
        function (err, result)
        {
            // failure during user search
            if (err)
            {
                callback(0);
            }
            else
            {
                var users = { };
                for (var val in result)
                {
                    users[result[val].email] = {
                    name : result[val].name,
                          lastName : result[val].lastName,
                          image : result[val].image,
                          email : result[val].email
                      };
                }

                callback(users);
            }
        });
}

getUsersData = function (doc, userid, callback) {
    var tmpEmails = [userid];
    tmpEmails.push(doc.participants.map(function(email) 
    {
        return email;
    }));
    
    if (doc.elements)
    for (var elem in doc.elements)
    {
        if (doc.elements[elem].hasOwnProperty('tags'))
          tmpEmails.push(doc.elements[elem]['tags'].map(function(tag) 
          {
        tag.rating.positive.users =  (tag.rating.positive.users.indexOf(userid)!= -1)?true:false;
              tag.rating.negative.users =  (tag.rating.negative.users.indexOf(userid)!= -1)?true:false;
              return tag.email;
          }));
    }
    
    var merged = [ ];
    var merged = merged.concat.apply(merged, tmpEmails);
    var uniqueArray = merged.filter(function(item, pos) 
    {
        return merged.indexOf(item) == pos;
    });

    db.model('users').find( { email : { $in : uniqueArray } },
    { _id : false, name : true, lastName : true, image : true, email : true, follow : true, favorites : true },
    function (err, result)
    {
        // failure during user search
        if (err) 
        {
            callback(0);    
        }
        else
        {
            var users = { };
            for (var val in result)
            {   
                if (result[val].email == userid)
                {
                    doc.follow = (result[val].follow.indexOf(doc.owner)!= -1)?true:false;
                    doc.favorite = (result[val].favorites.indexOf(doc.sessionId)!= -1)?true:false;
                    doc.rating.positive.users =  (doc.rating.positive.users.indexOf(userid)!= -1)?true:false;
                    doc.rating.negative.users =  (doc.rating.negative.users.indexOf(userid)!= -1)?true:false; 
                }
                users[result[val].email] = {
                    name : result[val].name,
                    lastName : result[val].lastName,
                    image : result[val].image,
                    email : result[val].email
                };
            }

            callback(users);
        }   
    });   
}

/**
 * @inner
 * @memberof session
 * @function getAllVideos
 * @desc This function will find 'user' document in the 'users' collection, accordint to the email received in the request. 
 *  This function will return all sessions by the user organization. 
 * @param {json} data - The object with the data
 * @param {string} data.email - name@gmail.com
 * @param {number} data.from - {0-9}*
 * @param {number} data.to - {0-9}*
 * @returns {json} status: 1/0, 
 * res: the result, 
 * length: the result length
 */
exports.getAllVideos = function(req,res,next)
{
    var r = {};
    var data = {};

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
}

/**
 * @inner
 * @memberof session
 * @function getMembers
 * @desc This function will find the 'session' document in the 'sessions' collection by sessionId that will be received in the request.
 *  This function will extract all the emails from 'participants' property in the 'session' document.
 * @param {json} data - The object with the data
 * @param {string} data.email - name@gmail.com
 * @param {string} data.sessionId - text
 * @returns {json} status: 1/0, 
 * participants: [those users agreed to participate in the current session], 
 */

exports.getMembers = function(req,res,next){
  //create new empty variables
  var participants = Array();
  var participantsEmails = Array();
  var r = { };  //response object 

  try
 {
        // try to parse the json data
        data = req.body;

        if ( data.sessionId && data.sessionId != "" ) // if data.sessionId property exists in the request is not empty
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
            db.close();   /* TODO REMOVE */
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
}
