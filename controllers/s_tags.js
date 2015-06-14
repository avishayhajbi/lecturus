/** @namespace tags */

/**
 * @inner
 * @memberof tags
 * @function insertTag
 * @desc add a new tag into existing session
 * @param {json} data - The object with the data
 * @param {string} data.userId - name@gmail.com
 * @param {string} data.sessionId - text
 * @param {string} data.time - {0-9}*
 * @param {string} data.tagText - text
 * @returns {json} status: 1/0, 
 * tag: json with positive and negative each one of them has users:true/false value:number
 */

exports.insertTag = function (req,res,next){
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

    db.model('sessions').findOne({sessionId:data.sessionId}
    ,function( err, doc )
    //).lean().exec(function(err,doc)
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
      if (!doc.elements[data.time])
      {
        doc.elements[data.time]={ tags: [] };
      }
      else
      {
        if (!doc.elements[data.time].tags)
          doc.elements[data.time].tags = [];
      }
      doc.elements[data.time].tags.push(newTag);

      doc.markModified('elements');

      doc.save(function(err, result){
        if (err)
        {
          console.log("tag not inserted "+err);
          r.status=0;
          r.desc="tag not inserted";
          res.json(r)
          return;
        } 
        else 
        {
          console.log("insertTag:tag: " + newTag.id + " was successfully inserted.");
          newTag.rating.positive.users = false;
          newTag.rating.negative.users = false;
          r.status=1;
          r.tag = newTag;
          r.desc="tag inserted";
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
        res.json(r);
        return;
      }
    });

}

/**
 * @inner
 * @memberof tags
 * @function updateTag
 * @desc update tag
 * @param {json} data - The object with the data
 * @param {string} data.userId - name@gmail.com
 * @param {string} data.sessionId - text
 * @param {string} data.tagText - text
 * @param {number} data.time - {0-9}*
 * @param {number} data.tagId - {0-9}*
 * @returns {json} status: 1/0 
 */


exports.updateTag = function (req,res,next){
   var r = { };
   var data='';
    try
    {
        //try to parse json data
       data = req.body;
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
       db.model('sessions').findOne({sessionId:data.sessionId} 
      ,function(err, doc) { 
        if (err)
        {
          console.log("tag not updated "+err);
          r.status=0;
          r.desc="tag not updated";
          res.json(r)
          return;
        } 
      else if (doc)
      {

        var newTag;
        if (doc.elements[data.time] && doc.elements[data.time].tags)
          doc.elements[data.time].tags.filter(function(tag){
            if (tag.id==data.tagId && tag.email==data.userId)
              newTag = tag;
            return;
          });
        

        if (newTag){
          console.log('tag to update', newTag);
          newTag.text = data.tagText;
          doc.markModified('elements');
        }

        
        if (newTag)
         doc.save(function(err, result){
            if (err)
            {
              console.log("tag not updated "+err);
              r.status=0;
              r.desc="tag not updated"; 
              res.json(r)
              return;
            } 
            else 
            {
              console.log("updateTag:tag: " + data.tagId + " was successfully updated.");
              console.log("tag updated");
              r.status=1;
              r.desc="tag updated"; 
              res.json(r);
              return;
            }
          });
        else
        {
          console.log("tag "+data.tagId+" not found");
          r.status=0;
          r.desc="tag "+data.tagId+" not found"; 
          res.json(r);
          return;
        }
      }
      else
      {
        console.log("session "+data.sessionId+" not found");
        r.status=0;
        r.desc="session "+data.sessionId+" not found";
        res.json(r);
        return;
      }
    });
}


/**
 * @inner
 * @memberof tags
 * @function deleteTag
 * @desc delete a tag from the requested session
 * @param {json} data - The object with the data
 * @param {string} data.userId - name@gmail.com
 * @param {string} data.sessionId - text
 * @param {number} data.time - {0-9}*
 * @param {number} data.tagId - {0-9}*
 * @returns {json} status: 1/0 
 */

exports.deleteTag = function (req,res,next){
  var r = { };
  var data='';
  try
  {
      //try to parse json data
    data = req.body;
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

     db.model('sessions').findOne({sessionId:data.sessionId}
    ,function(err, doc) 
    { 
      if (err)
      {
        console.log("tag not deleted "+err);
        r.status=0;
        r.desc="tag not deleted"; 
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
            if (doc.elements[data.time].tags[index].email == data.userId)
            {
              console.log('tag '+data.tagId+" was found");
              doc.elements[data.time].tags.splice(index,1);
              if (!doc.elements[data.time].tags.length)
                delete doc.elements[data.time].tags;
              if (!doc.elements[data.time].tags && !doc.elements[data.time].photo)
                delete doc.elements[data.time];
              deleteTag=true;
              doc.markModified('elements');
            }
          }
        }


        
        if (deleteTag)
          doc.save(function(err, result) 
          { 
            if (err)
            {
              console.log("tag not deleted "+err);
              r.status=0;
              r.desc="tag not deleted";
              res.json(r)
              return;
            } 
            else 
            {
              console.log("tag deleted");
              r.status=1;
              r.desc="tag deleted"; 
              res.json(r);
              return;
            }
          });
      
          else
          {
            console.log("tag "+data.tagId+" not found");
            r.status=0;
            r.desc="tag "+data.tagId+" not found"; 
            res.json(r);
            return;
          }
       }
      
      else
      {
        console.log("session "+data.sessionId+" not found");
        r.status=0;
        r.desc="session "+data.sessionId+" not found";
        res.json(r);
        return;
      }
    });
}


/**
 * @inner
 * @memberof tags
 * @function updateTag
 * @desc update tag rating
 * @param {json} data - The object with the data
 * @param {string} data.userId - name@gmail.com
 * @param {string} data.sessionId - text
 * @param {number} data.time - {0-9}*
 * @param {number} data.tagId - {0-9}*
 * @param {boolean} data.vote - true/false
 * @returns {json} status: 1/0, 
 * tag: json with positive and negative each one of them has users:true/false value:number
 */

exports.updateTagRating = function (req,res,next){
  var r = { };
  var data;
    try
    {
      //try to parse json data
      data = req.body;
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

      db.model('sessions').findOne({sessionId:data.sessionId}
      ,function(err, doc) 
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
      var check = false, voteUp=false, voteDown=false;
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
            voteUp=true;
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
            voteDown=true;
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
      doc.markModified('elements');
      if (check)
        doc.save(function(err, result) 
        { 
          if (err)
          {
            console.log("tag rate not updated "+err);
            r.status=0;
            r.desc="tag not updated"; 
            res.json(r)
            return;
          } 
          else 
          {
            selectedTag.rating.positive.users = voteUp;
            selectedTag.rating.negative.users = voteDown;
            console.log("tag rate updated");
            r.status=1;
            r.rating = selectedTag.rating;
            r.desc="tag rate updated";
            res.json(r);
            return;
          }
        });
     
      else
      {
        console.log("tag "+data.tagId+" not found");
        r.status=0;
        r.desc="tag "+data.tagId+" not found";
        res.json(r);
        return;
      }
    }
    else
    {
      console.log("session "+data.sessionId+" not found");
      r.status=0;
      r.desc="session "+data.sessionId+" not found";     
      res.json(r);
      return;
    }
    });
}

