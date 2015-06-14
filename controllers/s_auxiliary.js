var fs = require("fs-extra");
var gcm = require('node-gcm');

/** @namespace auxiliary */

/**
 * @inner
 * @memberof auxiliary
 * @function getCoursesByOrg
 * @desc find the related courses to user by the organization
 * @param {json} data - The object with the data
 * @param {string} data.org - shenkar
 * @returns {json} status: 1/0 , degrees
 */
exports.getCoursesByOrg = function(req, res, next)
{
    var org, r = { };
    
    //try to parse the received data
    try
    {
        logger.debug("getCoursesByOrg:search courses for the organization: " + req.body.org);
        org = req.body.org;    
    }
    catch(err)
    {
      	console.log("pauseSession:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
    } 
    
    // check if org field exist and not empty
    if (typeof org === 'undefined' || org == null || org == "")
    {
    	logger.debug("getCoursesByOrg:request must contain org propertie.");
      	r.status = 0;
      	r.desc = "request must contain org propertie.";
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
        	//check if the error occured during the search 
            if(err) 
            {
            	logger.debug("getCoursesByOrg:failure during academin degree search, the error: ", err);
                r.status = 0;
                r.desc = "failure during academin degree search";
                res.json(r);
                return;
            }          
            //check if the database contains organization's academic degrees
            else if(academicDegree)
            {
                logger.debug("getCoursesByOrg:organization " + org + " academic degrees were found.");
                r.status = 1;
                r.check = academicDegree.check;
                r.degrees = academicDegree.degrees;
                r.desc = "organization: " + org + " academic degrees were found.";
                res.json(r);
                return;
            }
            else 
            {
                logger.debug("getCoursesByOrg:organization: " + org + " academic degrees were not found.");
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
 * @desc check if the version is changed 
 * @param {json} data - The object with the data
 * @param {string} data.org - shenkar
 * @param {number} data.check - {0-9}*
 * @returns {json} status: 1/0 , degrees
 */
exports.checkCoursesChanges = function(req, res, next)
{
    var r = { };
    var org;
   
	//try to parse the received data
	try
	{
        org = req.body.org;    
    }
    catch(err)
    {
      	console.log("pauseSession:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
    } 
      
    // check if org field exist and not empty
    if (typeof org === 'undefined' || org == null || org == "")
    {
    	logger.debug("getCoursesByOrg:request must contain org propertie.");
      	r.status = 0;
      	r.desc = "request must contain org propertie.";
      	res.json(r);  
      	return;    	
    }
    else
	{
 		db.model('academic_degrees').findOne(
     	{ org : org }, 
     	{ _id : false, academicId : false, org : false },
     	function (err, doc) 
     	{
	        //check if the error occured during the search 
	        if (err) 
	        {
	            r.status=0;
	            r.desc="err occured";
	            res.json(r);
	            return;
	        }
	        
	        if (!doc) 
	        {
	            r.status=0;
	            r.desc="org not exist";
	            res.json(r);
	            return;
	        }
	        // if the user exist return organization courses
	        else 
	        {
	            data.check = data.check || 0;
	            if (doc.check == data.check)
	            {
	                r.status = 2;
	                r.desc = 'no courses changes';
	            }
	            else 
	            {
	                r.status = 1;
	                r.check = doc.check;
	                r.degrees = doc.degrees;
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
 * @param {json} data - The object with the data
 * @param {string} data.email - name@gmail.com
 * @param {number} data.degree - {0-9}*
 * @param {number} data.course - {0-9}*
 * @param {number} data.from - {0-9}*
 * @param {number} data.to - {0-9}*
 * @returns {json} status: 1/0 , all related videos
 */
exports.getSessionsByCourse = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var data= {};
    
    //try to parse the received data
    try
    {
        data.email = req.query.email;
        data.degreeId = parseInt(req.query.degree)||0;
        data.courseId = parseInt(req.query.course)||0;
        data.from = parseInt(req.query.from) || 0;
        data.to = parseInt(req.query.to) || 24;
    }
    catch(err)
    {
      	console.log("pauseSession:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
    }
      if ( !data || !data.email || data.email == '' )  // if data.name property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property email or its empty";
        res.json(r); 
        return;
    }

	//search for the session document in the sessions collection
    var query = db.model('sessions').find(
    { $and:[{ degreeId : data.degreeId || {$exists:true}},
    { courseId : data.courseId || {$exists:true} }, {stopTime:{ $gt: 0  }} ] },
    sessionPreview);
    query.count(function(err, count) {
        query.sort({timestamp:-1}).skip(data.from).limit(data.to-data.from).exec('find', function(err, docs)
        {    
            //check if an error occured during the search 
            if (err) 
            {
                console.log("failure while trying get videos, the error: ", err);
                r.status = 0;
                r.desc = "failure while trying get videos.";
                res.send((JSON.stringify(r)));
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
        });         
    });
};

/**
 * @inner
 * @memberof auxiliary
 * @function searchSessions
 * @desc find the related videos by the name and the org
 * @param {json} data - The object with the data
 * @param {string} data.name - text
 * @param {string} data.org - shenkar
 * @param {number} data.from - {0-9}*
 * @param {number} data.to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */

exports.searchSessions = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var data = { };
    
    //try to parse the received data
    try
    {
        data = req.body;
        data.from = parseInt(req.body.from) || 0;
        data.to = parseInt(req.body.to) || 24;
    }
    catch(err)
    {
      	console.log("pauseSession:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
    }
 	
 	if ( !data || data.name == '' )  // if data.name property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property name or its empty";
        res.json(r); 
        return;
    }

    var query = db.model('sessions').find({$and:[{org:data.org}, {stopTime:{ $gt: 0  }} ,
    {$or:[{ title:{$regex : ".*"+data.name+".*"}},{ description:{$regex : ".*"+data.name+".*"}},
    { degree:{$regex : ".*"+data.name+".*"}},{ course:{$regex : ".*"+data.name+".*"}}, ]} ]  },sessionPreview);
    
    query.count(function(err, count) {
        query.sort({timestamp:-1}).skip(data.from).limit(data.to-data.from).exec('find', function(err, docs)
        {    
            //check if the error occured during the search 
            if (err) 
            {
                console.log("failure while trying get videos, the error: ", err);
                r.status = 0;
                r.desc = "failure while trying get videos.";
                res.send((JSON.stringify(r)));
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
                r.status = 1;
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
 * @param {json} data - The object with the data
 * @param {string} data.org - shenkar
 * @param {number} data.from - {0-9}*
 * @param {number} data.to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */
exports.getTopRated = function(req, res, next)
{
	//create new empty variables
  	var r = { };
    var data = { };
    
    //try to parse the received data
    try
    {
        data = req.body;
        data.from = parseInt(req.body.from) || 0;
        data.to = parseInt(req.body.to) || 24;
    }
    catch(err)
    {
      	console.log("pauseSession:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
    }
	
	if ( !data || data.org == '' )  // if data.org property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property name or its empty";
        res.json(r); 
        return;
    }

    console.log("looking for videos: "+data.org);
    db.model('sessions').find({$and:[{org:data.org},{stopTime:{$gt:0}}]}, sessionPreview).sort({views: -1}).skip(data.from).limit(data.to-data.from)
    .exec(function(err, docs)
    { 
        //check if the error occured during the search 
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
    });   
};

/**
 * @inner
 * @memberof auxiliary
 * @function followedUsers
 * @desc find user follow list videos 
 * @param {json} data - The object with the data
 * @param {string} data.email - name@gmail.com
 * @param {number} data.from - {0-9}*
 * @param {number} data.to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */

exports.followedUsers = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var data = { };
    
    //try to parse the received data
    try
    {
        data = req.body;
        data.from = parseInt(req.body.from) || 0;
        data.to = parseInt(req.body.to) || 4;
    }
    catch(err) 
    {
      	console.log("pauseSession:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
    }
    
    if ( !data || !data.email )  // if data.name property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property email or its empty";
        res.json(r); 
        return;
    }


    db.model('users').findOne({email:data.email}, {follow:true,org:true,_id:false})
    .lean().exec(function( err, docs )
    { 
        //check if the error occured during the search 
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
            var arr = docs.follow.splice(data.from,(data.to-data.from));
            console.log("followed user to find", arr);
            
            var query = db.model('sessions').find({$and:[{ owner : {$in:arr}},{stopTime:{$gt:0}}]}, sessionPreview);
            query.sort({owner:1,stopTime: -1})//.skip(data.from).limit(data.to)
            .exec(function(err, docs)
            {
            	//check if the error occured during the search 
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
                    createUsersJson(docs, function(result)
                    {   
                        temp = createKeyValJSON(docs,'owner');
                        r.users = result;
                        r.status = 1;
                        r.length=docs.length;
                        r.res = temp;
                        r.desc = "get videos.";
                        res.json(r); 
                        return;
                    });
                    
                    // console.log("followed videos found for "+data.email);
                    // r.status = 1;
                    // r.length=docs.length;
                    // r.res = docs;
                    // r.desc = "get videos.";
                    // res.json(r); 
                    // return; 

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
 * @param {json} data - The object with the data
 * @param {string} data.userId - name@gmail.com
 * @param {number} data.from - {0-9}*
 * @param {number} data.to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */

exports.getUserSessions = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var data = { };
    
    //try to parse the received data
    try
    {
        data = req.body;
        data.from = req.body.from || 0;
        data.to = req.body.to || 4;
    }
    catch(err)
    {
      	console.log("pauseSession:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
    }
    
    if ( !data || !data.userId )  // if data.name property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property userId or its empty";
        res.json(r); 
        return;
    }


    db.model('users').findOne(
	{ email : data.userId }, 
	{ org : true, _id : false},
    function(err, docs)
    { 
        //check if failure occured during user search
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

            var query = db.model('sessions').find({$and:[{$or:[{owner:data.userId},{participants: data.userId }]},{org:docs.org},{stopTime:{$gt:0}}]}, sessionPreview);
            query.sort({views: -1}).skip(data.from).limit(data.to-data.from)
            .exec(function(err, docs)
            {
            	//check if the error occured during the search 
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
                    /*console.log("all videos found for "+data.userId);
                    r.status = 1;
                    r.length=result.length;
                    r.res = result;
                    r.desc = "get user videos.";
                    res.json(r); 
                    return;   */                      
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
 * @param {json} data - The object with the data
 * @param {string} data.userId - name@gmail.com
 * @param {number} data.from - {0-9}*
 * @param {number} data.to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */

exports.getUserFavorites = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var favorites = { };
    var to, from;
    
    //try to parse the received data
    try
    {
        userId = req.body.userId;
        from = parseInt(req.body.from) || 0;
        to = parseInt(req.body.to) || 4;
    }
    catch(err)
    {
      	console.log("getUserFavorites:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
    }
    
    //check that all needed properties were received in the request
    if ( typeof userId === 'undefined' || userId == null || userId == "" )
    {
    	console.log("pauseSession:request must contain userId property.");
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
        // failure while connecting to sessions collection
        if (err) 
        {
            console.log("pauseSession:failure while trying get videos, the error: ", err);
            r.status = 0;
            r.desc = "failure while trying get videos.";
            res.json(r);
            return;
        }
        
        //check if the user exists in the database
      	if ( !userObj )
        {
          	console.log("pauseSession:user: " + userId + " was not found.");
          	r.status = 0;
          	r.desc = "user: " + userId + " was not found.";
          	res.json(r);
          	return;
      	}
        else
        {
            if (userObj.favorites.length)
            {
            	favorites = docs.favorites.splice(from, (to - from));
            }
            
            db.model('sessions').find(
        	{ $and : 
        		[{ sessionId : { $in : favorites } }, { org : userObj.org }, { stopTime : { $gt : 0 } } ]}, sessionPreview)//.sort({owner:1,views: -1})
            .skip(from).limit(to - from)
            .exec(function(err, docs)
            { 
                //check if failure occured while connecting to sessions collection
                if (err) 
                {
                    console.log("pauseSession:failure occured while trying get videos, the error: ", err);
                    r.status = 0;
                    r.desc = "failure occured while trying get videos.";
                    res.json(r);
                    return;
                }
                
                else if (docs)
                {
                    var temp = orderByArray(docs,arr);
                    createUsersJson(docs, function(result)
                    {           
                        r.users = result;
                        r.status = 1;
                        r.length=docs.length;
                        r.res = temp;
                        r.desc = "get videos.";
                        res.json(r); 
                        return;
                    });
                    /*
                    console.log("favorites videos found for "+ data.userId);
                    r.status = 1;
                    r.length=docs.length;
                    r.res = docs;
                    r.desc = "get videos.";
                    res.json(r); 
                    return;  */                       
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
 * @param {json} data - The object with the data
 * @param {string} data.userId - name@gmail.com
 * @param {string} data.sessionId - text
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
      	console.log("addRemoveFavorites:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
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
      	//check if failure occured during user search
      	if (err) 
      	{
	        console.log("addRemoveFavorites:failure occured during user search, the error: ", err);
	        r.status = 0;
	        r.desc = "failure occured during user search";
	        res.json(r);    
	        return;
      	}
      	
       	//check if the user exists in the database
      	if ( !userObj )  //session was not found case
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
			//check if error occured during user save          	
          	if (err)
          	{
           		console.log("addRemoveFavorites:failure occured during user save, the error is: ", err);
           		r.status = 0;
           		r.desc = "failure occured during user save.";
           		res.json(r); 
           		return;          
         	}

     		console.log("addRemoveFavorites:user: " + userId + " favorites were updated successfully.");
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
 * @param {json} data - The object with the data
 * @param {string} data.userId - name@gmail.com
 * @param {number} data.from - {0-9}*
 * @param {number} data.to - {0-9}*
 * @returns {json} status: 1/0, length, res (for the results)
 */

exports.lastViews = function(req, res, next)
{
	//create new empty variables
    var r = { };
    var lastViews = { };
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
      	console.log("lastViews:failure occured while parsing the request, the error is:", err);
      	r.status = 0;
      	r.desc = "failure occured while parsing the request.";
      	res.json(r);
      	return;
    }
  	
  	//check that all needed properties were received in the request
  	if ( typeof userId === 'undefined' || userId == null || userId == "" )  // if data.name property exists in the request is not empty
    {
        console.log("lastViews:request must contain email userId property.");
        r.status = 0;   
        r.desc = "request must contain email userId property.";
        res.json(r); 
        return;
    }

	//search for the user document in the users collection
    db.model('users').findOne(
	{ email : userId }, 
	{ lastViews : true, org : true, _id : false },
    function(err, userObj)
    { 
        //check if failure occured while searching for the user document
        if (err) 
        {
            console.log("lastViews:failure occured while searching for the user, the error: ", err);
            r.status = 0;
            r.desc = "failure occured while searching for the user.";
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
        	{ $and: 
        			[{ sessionId : { $in : lastViews } }, { org : lastViews.org }, { stopTime : { $gt : 0 }}]
			}, sessionPreview)//.sort({owner:1,views: -1})
            //.skip(data.from).limit(data.to-data.from)
            .exec(function(err, docs)
            { 
                //check if failure while 
                if (err) 
                {
                    console.log("failure while trying get lastViews, the error: ", err);
                    r.status = 0;
                    r.desc = "failure while trying get lastViews.";
                    res.json(r);
                    return;
                }
                
                else if (docs)
                {
                    var temp = orderByArray(docs, lastViews);
                    //console.log("videos found "+ result);
                    createUsersJson(docs, function(result)
                    {           
                        r.users = result;
                        r.status = 1;
                        r.length = docs.length;
                        r.res = temp;
                        r.desc = "get videos.";
                        res.json(r); 
                        return;
                    });

                    /*
                    r.status = 1;
                    r.length=docs.length;
                    r.res = docs;
                    r.desc = "lastViews.";
                    res.json(r); 
                    return; */                        
                }
            });                        
        }
    }); 
};


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

createKeyValJSON = function(arr, key)
{
    var temp = { }, uid = '' , count=0;
    
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
