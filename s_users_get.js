var express = require('express');
var router = express.Router();


/* /users/getUser -- precondition
 *	This function must receive json with email: user id, any other fields: active true/false.
 *
 * /users/getUser -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure, and 'user' data.
 * 
 * /users/getUser -- description
 * 	This function goes through 'email' properties in 'user' documents and searches for a suitable email.
 *	If an email, received in request, was found, this function will return 'user' document's info.
 * 
 * /users/getUser -- example
 *	email		vandervidi@gmail.com
*/
router.post("/users/getUser", function( req, res ) 
{
	var r = { };
	
    try
    {
        //try to parse json data
    	var data = req.body;
    }
     catch( err )
    {
  		console.log("failure while parsing the request, the error:" + err);
    	r.status = 0;
    	r.desc = "failure while parsing the request";
    	res.json(r);
    	return;
    }
    if ( !data.email || data.email == "" )	// if data.email property exists in the request is not empty
    {
    	r.status = 0;	
        r.desc = "request must contain a property email";
        res.json(r); 
        return;
    }

    db.model('users').find( { email : data.email },
    { _id:false ,name:true, lastName:true, image:true, email:true, org:true },
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
        
        
        if (result.length)
        {
        	console.log("user: " + data.email + " exists in the system.");
			r.uid = data.email;
			r.info = result[0];					
			r.status = 1;
			r.desc = "user: " + data.email + " exists in the system.";
			res.json(r);
			return;
			
        }
		else // the user not exist, function returns 0
		{
			console.log("user: " + data.email + " not exist in the system.");
			r.uid = data.email;
			r.status = 0;
			r.desc = "user: " + data.email + " not exist in the system.";
			res.json(r);
			return;
		}
    });   
});


/* /users/getUsersData -- precondition
 *  This function must receive json array with email called users
 *
 * /users/getUsersData -- postcondition
 *  This function will return json with status: 1 = success / 0 = failure, and all 'users' data.
 * 
 * /users/getUsersData -- description
 *  This function goes through 'email' properties in 'user' documents and searches for a suitable email.
 *  If an email, received in request, was found, this function will return 'user' document's info.
 * 
 * /users/getUsersData -- example
 *  users[0]       vandervidi@gmail.com
 *  users[1]       avishayhajbi@gmail.com
*/
router.post("/users/getUsersData", function( req, res ) 
{
    var r = { };
    
    try
    {
        //try to parse json data
        var data = req.body.users;
    }
    catch( err )
    {
        console.log("failure while parsing the request, the error:" + err);
        r.status = 0;
        r.desc = "failure while parsing the request";
        res.json(r);
        return;
    }
    if ( !data || data.length == 0 )  // if data.email property exists in the request is not empty
    {
        r.status = 0;   
        r.desc = "request must contain a property users or its empty";
        res.json(r); 
        return;
    }

    db.model('users').find( { email : { $in : data } },
    { _id : false, name : true, lastName : true, image : true, email : true },
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
        
        if (result.length)
        {
            console.log("user: " + data + " exists in the system.");
            r.uid = data;
            r.users = result;                 
            r.status = 1;
            r.desc = "user: " + data.email + " exists in the system.";
            res.json(r);
            return;
            
        }
        else // the user not exist, function returns 0
        {
            console.log("user: " + data.email + " not exist in the system.");
            r.uid = data.email;
            r.status = 0;
            r.desc = "user: " + data.email + " not exist in the system.";
            res.json(r);
            return;
        }
    });   
});

/* /users/getActiveUsers -- precondition
 *	This function must receive json with org. 
 *
 * /users/getActiveUsers -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure, users: array[all active users that belong to the organization].
 *	
 * /users/registerUser -- description 
 * This function goes through 'org' properties in 'user' documents and searches for a suitable organization, it will return all active users from ( with active property set to 1 ).
 *  	
 * /users/registerUser -- example
 * org		shenkar
*/
router.post("/users/getActiveUsers", function( req, res ) 
{

	var r = { };
	
    try
    {
        //try to parse json data
    	var data = req.body;
    }
     catch( err )
    {
  		console.log("failure while parsing the request, the error:" + err);
    	r.status = 0;
    	r.desc = "failure while parsing the request";
    	res.json(r);
    	return;
    }
    if ( !data.org || data.org == "" )	// if data.org property exists in the request is not empty
    {
    	r.status = 0;	
        r.desc = "request must contain a property org";
        res.json(r); 
        return;
    }

    db.model('users').find( { org : data.org, active : true },
    { _id : false, name : true, lastName : true, image : true, email : true },
    function (err, result)
    {
    	// failure during user search
        if (err) 
        {
         	console.log("GETACTIVEUSERS:failure during user search, the error: ", err);
         	r.uid = 0;
          	r.status = 0;
          	r.desc = "failure during user search";
         	res.json(r);	
          	return;
        }
        
        // if the user do not exist, register the user
        if (result.length)
        {
        	console.log("GETACTIVEUSERS:active users: " + result + " were found in: " + data.org + " organization.");
            r.status = 1;
            r.users = result;
            r.desc = "active users were find in: " + data.org + " ogranization.";
            res.json(r);
			return;
			
        }
		else // the user not exist, function returns 0
		{
			console.log("no active users were find in: " + data.org + " ogranization.");
            r.status = 0;
            r.desc = "no active users were find in: " + data.org + " ogranization.";
            res.json(r);
			return;
		}
    }); 
});
module.exports = router;