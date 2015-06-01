// var express = require('express');
// var router = express.Router();


/* /users/addRemoveFollow -- precondition
 *  This function must receive json with user id, and sessionId  
 *
 * /users/addRemoveFollow -- postcondition
 *  This function will return json with status: 1 = success / 0 = failure.
 *
 * /users/addRemoveFollow -- description
 *  This function goes through 'email' properties in 'user' documents and searches for a suitable email.
 *  then if the email found the sessionId will be store in the user followed list IF the sessionId already
 *  was there it will deleted
 *
 * /users/addRemoveFollow -- example
 *  email       vandervidi@gmail.com
 *  userToFollow  avishayhajbi@gmail.com
*/
exports.addRemoveFollow = function(req,res,next){
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
    if ( !data.email || data.email == "" || !data.userToFollow || data.userToFollow == "")
    {
        r.status = 0;   
        r.desc = "request must contain a property org";
        res.json(r); 
        return;
    }

    db.model('users').findOne({email: data.email},
    function (err, result)
    {
        console.log(result)
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
        else if (result)
        {
            var index= result.follow.indexOf(data.userToFollow);
            if (index > -1)
            {
                result.follow.splice(index, 1);
            }
            else
            {
                result.follow.unshift(data.userToFollow);
            }
            result.save(function(err, obj) 
            { 
                if (err)
                {
                    console.log("failed to update user follow list");
                    r.status = 0;
                    r.desc = "failed to update user follow list";
                    res.json(r);
                    return;          
                }
                console.log("user follow list updated successfully");
                r.status = 1;
                r.desc = "user follow list updated successfully";
                res.json(r);
                return; 
            });
        }
        else
        {
            console.log("user was not found: " + data.email);
            r.status = 0;
            r.desc = "user was not found";
            res.json(r);
            return;
            
        }
        
    }); 
}
// router.post("/users/addRemoveFollow", function(req, res) 
// {

    
// });

// module.exports = router;