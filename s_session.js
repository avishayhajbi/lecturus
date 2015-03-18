var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
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
var fldname=_public+"temp";

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
  var date= new Date().getTime();
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  try{
    data = JSON.parse(req.body.data);
  }catch(err){ }
  var info={};
  if (fs.existsSync(_public+date+userip)) {
    info.status = 0;
    info.session = date+userip;
    info.desc = "failed";
  }
  else {
    //fs.mkdirSync(_public+date);
    info.status = 1;
    info.session = date+userip;
    info.desc = "created";
  }
  info.timestamp = date;
  res.send(JSON.stringify(info));
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

/*
get session id and image file
{data: file.jpg, sessionId:sessionid}
return status 1 if success and 0 if fail
*/
router.post("/session/uploadImage",multipartMiddleware, function(req, res ) {
  //fldname = _public+req.body.sessionId[0]; // if form
  fldname = _public+req.body.sessionId; // if FormData
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  if (!req.body.sessionId) res.send(JSON.stringify({"status":0,"desc":"session name error"}));
  else if (!req.files) res.send(JSON.stringify({"status":0,"desc":"no file"}));
  /*else fs.readFile(req.files.data.path, function (err, data) {
    if (err)  res.send(JSON.stringify({"status":0,"desc read":err}));
    else fs.writeFile(fldname+"/"+uniqueid+".jpg", data, function (err) {
        if (err)  res.send(JSON.stringify({"status":0,"desc write":err}));
        else res.send(JSON.stringify({"status":1,"desc":"success"}))
    });
  });*/

   else {
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
      var file_reader = fs.createReadStream(req.files.data.path).pipe(stream);
      
   }

 
  /*
  else cloudinary.uploader.upload(
    req.files.data.path,
    function(result) { 
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
      crop: 'limit',
      width: 2000,
      height: 2000,
      eager: [
        { width: 200, height: 200, crop: 'thumb' },
        { width: 200, height: 250, crop: 'fit', format: 'jpg' }
      ],                                     
      tags: ['1426236025252127001', 'lecturus']
    }      
  ) */ 
});
/*
get session id and audio file
{data: file.mp3, sessionId:sessionid}
return status 1 if success and 0 if fail
*/
router.post("/session/uploadAudio",multipartMiddleware, function(req, res ) {
  //fldname = _public+req.body.sessionId[0]; // if form
  fldname = _public+req.body.sessionId; // if FormData
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;

  if (!req.body.sessionId) res.send(JSON.stringify({"status":0,"desc":"session name error"}));
  else if (!req.files) res.send(JSON.stringify({"status":0,"desc":"no file"}));
  /*else fs.readFile(req.files.data.path, function (err, data) {
    if (err) res.send(JSON.stringify({"status":0,"desc":"fail"}));
    else fs.writeFile(fldname+"/"+uniqueid+".mp3", data, function (err) {
        if (err) res.send(JSON.stringify({"status":0,"desc":"fail"}));
        res.send(JSON.stringify({"status":1,"desc":"success"}))
    });
  });*/

  else{
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
      var file_reader = fs.createReadStream(req.files.data.path).pipe(stream);
  }

 /* else cloudinary.uploader.upload(
    req.files.data.path,
    function(result) { 
      
      if (result.error){
        console.log(result); 
        res.send(JSON.stringify({"status":0,"desc":result.error}));
      }
      else {
        console.log(result);
        res.send(JSON.stringify({"status":1,"desc":"success"}));
      }
    },
    {
      public_id: uniqueid, 
      resource_type: 'raw',
      format: 'mp3',
      tags: ['1426236025252127001', 'lecturus']
    }      
  ) */ 

});

router.post("/session/uploadTag",multipartMiddleware, function(req, res ) {
  //fldname = _public+req.body.sessionId[0]; // if form
  fldname = _public+req.body.sessionId; // if FormData
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;
  
  
});
/*
get image by session id
return audio file or status 0 (fail)
*/
router.get('/session/getImage/:sessionId?:imageId?', function (req, res) {
  
  fldname = _public+req.query.sessionId;
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
  fldname = _public+req.query.sessionId;
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
  fldname = _public+req.query.videoId;
  
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
  
  var recId =  "01.mp3";
  var recId2 = "02.mp3";

  var imgId =  "01.jpg";
  var imgId2 = "02.jpg";
  var imgId3 = "03.jpg";
  var imgId4 = "04.jpg";
  try{
   var temp = {
    "videoId": "temp",
    "title": "אוטומטים שיעור 1.3.14",
    "uploadBy": "iofirag@gmail.com",
    "praticipant": [
      {
        "user": "vandervidi@gmail.com",
        "user": "avishayhajbi@gmail.com"
      }
    ],
    "totalSecondLength": 405,
    "audio": [
      {
        "sound": "https://lecturus.herokuapp.com/session/getAudio/?sessionId=temp&videoId="+recId,
        "length": 211,
        "startSecond": 0
      }, {
        "sound": "https://lecturus.herokuapp.com/session/getAudio/?sessionId=temp&videoId="+recId2,
        "length": 194,
        "startSecond": 212
      }
    ],
    "elements": {
      "6": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId,
        "text": "this is subtitles 6"
      },
      "24": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId2,
      },

      "210": {
        "text": "audio-1 end"
      },

      "220": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId3,
        "text": "this is titles 220"
      },

      "379": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId4,
        "text": "this is titles 379"
      },
      "380": {
        "text": "this is titles 380"
      },
      "381": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId,
        "text": "this is titles 381"
      },
      "382": {
        "text": "this is titles 382"
      },
      "383": {
        "photo": "https://lecturus.herokuapp.com/session/getImage/?sessionId=temp&imageId="+imgId2,
        "text": "this is titles 383"
      }
    }
     
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

/*
TEST::
get session id and audio file named data
{data: file.mp3, sessionId:sessionid}
*/

router.post("/session/uploadImage2", function(req, res ) {
  var form = new multiparty.Form();
  var userip = req.connection.remoteAddress.replace(/\./g , '');
  var uniqueid = new Date().getTime()+userip;

  var count=0;
  var data = new Buffer('');
  req.on('data', function(chunk) {
      data = Buffer.concat([data, chunk]);
  });

  form.parse(req, function(err, fields, files) {
      fldname=_public+fields['sessionId'][0];
      callback();
  });

  req.on('end', function() {
      req.rawBody = data;
      callback();
  });

  var callback = function(){
    if (count++ == 1){
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
      var file_reader = fs.createReadStream(data).pipe(stream);
      
    }
    /*fs.writeFile(fldname+"/"+uniqueid+'.jpg', data, 'binary', function(err){
          if (err) res.send({"status":0,"desc":"fail"})
          else {
            console.log('Wrote out song');
            res.send({"status":1,"desc":"success"})
          }
      });*/
  }
});


module.exports = router;