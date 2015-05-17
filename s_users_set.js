var express = require('express');
var router = express.Router();

router.get('/users', function (req, res) 
{
	res.render('users',
	{
		title:"Users API"
	});
	
});

/* /users/registerUser -- precondition
 *	This function must receive json with email: user id and org: organization that user studies at. 
 *
 * /users/registerUser -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure.
 *
 * /users/registerUser -- description
 * 	This function goes through 'email' properties in 'user' documents and searches for a suitable email.
 *	If an email, received in request, was not found, this function will insert new 'user' document into 'users' collection in mongodb.
 *
 * /users/registerUser -- example
 *	email		vandervidi@gmail.com
 * 	org			shenkar
*/
router.post("/users/registerUser", function(req, res) 
{
	var r = { };
	var email, org, data;
	
    try
    {
        //try to parse json data
    	email = req.body.email;
    	org = req.body.org;
    	data = req.body;
    }
    catch( err )
    {
  		console.log("REGISTERUSER:failure while parsing the request, the error:" + err);
    	r.status = 0;
    	r.desc = "failure while parsing the request";
    	res.json(r);
    	return;
    }
    
    if (	typeof email === 'undefined' || email == null || email == "" ||
    		typeof org === 'undefined' || org == null || org == "" )	// if data.email and data.org property exists in the request is not empty
    {
    	console.log("REGISTERUSER:request must contain email and org properties.");
    	r.status = 0;	
        r.desc = "request must contain email and org properties.";
        res.json(r); 
        return;
    }
	
    db.model('organizations').findOne( { name : org },
	{ _id : false },
    function( err, orgObject )
    {
    	console.log("REGISTERUSER:organization: " + orgObject);
    	
    	// failure during user search
        if (err) 
        {
         	console.log("REGISTERUSER:failure during user search, the error: ", err);
         	//r.uid = 0;
          	r.status = 0;
          	r.desc = "failure during user search.";
         	res.json(r);	
          	return;
        }
        
		// if the org do not exist
        if (orgObject == null)
        {
         	console.log("REGISTERUSER:organization was not found.");
         	//r.uid = 0;
          	r.status = 0;
          	r.desc = "organization was not found.";
         	res.json(r);	
          	return;
        }
        
        //check that user belongs to the organization
        if ( orgObject.students.indexOf(email) != -1 )
        {   
		    db.model('users').find( { email : email },
		    { _id : false, active : false, timestamp : false, favorites : false, owner : false },
		    function (err, result)
		    {
		    	// failure during user search
		        if (err) 
		        {
		         	console.log("REGISTERUSER:failure during user search, the error: ", err);
		         	r.uid = 0;
		          	r.status = 0;
		          	r.desc = "failure during user search";
		         	res.json(r);	
		          	return;
		        }
		        
		        // if the user do not exist, register the user
		        if (!result.length)
		        {
		        	//console.log("result ",result)
		        	data.timestamp = new Date().getTime();
		        	data.active = true;
		        	
		        	console.log("REGISTERUSER:register new user " + email);
		            // insert new user to users collection 
		            var newUser =  new User(data);
					newUser.save(function (err) 
					{
					  	// failure during insertion of new user
		                if (err) 
		                {
		                 	console.log("REGISTERUSER:failure during insertion of new user, the error: ", err);
		                 	//r.uid = 0;
		                  	r.status = 0;
		                  	r.desc = "failure during insertion of new user";
		                 	res.json(r);
		                  	return;
		                }
		                else
		                {
		                    console.log("REGISTERUSER:user: " + email + " was registered successfully.");
		                    //r.uid = data.email;
		                    r.status = 1;
		                    r.desc = "user: " + email + " was registered successfully.";
		                    res.json(r);
		                    return;	                        	
		                }
					});
					
		        }
				else // the user exists, function returns 2 (exist)
				{
					console.log("REGISTERUSER:user: " + email + " already exists in the system.");
					//r.uid = data.email;
					//r.info = result[0];					
					r.status = 0;
					r.desc = "user: " + email + " already exists in the system.";
					res.json(r);
					return;
				}
		    }); 
	    }
	    else
	    {
			console.log("REGISTERUSER:user: " + email + " do not belong to the organization: " + org + ".");
			//r.uid = data.email;
			//r.info = result[0];					
			r.status = 0;
			r.desc = "user: " + email + " do not belong to the organization: " + org + ".";
			res.json(r);
			return;	    	
	    }   	
    });
});

/* /users/updateUser -- precondition
 *	This function must receive json with email: user id, any other fields: active true/false.  
 *
 * /users/updateUser -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure.
 *
 * /users/updateUser -- description
 * 	This function goes through 'email' properties in 'user' documents and searches for a suitable email.
 *	If an email, received in request, was found, this function will update 'user' document with new information.
 *
 * /users/updateUser -- example
 *	email		vandervidi@gmail.com
*/
router.post("/users/updateUser", function(req, res) 
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
        r.desc = "request must contain a property org";
        res.json(r); 
        return;
    }

	db.model('users').findOneAndUpdate( { email : data.email }, data, { upsert : false },
    function (err, result)
    {
    	console.log(result);
    	// failure during user search
        if (err) 
        {
         	console.log("UPDATEUSER:failure during user search, the error: ", err);
         	r.uid = 0;
          	r.status = 0;
          	r.desc = "failure during user search";
         	res.json(r);	
          	return;
        }
        else if (result)
        {
        	console.log("UPDATEUSER:user: " + data.email + " was successfully updated.");
            r.status = 1;
            r.desc = "user: " + data.email + " was successfully updated.";
            res.json(r);
			return;
			
        }
        else
        {
        	console.log("UPDATEUSER:user: " + data.email + " was not found.");
            r.status = 0;
            r.desc = "user: " + data.email + " was not found.";
            res.json(r);
			return;
			
        }
		
    }); 
});

module.exports = router;
