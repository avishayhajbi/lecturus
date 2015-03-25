var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var formidable = require('formidable');
var express = require('express');
var fs = require("fs-extra");
var mkdirp = require('mkdirp');
var router = express.Router();
var path = require('path');
var cloudinary = require('cloudinary');

cloudinary.config({ 
  cloud_name: 'hakrhqyps', 
  api_key: '437118412619984', 
  api_secret: '2y8KTIp1PGzNUQgcwDQsjqMQiU4' 
  //cdn_subdomain: true
});

var files, clips = [], stream, currentfile, dhh;
var _public='./';

router.get('/session', function (req, res) {
	res.render('session',{
    title:"Session API"
  });
});

/*
recieve session parameters and create the session
return status 0 if the failed to create session
return status 1 if the session created
return timestamp to use it as session id
*/
router.post('/session/createSession', function (req, res) {
  // create timestamp and uniqeid
  var date= new Date().getTime();
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = date+userip;
  try{
        // try to parse the json data
        var data = req.body; 
        // check if data.email exist and not enpty
        if (data.email && data.email!="")
        // connect to mongodb
        MongoClient.connect(config.mongoUrl, {native_parser:true}, function(err, db) {
            var r={};
            // if connection failed
            if (err) {
                console.log("query error ",err);
                r.uid=0;
                r.status=0;
                r.desc="err db";
                res.send(lecturusCallback(JSON.stringify(r)))
                return;
            }
            // get users collection 
            var collection = db.collection('users');
            collection.find({email:data.email}).toArray(function (err, docs) {
                // if fail while connecting to users collection
                if (err) {
                    console.log("collection error ",err);
                    r.uid=0;
                    r.status=0;
                    r.desc="err db";
                    res.send(lecturusCallback(JSON.stringify(r)))
                    return;
                }
                // if the user is not exist
                if (!docs.length) {
                    console.log("user not exist");
                    r.uid=0;
                    r.status=0;
                    r.desc="user is not exist";
                    res.send(lecturusCallback(JSON.stringify(r)))
                    return; 
                }

                // if the user exist we arrive here and get session collection
                var collection = db.collection('sessions');
                collection.find({sessionId:uniqueid}).toArray(function (err, docs) {
                    // if fail while connecting to session collection 
                    if (err) {
                        console.log("collection error ",err);
                        r.uid=0;
                        r.status=0;
                        r.desc="err db";
                        res.send(lecturusCallback(JSON.stringify(r)))
                        return;
                    }
                    // if the session id already exist 
                    if (docs.length)
                        // create another session id because the last one was taken
                        uniqueid+= new Date().getTime();
                      data ={
                      sessionId : uniqueid,
                      owner: data.email,
                      length:0,
                      participants:[],
                      audios:[],
                      images:[],
                      tags:[],
                      timestamp: date
                    };
                    delete data.email;
                    // insert session into db
                    collection.insert(session, {upsert:true, safe:true , fsync: true}, function(err, result) {
                        // if faile while registering the new session
                        if (err) {
                          console.log("collection error ",err);
                          r.uid=0;
                          r.status=0;
                          r.desc="err db";
                          res.send(lecturusCallback(JSON.stringify(r)))
                          return;
                        }

                        console.log("session",session);
                        r.sessionId=uniqueid;
                        r.status=1;
                        r.desc="session created";
                        db.close();
                        res.send(lecturusCallback(JSON.stringify(r)))
                    });
                });
            });
        });
        // if data.email not exist or empty
        else{
            r.status=0;
            r.desc="user details error";
            res.send(lecturusCallback(JSON.stringify(r)));     
        }
    // if the json data parsing failed
    }catch(err){
        r.status=0;
        r.desc="data error";
        res.send(lecturusCallback(JSON.stringify(r)));
    }
});

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



router.post("/session/uploadTag",multipartMiddleware, function(req, res ) {
  var sessionId = _public+req.body.sessionId[0];
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  res.send(JSON.stringify({"status":1,"desc":"success"}));
});

router.post('/session/uploadImage', function(request, response) {
  //var sessionId = _public+req.body.sessionId[0];
  var userip = request.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;

    console.log('-->UPLOAD IMAGE<--');
    var form = new formidable.IncomingForm();
    
    //form.uploadDir = "/uploads";
    //form.keepExtensions = true;
    
    form.parse(request, function(error, fields, files) 
    {
        console.log('-->PARSE<--');
        //logs the file information 
        console.log(JSON.stringify(files));
        console.log(JSON.stringify(fields));
   
    });
    
    form.on('progress', function(bytesReceived, bytesExpected) 
    {
        var percent_complete = (bytesReceived / bytesExpected) * 100;
        console.log(percent_complete.toFixed(2));
    });
 
    form.on('error', function(err) 
    {
         console.log("-->ERROR<--");
        console.error(err);
    });
    
    form.on('end', function(error, fields, files) 
    {
        console.log('-->END<--');
        
        /* Temporary location of our uploaded file */
        var temp_path = this.openedFiles[0].path;
        console.log("temp_path: " + temp_path);
            
        /* The file name of the uploaded file */
        var file_name = this.openedFiles[0].name;
        console.log("file_name: " + file_name);
            
        var stream = cloudinary.uploader.upload_stream(function(result) { 
           if (result.error){
              console.log(result); 
              response.send(JSON.stringify({"status":0,"desc":result.error}));
            }
            else {
              console.log(result);
              response.send(JSON.stringify({"status":1,"desc":"success","desc":result.url}));
            }
        },
        {
          public_id: uniqueid, 
          crop: 'limit',
          width: 2000,
          height: 2000,
          eager: [
            { width: 200, height: 200, crop: 'thumb' },
            { width: 200, height: 250, crop: 'fit', format: 'jpg' }
          ],                                     
          tags: ['1426236025252127001', 'lecturus']
        }      
      );
      var file_reader = fs.createReadStream(temp_path).pipe(stream);
    });
    
});

router.post('/session/uploadAudio', function(request, response) {
  //var sessionId = _public+req.body.sessionId[0];
  var userip = request.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;

    console.log('-->UPLOAD IMAGE<--');
    var form = new formidable.IncomingForm();
    
    //form.uploadDir = "/uploads";
    //form.keepExtensions = true;
    
    form.parse(request, function(error, fields, files) 
    {
        console.log('-->PARSE<--');
        //logs the file information 
        console.log(JSON.stringify(files));
        console.log(JSON.stringify(fields));
   
    });
    
    form.on('progress', function(bytesReceived, bytesExpected) 
    {
        var percent_complete = (bytesReceived / bytesExpected) * 100;
        console.log(percent_complete.toFixed(2));
    });
 
    form.on('error', function(err) 
    {
         console.log("-->ERROR<--");
        console.error(err);
    });
    
    form.on('end', function(error, fields, files) 
    {
        console.log('-->END<--');
        
        /* Temporary location of our uploaded file */
        var temp_path = this.openedFiles[0].path;
        console.log("temp_path: " + temp_path);
            
        /* The file name of the uploaded file */
        var file_name = this.openedFiles[0].name;
        console.log("file_name: " + file_name);
            
        var stream = cloudinary.uploader.upload_stream(function(result) { 
           if (result.error){
              console.log(result); 
              res.send(JSON.stringify({"status":0,"desc":result.error, "received_data":req.files.data}));
            }
            else {
              console.log(result);
              res.send(JSON.stringify({"status":1,"desc":"success", "received_data":req.files.data}));
            }
        },
        {
          public_id: uniqueid, 
          resource_type: 'raw',
          format: 'mp3',
          tags: ['1426236025252127001', 'lecturus']
        }      
      );
      var file_reader = fs.createReadStream(temp_path).pipe(stream);
    });
    
});

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

router.get('/session/getVideoId/:videoId?', function (req, res) {
  var fldname = _public+req.query.videoId;
  
  cloudinary.api.resources_by_tag("1426236025252127001", function(result){
    console.log(result)
  });
  cloudinary.api.resources_by_tag("1426236025252127001",
    function(result){
      console.log(result)
    }, { resource_type: 'raw' });
  
  /*var images =[]
  files = fs.readdirSync(fldname),
  files.forEach(function (file) {
      if (file.indexOf(".jpg")!= -1)
        console.log(file)
  });

  var audios =[]
  files = fs.readdirSync(fldname),
  files.forEach(function (file) {
      if (file.indexOf(".mp3")!= -1)
        console.log(file)
  });*/
  
  var recId =  "1.mp3";
  var recId2 = "2.mp3";

  var imgId =  "01.jpg";
  var imgId2 = "02.jpg";
  var imgId3 = "03.jpg";
  var imgId4 = "04.jpg";
  try{
   var temp = {
    "videoId": "123aeEg",
    "title": "אוטומטים שיעור 1.3.14",
    "description": "no description",
    "privacy": true,
    "degree": 33,
    "course": 3313110,
    "lecturer": "kimhi",
    "totalSecondLength": 412,
    "uploadBy": "iofirag@gmail.com",
    "praticipant": [
      {
        "user": "vandervidi@gmail.com",
        "user": "avishayhajbi@gmail.com"
      }
    ],
    "audio": [
      {
        "sound": "https://lecturus.herokuapp.com/session/getAudio/?sessionId=temp&videoId=1.mp3",
        "length": 214,
        "startSecond": 0,
        "user": "iofirag@gmail.com"
      }, {
        "sound": "https://lecturus.herokuapp.com/session/getAudio/?sessionId=temp&videoId=2.mp3",
        "length": 198,
        "startSecond": 215,
        "user": "iofirag@gmail.com"
      }
    ],
    "elements": {
      "6": {
        "photo": {
          "url": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId=01.jpg",
          "user": "vandervidi@gmail.com"
        },
        "tag": {
          "text": "this is tags 6",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "24": {
        "photo": {
          "url": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId=02.jpg",
          "user": "vandervidi@gmail.com"
        }
      },
      "210": {
        "tag": {
          "text": "audio-1 end",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "220": {
        "photo": {
          "url": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId=03.jpg",
          "user": "vandervidi@gmail.com"
        },
        "tag": {
          "text": "this is titles 220",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "379": {
        "photo": {
          "url": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId=04.jpg",
          "user": "vandervidi@gmail.com"
        },
        "tag": {
          "text": "this is titles 379",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "380": {
        "tag": {
          "text": "this is titles 380",
          "user": "vandervidi@gmail.com"
        }
      },
      "381": {
        "photo": {
          "url": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId=02.jpg",
          "user": "vandervidi@gmail.com"
        },
        "tag": {
          "text": "this is titles 381",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "382": {
        "tag": {
          "text": "this is titles 382",
          "user": "avishayhajbi@gmail.com"
        }
      },
      "383": {
        "photo": {
          "url": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId=01.jpg",
          "user": "avishayhajbi@gmail.com"
        },
        "tag": {
          "text": "this is titles 383",
          "user": "vandervidi@gmail.com"
        }
      }
    },
    "status": 1
  }

  temp.status=1;
  res.send(JSON.stringify(temp));
  }catch(err){
    res.send(JSON.stringify({"status":0,"desc":"fail"}));
  }
});

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
module.exports = router;