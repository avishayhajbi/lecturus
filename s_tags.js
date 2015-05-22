var express = require('express');
var router = express.Router();

/* /tags/insertTag -- precondition
 *
 * /tags/insertTag -- postcondition
 *
 * /tags/insertTag -- description
 *
 * /tags/insertTag -- example
 *  sessionId       142964947916810933728
 *  time            25
    tagId           123456789
    userId          avishayhajbi@gmail.com
    tagText         bla bla 
 */
router.post("/tags/insertTag", function(req, res) 
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
    if ( !data || !data.sessionId || !data.userId )	
    {
    	r.status = 0;	
      r.desc = "request must contain a property sessionId and userId";
      res.json(r); 
      return;
    }

  MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db)
  {
    console.log("insertTag:Trying to connect to the db");
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

    var collection = db.collection('sessions');
    collection.findOne({sessionId:data.sessionId},{ _id: false }, {upsert:false ,safe:true , fsync: true}, 
    function(err, doc) 
    { 
      if (err) 
      {
        console.log("insertTag:failure during session search, the error: ", err);
        r.status = 0;
        r.desc = "failure during session search";
        res.json(r);  
        return;
      }
      else if (doc)
      {
      console.log("insertTag:tag: " + data.tagId + " was successfully updated.");

      var newTag =  {
          "id": new Date().getTime().toString(),
          "timestamp": data.time,
          "text": data.tagText || '',
          "email": data.userId,
          "rating": {
              "positive": {
                  "users": [],
                  "value": 0
              },
              "negative": {
                  "users": [],
                  "value": 0
              }
          }
      };
      if (doc.elements[data.time])
      {
        if (doc.elements[data.time].tags)
          doc.elements[data.time].tags.push(newTag)
        else 
        {
          doc.elements[data.time].tags=[];
          doc.elements[data.time].tags.push(newTag);
        }
      }
      collection.update({sessionId:data.sessionId},{ $set : {elements : doc.elements} }, {upsert:false ,safe:true , fsync: true}, 
      function(err, result) { 
        if (err)
        {
          console.log("tag not added "+err);
          r.status=0;
          r.desc="tag not added";
          db.close(); 
          res.json(r)
          return;
        } 
        else 
        {
          console.log("tag added");
          r.status=1;
          r.desc="tag added";
          db.close(); 
          res.json(r);
          return;
        }
      });
      }
      else
      {
        console.log("session "+data.sessionId+" not found");
        r.status=0;
        r.desc="session "+data.sessionId+" not found";
        db.close(); 
        res.json(r);
        return;
      }
    });
  });
});

/* /tags/updateTag -- precondition
 *
 * /tags/updateTag -- postcondition
 *
 * /tags/updateTag -- description
 *
 * /tags/updateTag -- example
 *  sessionId       142964947916810933728
 *  time            25
    tagId           123456789
    userId          avishayhajbi@gmail.com
    tagText         bla bla 
 */
router.post("/tags/updateTag", function(req, res) 
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
    if ( !data || !data.sessionId || !data.userId ) 
    {
      r.status = 0; 
        r.desc = "request must contain a property sessionId and userId";
        res.json(r); 
        return;
    }

  MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db)
  {

    if (err) 
    {
      console.log("updateTag:failure during session search, the error: ", err);
      r.status = 0;
      r.desc = "failure during session search";
      res.json(r);  
      return;
    }
    var collection = db.collection('sessions');

    collection.findOne({sessionId:data.sessionId},{_id:false}, 
    function(err, doc) { 
      if (err)
      {
        console.log("tag not updated "+err);
        r.status=0;
        r.desc="tag not updated";
        db.close(); 
        res.json(r)
        return;
      } 
    else if (doc)
    {

      console.log("updateTag:tag: " + data.tagId + " was successfully updated.");
      
      if (doc.elements[data.time] && doc.elements[data.time].tags)
      var newTag;
      doc.elements[data.time].tags.filter(function(tag){
        if (data.tagId == tag.id && data.email == data.userId)
          newTag = tag;
        return;
      });
     
      console.log('tag to update', newTag);

      
      newTag.text = data.tagText;

      if (newTag)
        collection.update({sessionId:data.sessionId},{ $set : {elements : doc.elements} }, {upsert:false ,safe:true , fsync: true}, 
        function(err, result) { 
          if (err)
          {
            console.log("tag not updated "+err);
            r.status=0;
            r.desc="tag not updated";
            db.close(); 
            res.json(r)
            return;
          } 
          else 
          {
            console.log("tag updated");
            r.status=1;
            r.desc="tag updated";
            db.close(); 
            res.json(r);
            return;
          }
        });
      else
      {
        console.log("tag "+data.tagId+" not found");
        r.status=0;
        r.desc="tag "+data.tagId+" not found";
        db.close(); 
        res.json(r);
        return;
      }
    }
    else
    {
      console.log("session "+data.sessionId+" not found");
      r.status=0;
      r.desc="session "+data.sessionId+" not found";
      db.close(); 
      res.json(r);
      return;
    }
  });
  });
});


/* /tags/deleteTag -- precondition
 *
 * /tags/deleteTag -- postcondition
 *
 * /tags/deleteTag -- description
 *
 * /tags/deleteTag -- example
 *  sessionId       142964947916810933728
 *  time            25
    tagId           123456789
    userId          avishayhajbi@gmail.com
    tagText         bla bla 
 */
router.post("/tags/deleteTag", function(req, res) 
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
  if ( !data || !data.sessionId || !data.userId ) 
  {
    r.status = 0; 
      r.desc = "request must contain a property sessionId and userId";
      res.json(r); 
      return;
  }

  MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) // TODO. REMOVE *
  {
    console.log("deleteTag:Trying to connect to the db");
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

    var collection = db.collection('sessions');
    collection.findOne({sessionId:data.sessionId},{_id:false}, 
    function(err, doc) 
    { 
      if (err)
      {
        console.log("tag not deleted "+err);
        r.status=0;
        r.desc="tag not deleted";
        db.close(); 
        res.json(r)
        return;
      } 
      // { sessionId : data.sessionId } , { _id : false }
      else if (doc)
      {
        console.log("deleteTag:session: " + data.sessionId + " found.");
        var deleteTag = false;
        if (doc.elements[data.time] && doc.elements[data.time].tags)
        {
          var index = doc.elements[data.time].tags.map(function(tag){
            return tag['id'];
          }).indexOf(data.tagId);

          if (index != -1)
          {
            if (doc.elements[data.time].tags[index].email == data.userId){
              console.log('tag '+data.tagId+" was found");
              doc.elements[data.time].tags.splice(index,1);
              deleteTag=true;
            }
          }
        }

        if (deleteTag)
          collection.update({sessionId:data.sessionId},{ $set : {elements : doc.elements} }, {upsert:false ,safe:true , fsync: true}, 
          function(err, result) 
          { 
            if (err)
            {
              console.log("tag not deleted "+err);
              r.status=0;
              r.desc="tag not deleted";
              db.close(); 
              res.json(r)
              return;
            } 
            else 
            {
              console.log("tag deleted");
              r.status=1;
              r.desc="tag deleted";
              db.close(); 
              res.json(r);
              return;
            }
          });
      
          else
          {
            console.log("tag "+data.tagId+" not found");
            r.status=0;
            r.desc="tag "+data.tagId+" not found";
            db.close(); 
            res.json(r);
            return;
          }
       }
      
      else
      {
        console.log("session "+data.sessionId+" not found");
        r.status=0;
        r.desc="session "+data.sessionId+" not found";
        db.close(); 
        res.json(r);
        return;
      }
    });
  });
});


/* /tags/updateTagRating -- precondition
 *
 * /tags/updateTagRating -- postcondition
 *
 * /tags/updateTagRating -- description
 *
 * /tags/updateTagRating -- example
 *  sessionId       142964947916810933728
 *  time            25
    tagId           123456789
    userId          avishayhajbi@gmail.com
    vote            true/false
 */
router.post("/tags/updateTagRating", function(req, res) 
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
    if ( !data || !data.sessionId || !data.userId || !data.vote) 
    {
      r.status = 0; 
      r.desc = "request must contain a property sessionId, userId and vote";
      res.json(r); 
      return;
    }

  // db.model('sessions').findOne( { sessionId : data.sessionId } , { _id : false })
  // .lean()
  // .exec(function (err, doc){
    MongoClient.connect(config.mongoUrl, { native_parser:true }, function(err, db) // TODO. REMOVE *
      {
        console.log("updateTagRating:Trying to connect to the db");
        var r ={};              
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
      var collection = db.collection('sessions');

      collection.findOne({sessionId:data.sessionId},{_id:false}, 
      function(err, doc) 
      {
      if (err) 
      {
        console.log("updateTagRating:failure during session search, the error: ", err);
        r.status = 0;
        r.desc = "failure during session search";
        res.json(r);  
        return;
      }
      //console.log("updateTagRating:tag: " + data.tagId + " was successfully updated.");
      else if (doc)
      {
      var check = false;
      var selectedTag;
      if (doc.elements[data.time] && doc.elements[data.time].tags)
      {
        selectedTag = doc.elements[data.time].tags.filter(function(tag){
          return data.tagId == tag.id;
        });
        console.log('tag to update rate',selectedTag);
        if (selectedTag.length)
        {
          check = true;
          selectedTag = selectedTag[0];
        }

        if (data.vote == "true")
        {
          //check situation were the user vote true
          var index = selectedTag.rating.positive.users.indexOf(data.userId);
          if (index == -1)
          {
            selectedTag.rating.positive.users.push(data.userId);
            selectedTag.rating.positive.value = parseInt(selectedTag.rating.positive.value)+1;
          }
          else
          {
            selectedTag.rating.positive.users.splice(index,1);
            selectedTag.rating.positive.value = parseInt(selectedTag.rating.positive.value)-1;
          }
          //check situation if the user vote false before
          index = selectedTag.rating.negative.users.indexOf(data.userId);
          if (index != -1)
          {
            selectedTag.rating.negative.users.splice(index,1);
            selectedTag.rating.negative.value = parseInt(selectedTag.rating.negative.value)-1;
          }
        }
        else if (data.vote == "false")
        {
          //check situation were the user vote false
          var index = selectedTag.rating.negative.users.indexOf(data.userId);
          if (index == -1)
          {
            selectedTag.rating.negative.users.push(data.userId);
            selectedTag.rating.negative.value = parseInt(selectedTag.rating.negative.value)+1;
          }
          else
          {
            selectedTag.rating.negative.users.splice(index,1);
            selectedTag.rating.negative.value = parseInt(selectedTag.rating.negative.value)-1;
          }
          //check situation if the user vote true before
          index = selectedTag.rating.positive.users.indexOf(data.userId);
          if (index != -1)
          {
            selectedTag.rating.positive.users.splice(index,1);
            selectedTag.rating.positive.value = parseInt(selectedTag.rating.positive.value)-1;
          }
        }
        else
        {
          r.status = 0; 
          r.desc = "request must contain a property vote true or false";
          res.json(r); 
          return; 
        }
      }

      if (check)
        collection.update({sessionId:data.sessionId},{ $set : {elements : doc.elements} }, {upsert:false ,safe:true , fsync: true}, 
        function(err, result) 
        { 
          if (err)
          {
            console.log("tag rate not updated "+err);
            r.status=0;
            r.desc="tag not updated";
            db.close(); 
            res.json(r)
            return;
          } 
          else 
          {
            console.log("tag rate updated");
            r.status=1;
            r.desc="tag rate updated";
            db.close(); 
            res.json(r);
            return;
          }
        });
     
      else
      {
        console.log("tag "+data.tagId+" not found");
        r.status=0;
        r.desc="tag "+data.tagId+" not found";
        db.close(); 
        res.json(r);
        return;
      }
  }
    else
    {
      console.log("session "+data.sessionId+" not found");
      r.status=0;
      r.desc="session "+data.sessionId+" not found";
      db.close(); 
      res.json(r);
      return;
    }
});
  });
});

module.exports = router;
