var express = require('express');
var fs = require("fs-extra");
var router = express.Router();

router.get('/users', function (req, res) 
{
	res.render('users',
	{
		title:"Users API"
	});
	
});

/* /users/registerUser -- precondition
 *	This function must receive json with email: user id, any other fields: active true/false.  
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
*/
router.post("/users/registerUser", function(req, res) 
{
	var r = { };
	
    try
    {
        //try to parse json data
    	var data = req.body;

        // check if the field email exist and not empty
        if ( data.email && data.email != "" )	// if data.email property exists in the request is not empty
        {
        	// connect to mongodb 
        	MongoClient.connect( config.mongoUrl, { native_parser : true} , function(err, db )	//TODO. res.json
	        {	            
	            // if mongodb connection failed, return error message and exit
	            if (err) 
	            {               
                    console.log("MongoLab connection error: ", err);
               	 	r.uid = 0;							//TODO. res.json
                	r.status = 0;
                	r.desc = "failed to connect to MongoLab.";
                	res.send((JSON.stringify(r)));		//TODO. res.json
                	return;
	            }
	            
	            // if mongodb connection success asking for users collection
	            var collection = db.collection('users');
	            
	            // find user id from users collection
	            collection.find( { email : data.email } ).toArray( function( err, docs ) 
	            {
                	// failure during user search
                    if (err) 
                    {
                     	console.log("failure during user search, the error: ", err);
                     	r.uid = 0;
                      	r.status = 0;
                      	r.desc = "failure during user search";
                     	res.send((JSON.stringify(r)));	//TODO. res.json
                      	return;
                    }
                    
	                // if the user do not exist, register the user
	                if ( !docs.length )
	                {
	                    // insert new user to users collection 
	                    collection.insert( data, { upsert : true, safe : true , fsync : true }, function( err, result ) 
	                    {
	                    	// failure during insertion of new user
	                        if (err) 
	                        {
	                         	console.log("failure during insertion of new user, the error: ", err);
	                         	r.uid = 0;
	                          	r.status = 0;
	                          	r.desc = "failure during insertion of new user";
	                         	res.send((JSON.stringify(r)));	//TODO. res.json
	                          	return;
	                        }
	                        else
	                        {
		                        console.log("user: " + data.email + " has completed successfully.");
		                        r.uid = data.email;				//TODO. remove
		                        r.status = 1;
		                        r.active = false;				//TODO. remove
		                        r.desc = "user: " + data.email + " has completed successfully.";
		                        db.close();						//TODO. remove
		                        res.send((JSON.stringify(r)));	//TODO. res.json	                        	
	                        }
	                    });
	                }
	                // the user exists, function returns 0 (failure)
					else 
					{
						console.log("user: " + data.email + " already exists in the system.");
						r.uid = data.email;					//TODO. remove
						r.status = 0;
						r.desc = "user: " + data.email + " already exists in the system.";
						db.close();							//TODO. remove
						res.send((JSON.stringify(r)));		//TODO. res.json
					}
	            });
	        });
		}
        else 	// if data.email was not received or empty
        {
            r.status = 0;	
            r.desc = "request must contain a property email";
            res.send((JSON.stringify(r)));   //TODO. res.json  
        }
    // if the data parsing failed
    }
    catch( err )
    {
  		console.log("failure while parsing the request, the error:" + err);
    	r.status = 0;
    	r.desc = "failure while parsing the request";
    	res.send((JSON.stringify(r)));		//TODO. res.json
    }
});

/* /users/getUser -- precondition
 *	This function must receive json with email: user id, any other fields: active true/false.
 *
 * /users/getUser -- postcondition
 *	This function will return json with status: 1 = success / 0 = failure, and 'user' data.
 * 
 * /users/registerUser -- description
 * 	This function goes through 'email' properties in 'user' documents and searches for a suitable email.
 *	If an email, received in request, was found, this function will return 'user' document's info.
 * 
 * /users/registerUser -- example
 *	email		vandervidi@gmail.com
*/
router.post("/users/getUser", function( req, res ) 
{
	var r = { };
	
    try
    {
        //try to parse json data
        var data = req.body; 
        
        // check if the field email exist and not empty
        if ( data.email && data.email != "" )
        {
	        // try to connect to mongodb
	        MongoClient.connect( config.mongoUrl, { native_parser : true }, function( err, db ) 
	        {
	            // if mongodb connection failed, return error message and exit
	            if (err) 
	            {               
	                console.log("MongoLab connection error: ", err);
	           	 	r.uid = 0;							//TODO. res.json
	            	r.status = 0;
	            	r.desc = "failed to connect to MongoLab.";
	            	res.send((JSON.stringify(r)));		//TODO. res.json
	            	return;
	            }
	            
	            // if mongodb connection success asking for users collection
	            var collection = db.collection('users');
	            
	            // try to find user id 
	            collection.find( { email : data.email } ).toArray( function( err, docs ) 
	            {
	            	// failure during user search
	                if (err) 
	                {
	                 	console.log("failure during user search, the error: ", err);
	                 	r.uid = 0;
	                  	r.status = 0;
	                  	r.desc = "failure during user search";
	                 	res.send((JSON.stringify(r)));	//TODO. res.json
	                  	return;
	                }
	                
	                // if the user do not exist, return 0 (failure)
	                if (!docs.length) 
	                {
						console.log("user: " + data.email + " do not exist in the system.");
						r.uid = data.email;					//TODO. remove
						r.status = 0;
						r.desc = "user: " + data.email + " do not exist in the system.";
						db.close();							//TODO. remove
						res.send((JSON.stringify(r)));		//TODO. res.json
	                }
	                // if the user exists
	                else 
	                {
	                	// remove indternal mongodb id
	                    delete docs[0]._id;
	                    // set all user's indo			
	                    r.info = docs[0];
	                    r.status = 1;
						r.desc = "user: " + data.email + " was found in the system.";
						db.close();							//TODO. remove
						res.send((JSON.stringify(r)));		//TODO. res.json
	                 }
	            });
	        });
       	}
        // if data.email not exist or empty
        else
        {
            r.status = 0;	
            r.desc = "request must contain a property email";
            res.send((JSON.stringify(r)));   //TODO. res.json     
        }
    // if the parsing failed
    }
    catch( err )
    {
  		console.log("failure while parsing the request, the error:" + err);
    	r.status = 0;
    	r.desc = "failure while parsing the request";
    	res.send((JSON.stringify(r)));		//TODO. res.json
    }   
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
        
        // check if the field email exist and not empty
        if ( data.org && data.org != "")
        {
	        // try to connect to mongodb
	        MongoClient.connect( config.mongoUrl, { native_parser : true }, function( err, db ) 
	        {
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
	            
	            // ask for users collection
	            var collection = db.collection('users');
	            
	            // try to find user id 
	            collection.find( { org : data.org, active : true } ).toArray( function( err, docs ) 
	            {
	            	// failure during user search
	                if (err) 
	                {
	                 	console.log("failure during user search, the error: ", err);
	                 	r.uid = 0;
	                  	r.status = 0;
	                  	r.desc = "failure during user search";
	                 	res.send((JSON.stringify(r)));	//TODO. res.json
	                  	return;
	                }
		                
	                // no documents found
	                if ( !docs.length ) 
	                {
	                    console.log("no active users were find in this: " + data.org + " ogranization.");
	                    r.status = 0;
	                    r.desc = "no active users were find in this: " + data.org + " ogranization.";
	                    res.json(r);
	                    return; 
	                }
	                else
	                {
	                    console.log("active users: " + docs + " were found in this: " + data.org + " organization.");
	                    r.status = 1;
	                    // set all found active users 
	                    r.users = docs;
	                    r.desc = "active users were find in this: " + data.org + " ogranization.";
	                    db.close();						// TODO. remove
	                    res.send((JSON.stringify(r)));	// TODO. res.json(r);		                	
	                }                
	                 
	                 
	            });
	        });
	    }
        // if data.org not exist or empty
        else
        {
            r.status = 0;	
            r.desc = "request must contain a property org";
            res.send((JSON.stringify(r)));   //TODO. res.json      
        }
    // if the parsing failed
    }
    catch(err)
    {
        r.status=0;
        r.desc="data error";
        res.send((JSON.stringify(r)));
    }  
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
        
        // check if the field email exist and not empty
        if ( data.email && data.email != "")
        
        // connect to mongodb 
        MongoClient.connect( config.mongoUrl, { native_parser : true }, function( err, db ) 
        {          
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
            
            // if mongodb connection success asking for users collection
            var collection = db.collection('users');
            
            // find user id from users collection
            collection.find( { email : data.email } ).toArray( function ( err, docs ) // TODO. Replace with findAndModify
            {
            	// failure during user search
                if (err) 
                {
                 	console.log("failure during user search, the error: ", err);
                 	r.uid = 0;
                  	r.status = 0;
                  	r.desc = "failure during user search";
                 	res.send((JSON.stringify(r)));	//TODO. res.json
                  	return;
                }
                
                // if the user do not exist, return 0 (failure)
                if (!docs.length) 
                {
					console.log("user: " + data.email + " do not exist in the system.");
					r.uid = data.email;					//TODO. remove
					r.status = 0;
					r.desc = "user: " + data.email + " do not exist in the system.";
					db.close();							//TODO. remove
					res.send((JSON.stringify(r)));		//TODO. res.json
                }
             
                // if the user exist update the user data
                else
                {
                	// update user info
                     collection.update( { email : data.email }, { $set : data }, { upsert:true, safe : true, fsync : true}, function( err, result ) 
                     {  
						// failure while updating user document
		                if (err) 
		                {
		                    console.log("filure while updating user info, the error: ", err);
		                    r.uid = 0;							// TODO. remove
		                    r.status = 0;
		                    r.desc = "filure while updating user info.";
		                    res.send((JSON.stringify(r)));
		                    return;
		                }
		                else
		                {
	                        console.log("user: " +  data.email + " was updated successfully.");
	                        r.uid=data.email;					// TODO. remove
	                        r.status = 1;
	                        r.desc = "user: " +  data.email + " was updated successfully.";
	                        db.close();							// TODO. remove
	                        res.send((JSON.stringify(r)));		//TODO. res.json	                	
		                }
                     });
                 }
            });
        });
        // if data.email not exist or empty
        else
        { 
            r.status = 0;	
            r.desc = "request must contain a property email";
            res.send((JSON.stringify(r)));   //TODO. res.json       
        }
    }
    // if the data parsing has failed
    catch(err)
    {
  		console.log("failure while parsing the request, the error:" + err);
    	r.status = 0;
    	r.desc = "failure while parsing the request";
    	res.send((JSON.stringify(r)));		//TODO. res.json
    }
});



module.exports = router;
