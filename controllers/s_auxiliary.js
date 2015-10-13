var fs = require("fs-extra");
var gcm = require('node-gcm');

/** 
public methods 
@namespace auxiliary */

/**
 * @inner
 * @memberof auxiliary
 * @function getCoursesByOrg
 * @desc find the related courses to user by the organization
 * @param {string} org - shenkar
 * @returns {json} status: 1/0 , degrees
 */
exports.getCoursesByOrg = function(req, res, next)
{
    //create new empty variables
    var r = { };
    var org;
    
    //try to parse the received data
    try
    {
        logger.debug("getCoursesByOrg:search courses for the organization: " + req.body.org);
        org = req.body.org;    
    }
    catch(err)
    {
        logger.error("pauseSession:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
    } 
    
    //check that all needed properties were received in the request
    if (typeof org === 'undefined' || org == null || org == "")
    {
        logger.error("getCoursesByOrg:request must contain org property.");
      	r.status = 0;
      	r.desc = "request must contain org property.";
      	res.json(r);  
      	return;    	
    }
    else
    {
        db.model('academic_degrees').findOne(
    	{ org : org }, 
    	{ _id : false, academicId : false, org : false },
        function(err, academicDegree) 
        {
        	//check if the error occurred during the search
            if(err) 
            {
                logger.error("getCoursesByOrg:failure during academic degree search, the error: ", err);
                r.status = 0;
                r.desc = "failure during academic degree search";
                res.json(r);
                return;
            }          
            //check if the database contains organization's academic degrees
            else if(academicDegree)
            {
                logger.info("getCoursesByOrg:organization " + org + " academic degrees were found.");
                r.status = 1;
                r.check = academicDegree.check;
                r.degrees = academicDegree.degrees;
                r.desc = "organization: " + org + " academic degrees were found.";
                res.json(r);
                return;
            }
            else 
            {
                logger.error("getCoursesByOrg:organization: " + org + " academic degrees were not found.");
                r.status = 0;
                r.desc = "organization: " + org + " academic degrees were not found.";
                res.json(r);
                return;
            }
        });
    }
};

/**
 * @inner
 * @memberof auxiliary
 * @function checkCoursesChanges
 * @desc check if the version has changed
 * @param {string} org - shenkar
 * @param {number} check - {0-9}*
 * @returns {json} status: 1/0 , degrees
 */
exports.checkCoursesChanges = function(req, res, next)
{
    //create new empty variables
    var r = { };
    var org, check;
   
	//try to parse the received data
	try
	{
        org = req.body.org;
        check = req.body.check || 0;
    }
    catch(err)
    {
      	logger.error("checkCoursesChanges:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
    }

    //check that all needed properties were received in the request
    if (typeof org === 'undefined' || org == null || org == "" ||
        typeof check === 'undefined' || check == null || check == "" )
    {
    	logger.error("checkCoursesChanges:request must contain org and check properties.");
      	r.status = 0;
      	r.desc = "request must contain org and check properties.";
      	res.json(r);  
      	return;    	
    }
    else
	{
 		db.model('academic_degrees').findOne(
     	{ org : org }, 
     	{ _id : false, academicId : false, org : false },
     	function (err, academicDegreeDoc)
     	{
            //check if failure occurred during the search
            if (err)
            {
                logger.error("checkCoursesChanges:failure occurred during the search, the error: ", err);
                r.status = 0;
                r.desc = "failure occurred during the search.";
                res.json(r);
                return;
            }
	        
	        if (!academicDegreeDoc)
	        {
                logger.error("checkCoursesChanges:organization: " + org + " academic degrees were not found.");
                r.status = 0;
                r.desc = "organization: " + org + " academic degrees were not found.";
                res.json(r);
                return;
	        }
	        // if the user exist return organization courses
	        else 
	        {
	            if (academicDegreeDoc.check == check)
	            {
                    logger.info("checkCoursesChanges:no changes were made in organization: " + org + " academic degrees.");
	                r.status = 2;
	                r.desc = "no changes were made in organization: " + org + " academic degrees.";
	            }
	            else 
	            {
                    logger.info("checkCoursesChanges:changes were made in organization: " + org + " academic degrees.");
	                r.status = 1;
	                r.check = academicDegreeDoc.check;
	                r.degrees = academicDegreeDoc.degrees;
                    r.desc = "changes were made in organization: " + org + " academic degrees.";
	            }
	            res.json(r);
	            return;
	        }
        });
	}
};

/**
 * @inner
 * @memberof auxiliary
 * @function getSessionsByCourse
 * @desc find related videos by combination between user email degree and course
 * @param {string} email - name@gmail.com
 * @param {number} degree - {0-9}*
 * @param {number} course - {0-9}*
 * @param {number} from - {0-9}*
 * @param {number} to - {0-9}*
 * @returns {json} status: 1/0 , all related videos
 */
exports.getSessionsByCourse = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var email, degreeId, courseId, from, to;

    //try to parse the received data
    try
    {
        email = req.query.email;
        degreeId = parseInt(req.query.degree) || 0;
        courseId = parseInt(req.query.course) || 0;
        from = parseInt(req.query.from) || 0;
        to = parseInt(req.query.to) || 24;
    }
    catch(err)
    {
      	logger.error("pauseSession:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
    }

    //check that all needed properties were received in the request
    if ( typeof email === 'undefined' || email == null || email == "" )
    {
        logger.error("getCoursesByOrg:request must contain email property.");
        r.status = 0;
        r.desc = "request must contain email property.";
        res.json(r);
        return;
    }

	//search for the session document in the sessions collection
    var query = db.model('sessions').find(
    { $and : [
        { degreeId : degreeId || { $exists : true } },
        { courseId : courseId || { $exists : true } },
        { stopTime : { $gt: 0  }} ] },
    sessionPreview);
    query.count(function(err, count)
    {
        query.sort({ timestamp : -1 } ).skip(from).limit(to - from).exec('find', function(err, docs)
        {
            //check if failure occurred during the search
            if (err)
            {
                logger.error("getSessionsByCourse:failure occurred while searching for the sessions, the error: ", err);
                r.status = 0;
                r.desc = "failure while occurred while searching for the sessions.";
                res.json(r);
                return;
            }
            else if (docs)
            {
                createUsersJson(docs, function(result)
                {           
                    r.users = result;
                    r.status = 1;
                    r.length=docs.length;
                    r.count = count;
                    r.res = docs;
                    r.desc = "get videos.";
                    res.json(r); 
                    return;
                });
            }
            else
            {
                r.users = [];
                r.status = 0;
                r.length=0;
                r.count = 0;
                r.res = [];
                r.desc = "get videos.";
                res.json(r); 
                return;
            }
        });         
    });
};

/**
 * @inner
 * @memberof auxiliary
 * @function searchSessions
 * @desc find the related videos by the name and the org
 * @param {string} name - text
 * @param {string} org - shenkar
 * @param {number} from - {0-9}*
 * @param {number} to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */
exports.searchSessions = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var org, name;
    
    //try to parse the received data
    try
    {
        org = req.body.org;
        name = req.body.name;
        from = parseInt(req.body.from) || 0;
        to = parseInt(req.body.to) || 24;
    }
    catch(err)
    {
      	logger.error("searchSessions:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
    }

    //check that all needed properties were received in the request
    if ( typeof org === 'undefined' || org == null || org == "" ||
         typeof name === 'undefined' || name == null || name == "" )
    {
        logger.error("searchSessions:request must contain name and org properties.");
        r.status = 0;
        r.desc = "request must contain name and org properties.";
        res.json(r);
        return;
    }

    var query = db.model('sessions').find(
        { $and : [
            { org : org },
            { stopTime : { $gt: 0 } },
            { $or : [
                { title : { $regex : ".*" + name + ".*"} },
                { description : { $regex : ".*" + name + ".*"} },
                { degree : { $regex : ".*" + name + ".*"} },
                { course : { $regex : ".*" + name + ".*"} }, ]} ]  },
        sessionPreview);
    
    query.count(function(err, count) {
        query.sort({timestamp:-1}).skip(from).limit(to - from).exec('find', function(err, docs)
        {
            //check if failure occurred during the search
            if (err)
            {
                logger.error("searchSessions:failure occurred while searching for the sessions, the error: ", err);
                r.status = 0;
                r.desc = "failure occurred while searching for the sessions.";
                res.json(r);
                return;
            }
            
            else if (docs.length)
            {
                createUsersJson(docs, function(result)
                {           
                    r.users = result;
                    r.status = 1;
                    r.count = count;
                    r.length=docs.length;
                    r.res = docs;
                    r.desc = "get videos.";
                    res.json(r); 
                    return;
                });
                                         
            }
            else
            {
                r.status = 0;
                r.count = 0;
                r.length=0;
                r.res = docs;
                r.desc = "get videos empty.";
                res.json(r); 
                return;
            }
        });         
    });
};

/**
 * @inner
 * @memberof auxiliary
 * @function getTopRated
 * @desc find the related videos by views order
 * @param {string} org - shenkar
 * @param {number} from - {0-9}*
 * @param {number} to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */
exports.getTopRated = function(req, res, next)
{
	//create new empty variables
  	var r = { };
    var org;
    
    //try to parse the received data
    try
    {
        org = req.body.org;
        from = parseInt(req.body.from) || 0;
        to = parseInt(req.body.to) || 24;
    }
    catch(err)
    {
      	logger.error("getTopRated:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
    }

    //check that all needed properties were received in the request
    if ( typeof org === 'undefined' || org == null || org == "" )
    {
        logger.error("getTopRated:request must contain org property.");
        r.status = 0;
        r.desc = "request must contain org property.";
        res.json(r);
        return;
    }

    logger.debug("getTopRated:searching for videos: " + org);

    //TODO.
    db.model('sessions').find(
        { $and : [
            { org : org },
            { stopTime : { $gt : 0 } } ]
        },
        sessionPreview).sort( { views : -1 } ).skip(from).limit(to-from)
        .exec( function(err, docs)
        {
            //check if failure occurred during the search
            if (err)
            {
                logger.error("getTopRated:failure occurred while searching for the sessions, the error: ", err);
                r.status = 0;
                r.desc = "failure occurred while searching for the sessions.";
                res.json(r);
                return;
            }
        
            else if (docs)
            {
                createUsersJson(docs, function(result)
                {
                    r.users = result;
                    r.status = 1;
                    r.length=docs.length;
                    r.res = docs;
                    r.desc = "get videos.";
                    res.json(r);
                    return;
                });
            }
            else
            {
                r.users = [];
                r.status = 0;
                r.length=0;
                r.res = [];
                r.desc = "get videos.";
                res.json(r);
                return; 
            }
    });   
};

/**
 * @inner
 * @memberof auxiliary
 * @function followedUsers
 * @desc find user follow list videos
 * @param {string} email - name@gmail.com
 * @param {number} from - {0-9}*
 * @param {number} to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */
exports.followedUsers = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var email;
    var followed=[];
    
    //try to parse the received data
    try
    {
        email = req.body.email;
        from = parseInt(req.body.from) || 0;
        to = parseInt(req.body.to) || 4;
    }
    catch(err) 
    {
      	logger.error("followedUsers:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
    }

    //check that all needed properties were received in the request
    if ( typeof email === 'undefined' || email == null || email == "" )
    {
        logger.error("followedUsers:request must contain email property.");
        r.status = 0;
        r.desc = "request must contain email property.";
        res.json(r);
        return;
    }


    db.model('users').findOne(
        { email : email },
        { follow : true, org : true, _id : false }
    ).lean().exec(function( err, userObj )
    {
        //check if the error occurred during the search
        if (err)
        {
            logger.error("followedUsers:failure occurred while searching for the user, the error: ", err);
            r.status = 0;
            r.desc = "failure occurred while searching for the user.";
            res.json(r);
            return;
        }

        //check if the user exists in the database
        if ( !userObj )
        {
            logger.error("followedUsers:user: " + email + " was not found.");
            r.status = 0;
            r.desc = "user: " + email + " was not found.";
            res.json(r);
            return;
        }
        else
        {
            //reduce the number of followed users
            followed = userObj.follow.splice(from,(to - from));
            logger.debug("followedUsers:followed user to find", followed);

            //build the search query
            var query = db.model('sessions').find(
                { $and : [
                    { owner : { $in : followed } },
                    { stopTime : { $gt :0 } } ]
                },
                sessionPreview);

            //search for the followed user's sessions
            query.sort( { owner : 1, stopTime : -1 } ).exec(function(err, sessionDocs)
            {
                //check if failure occurred during the search
                if (err)
                {
                    logger.error("followedUsers:failure occurred while searching for the sessions, the error: ", err);
                    r.status = 0;
                    r.desc = "failure occurred while searching for the sessions.";
                    res.json(r);
                    return;
                }

                //check if any session owned by the followed users were found in the database
                if ( !sessionDocs )
                {
                    logger.error("followedUsers:user: " + email + " has no sessions to follow.");
                    r.status = 0;
                    r.desc = "user: " + email + " has no sessions to follow.";
                    res.json(r);
                    return;
                }
                else
                {
                    createUsersJson(sessionDocs, function(result)
                    {   
                        temp = createKeyValJSON(sessionDocs,'owner');
                        r.users = result;
                        r.status = 1;
                        r.length = sessionDocs.length;
                        r.res = temp;
                        r.desc = "get videos.";
                        res.json(r); 
                        return;
                    });
                }
            });
        }
    }); 
};

/**
 * @inner
 * @memberof auxiliary
 * @function getUserSessions
 * @desc find user sessions
 * @param {string} userId - name@gmail.com
 * @param {number} from - {0-9}*
 * @param {number} to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */

exports.getUserSessions = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var userId, from, to;
    
    //try to parse the received data
    try
    {
        userId = req.body.userId;
        from = req.body.from || 0;
        to = req.body.to || 4;
    }
    catch(err)
    {
      	console.log("getUserSessions:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
    }

    //check that all needed properties were received in the request
    if ( typeof userId === 'undefined' || userId == null || userId == "" )
    {
        logger.error("getUserSessions:request must contain userId property.");
        r.status = 0;
        r.desc = "request must contain userId property.";
        res.json(r);
        return;
    }


    db.model('users').findOne(
	{ email : userId },
	{ org : true, _id : false},
    function(err, userObj)
    {
        //check if failure occurred during the search
        if (err)
        {
            logger.error("getUserSessions:failure occurred while searching for the user, the error: ", err);
            r.status = 0;
            r.desc = "failure occurred while searching for the user.";
            res.json(r);
            return;
        }
        
        else if (userObj)
        {
            //build the search query
            var query = db.model('sessions').find(
                { $and : [
                    { $or : [
                        { owner : userId },
                        { participants : userId } ]
                    },
                    { org : userObj.org },
                    { stopTime : { $gt : 0 } } ]
                }, sessionPreview);

            //search
            query.sort( { views : -1 } ).skip(from).limit(to - from)
            .exec(function(err, docs)
            {
                //check if failure occurred during the search
                if (err)
                {
                    logger.error("getUserSessions:failure occurred while searching for the sessions, the error: ", err);
                    r.status = 0;
                    r.desc = "failure occurred while searching for the sessions.";
                    res.json(r);
                    return;
                }
                else if (docs)
                {   
                    createUsersJson(docs, function(result)
                    {           
                        r.users = result;
                        r.status = 1;
                        r.length=docs.length;
                        r.res = docs;
                        r.desc = "get videos.";
                        res.json(r); 
                        return;
                    });                     
                }
                else
               {
                    r.users = [];
                    r.status = 1;
                    r.length=0;
                    r.res = [];
                    r.desc = "get videos.";
                    res.json(r); 
                    return; 
                }
            });
        }
    }); 
};

/**
 * @inner
 * @memberof auxiliary
 * @function getUserFavorites
 * @desc find user favorite list
 * @param {string} userId - name@gmail.com
 * @param {number} from - {0-9}*
 * @param {number} to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */

exports.getUserFavorites = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var favorites = [];
    var to, from, userId;
    
    //try to parse the received data
    try
    {
        userId = req.body.userId;
        from = parseInt(req.body.from) || 0;
        to = parseInt(req.body.to) || 4;
    }
    catch(err)
    {
        logger.error("getUserFavorites:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
    }
    
    //check that all needed properties were received in the request
    if ( typeof userId === 'undefined' || userId == null || userId == "" )
    {
    	logger.error("getUserFavorites:request must contain userId property.");
      	r.status = 0;
      	r.desc = "request must contain userId property.";
      	res.json(r);  
      	return; 
    }

	//search for the user document in the users collection
    db.model('users').findOne(
	{ email : userId }, 
	{ favorites : true, org : true, _id : false},
    function(err, userObj)
    {
        //check if failure occurred during the search
        if (err)
        {
            logger.error("getUserFavorites:failure occurred while searching for the user, the error: ", err);
            r.status = 0;
            r.desc = "failure occurred while searching for the user.";
            res.json(r);
            return;
        }
        
        //check if the user exists in the database
      	if ( !userObj )
        {
            logger.error("pauseSession:user: " + userId + " was not found.");
          	r.status = 0;
          	r.desc = "user: " + userId + " was not found.";
          	res.json(r);
          	return;
      	}
        else
        {
            //check if user has favorite sessions
            if (userObj.favorites.length)
            {
                //reduce the number of session that would be searched
            	favorites = userObj.favorites.splice(from, (to - from));
            }

            //search for user favorite session
            db.model('sessions').find(
        	{ $and : [
                { sessionId : { $in : favorites } },
                { org : userObj.org },
                { stopTime : { $gt : 0 } } ] },
            sessionPreview)
            .skip(from).limit(to - from)
            .exec(function(err, docs)
            {
                //check if failure occurred during the search
                if (err)
                {
                    logger.error("getUserFavorites:failure occurred while searching for the sessions, the error: ", err);
                    r.status = 0;
                    r.desc = "failure occurred while searching for the sessions.";
                    res.json(r);
                    return;
                }
                
                else if (docs.length)
                {
                    createUsersJson(docs, function(result)
                    {           
                        var temp = orderByArray(docs, favorites);
                        r.users = result;
                        r.status = 1;
                        r.length = temp.length;
                        r.res = temp;
                        r.desc = "get videos.";
                        res.json(r); 
                        return;
                    });
                }
                else
                {
                    r.users = [];
                    r.status = 0;
                    r.length = 0;
                    r.res = [];
                    r.desc = "get videos.";
                    res.json(r); 
                    return;
                }
            });                        
        }
    }); 
};

/**
 * @inner
 * @memberof auxiliary
 * @function addRemoveFavorites
 * @desc find user favorite list
 * @param {string} userId - name@gmail.com
 * @param {string} sessionId - text
 * @returns {json} status: 1/0
 */
exports.addRemoveFavorites = function(req, res, next)
{
	//create new empty variables
    var r = { };
	var sessionId, userId;
	
	//try to parse the received data
   	try
   	{
    	sessionId = req.body.sessionId;
    	userId = req.body.userId;
  	}
  	catch(err)
  	{
      	console.log("addRemoveFavorites:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
  	}

  	if ( 	typeof sessionId === 'undefined' || sessionId == null || sessionId == "" ||
       		typeof userId === 'undefined' || userId == null || userId == "" )
  	{
	   	console.log("addRemoveFavorites:request must contain sessionId and userId properties.");
	   	r.status = 0;    
	  	r.desc = "request must contain sessionId and userId properties.";
	   	res.json(r); 
	   	return;
 	}
 	
 	//search for the user document in the users collection
    db.model('users').findOne(
	{ email : userId } ,
    function (err, userObj)
    {
      	//check if failure occurred during the search
      	if (err) 
      	{
	        console.log("addRemoveFavorites:failure occurred during the search, the error: ", err);
	        r.status = 0;
	        r.desc = "failure occurred during the search";
	        res.json(r);    
	        return;
      	}
      	
       	//check if the user exists in the database
      	if ( !userObj )
        {
          	console.log("addRemoveFavorites:user: " + userId + " was not found.");
          	r.status = 0;
          	r.desc = "user: " + userId + " was not found.";
          	res.json(r);
          	return;
      	}
      	
      	//check if the session already viewed by the user
      	if (userObj.favorites.indexOf(sessionId) == -1)	//not viewed case - add
      	{
      		//add the session to the beginning of user favorites array
        	userObj.favorites.unshift(sessionId);
        }	     	
      	else 											//viewed case - remove
      	{
       		//remove the session from user favorites array
       		userObj.favorites.splice(userObj.favorites.indexOf(sessionId), 1);
       	}	
       	
   		//save updated user data
		userObj.save(function(err, obj) 
    	{ 
			//check if error occurred during user save
          	if (err)
          	{
           		logger.error("addRemoveFavorites:failure occurred during user save, the error is: ", err);
           		r.status = 0;
           		r.desc = "failure occurred during user save.";
           		res.json(r); 
           		return;          
         	}

     		logger.info("addRemoveFavorites:user: " + userId + " favorites were updated successfully.");
     		r.status = 1;
     		r.desc = "user: " + userId + " favorites were updated successfully.";
     		res.json(r);
     		return;
   		});		
    });
 };

/**
 * @inner
 * @memberof auxiliary
 * @function lastViews
 * @desc find user last views list
 * @param {string} userId - name@gmail.com
 * @param {number} from - {0-9}*
 * @param {number} to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */

exports.lastViews = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var lastViews = [];
    var from, to, userId;
    
    //try to parse the received data
    try
    {
    	userId = req.body.userId;
        from = parseInt(req.body.from) || 0;
        to = parseInt(req.body.to) || 24;
    }
    catch(err)
    {
      	loggger.error("lastViews:failure occurred while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occurred while parsing the request.";
      	res.json(r);
      	return;
    }
  	
  	//check that all needed properties were received in the request
  	if ( typeof userId === 'undefined' || userId == null || userId == "" )
    {
        loggger.error("lastViews:request must contain userId property.");
        r.status = 0;   
        r.desc = "request must contain userId property.";
        res.json(r); 
        return;
    }

	//search for the user document in the users collection
    db.model('users').findOne(
	{ email : userId }, 
	{ lastViews : true, org : true, _id : false },
    function(err, userObj)
    { 
        //check if failure occurred while searching for the user document
        if (err) 
        {
            loggger.error("lastViews:failure occurred while searching for the user, the error: ", err);
            r.status = 0;
            r.desc = "failure occurred while searching for the user.";
            res.json(r);
            return;
        }
        
        //check if the user exists in the database
        if (userObj)
        {
        	//get only several last viewed session
            lastViews = userObj.lastViews.splice(from, (to - from));
            console.log("number of last viewed sessions: " + lastViews.length);
            
            //search for the details of the last viewed sessions
            db.model('sessions').find(
        	{ $and: [
                { sessionId : { $in : lastViews } },
                { org : userObj.org },
                { stopTime : { $gt : 0 } } ]
			}, sessionPreview)
            .exec(function(err, sessionDocs)
            {
                //check if failure occurred during the search
                if (err)
                {
                    logger.error("lastViews:failure occurred while searching for the sessions, the error: ", err);
                    r.status = 0;
                    r.desc = "failure occurred while searching for the sessions.";
                    res.json(r);
                    return;
                }

                if ( !sessionDocs )  //session was not found case
                {
                    logger.error("lastViews:user: " + userId + " has not last views.");
                    r.status = 0;
                    r.desc = "user: " + userId + " has not last views.";
                    res.json(r);
                    return;
                }
                else
                {
                    createUsersJson(sessionDocs, function(result)
                    {
                        logger.info("lastViews:user: " + userId + " last views were successfully returned.");
                        var orderedLastViews = orderByArray(sessionDocs, lastViews);
                        r.users = result;
                        r.status = 1;
                        r.length = orderedLastViews.length;
                        r.res = orderedLastViews;
                        r.desc = "user: " + userId + " last views were successfully returned.";
                        res.json(r); 
                        return;
                    });
                }
            });                        
        }
    }); 
};

/*
 *  This function will sort the array of session details, returned from the MongoDD, according
 *  to the session ids found in the array of user views.
 *  unsortedSessions - array of session details.
 *  sessionsViewedByUser - array of session ids.
 */
orderByArray = function(unsortedSessions, sessionsViewedByUser)
{
    //create new empty variable
    var sortedSessions = [];

    //iterate through the array of sessions viewed by user
    for (var i = 0 ; i < sessionsViewedByUser.length ; i++)
    {
        //iterate through the array of unsorted sessions
        for (var j = 0 ; j < unsortedSessions.length ; j++)
        {
            //seek for match between session id in unsorted array and the session in array viewed by user
            if (unsortedSessions[j].sessionId == sessionsViewedByUser[i])
            {
                //add current session to the answer array
                //var doc = unsortedSessions[i];
                //unsortedSessions[i] = unsortedSessions[j];
                sortedSessions.push(unsortedSessions[j]);
                //remove current session from the unsorted array
                unsortedSessions.splice(j, 1);
                //unsortedSessions[j]=doc;
                //continue to the next session in viewed by user array
                continue;
            }
        }
    }
    return sortedSessions;
};
/*
orderByArray = function(docs, arr)
{
    for (var i = 0 ; i < arr.length ; i++)
    {
       for (var j = i ; j < arr.length ; j++)
       {
            if (docs[j].sessionId == arr[i])
            {
                var doc = docs[i];
                docs[i] = docs[j];
                docs[j]=doc;
                continue;
            }
        } 
    }
    return docs;
};
*/

/*
 * This function
 * arr - array of session's details
 * keu - owner
 */
createKeyValJSON = function(arr, key)
{
    //create new empty variables
    var temp = { }, uid = '' , count = 0;
    
    for ( k in arr )
    {
        if (count == 4 && uid == arr[k][key])
        {
            continue;
        }
        if (uid != arr[k][key])
        {
            count = 0;
            uid = arr[k][key];
            temp[uid] = [];
        }

        count++;
        temp[uid].push(arr[k]);
    }
    return temp;
};

/*
createKeyValJSON = function(arr, key)
{
    var temp = { }, uid = '' , count = 0;

    for ( k in arr )
    {
        if (count==4 && uid == arr[k][key]) continue;
        if (uid != arr[k][key])
        {
            count = 0;
            uid = arr[k][key];
            temp[uid] = [];
        }
        count++;
        temp[uid].push(arr[k]);
    }
    return temp;
};
*/