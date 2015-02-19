//var FormData = require('form-data');
var multiparty = require('multiparty');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var express = require('express');
var fs = require("fs-extra");
var mkdirp = require('mkdirp');
var router = express.Router();
var path = require('path');

var files, clips = [], stream, currentfile, dhh;
var _public='./';
var fldname=_public+"temp";

//checkAndCreateSessionDirectory(fldname);

router.get('/session', function (req, res) {
	res.render('session',{
    title:"Session"
  });
});

/*
recieve session parameters and create the session
return status 0 if the session already exist
return status 1 if the session created
return timestamp to use it as session id
*/
router.post('/session/createSession', function (req, res) {
  var date= new Date().getTime();
  try{
    data = JSON.parse(req.body.data);
  }catch(err){ }
  var info={};
  if (fs.existsSync(_public+date)) {
    info.status = 0;
    info.session = date;
    info.desc = "exist";
  }
  else {
    fs.mkdirSync(_public+date);
    info.status = 1;
    info.session = date;
    info.desc = "created";
  }
  info.timestamp = date;
  res.send(JSON.stringify(info));
});

/*
get session id and audio file named data
{data: file.mp3, sessionId:sessionid}
*/
/*router.post("/session/uploadAudio2", function(req, res ) {
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files) {
      fldname="./"+fields['sessionId'][0];
  });
  console.log("recieving audio.. locate in "+fldname)
  
  var data = new Buffer('');
	req.on('data', function(chunk) {
	    data = Buffer.concat([data, chunk]);
	});
	req.on('end', function() {
      req.rawBody = data;
	    fs.writeFile(fldname+"/"+new Date().getTime()+'.mp3', data, 'binary', function(err){
        	if (err) res.send({"status":0,"desc":"fail"})
        	else {
            console.log('Wrote out song');
            res.send({"status":1,"desc":"success"})
          }
    	});
	});
});*/

/*
get session id to know the relevant directory
*/
router.get("/session/mergeAudios/:sessionId?", function(req, res) {
  fldname = _public+req.query.sessionId;
  files = fs.readdirSync(fldname),
  dhh = fs.createWriteStream(fldname+'/fullAudio.mp3');
  // fs.renameSync(currentname, newname);

  // create an array with filenames (time)
  files.forEach(function (file) {
      if (file.indexOf(".mp3")!= -1 && file.indexOf("fullAudio") == -1){
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
}

/*
get session id and image file
{data: file.jpg, sessionId:sessionid}
return status 1 if success and 0 if fail
*/
router.post("/session/uploadImage",multipartMiddleware, function(req, res ) {
  fldname = _public+req.body.sessionId;
  fs.readFile(req.files.data.path, function (err, data) {
    if (err)  res.send(JSON.stringify({"status":0,"desc":"fail"}));
    else fs.writeFile(fldname+"/"+new Date().getTime()+".jpg", data, function (err) {
        if (err)  res.send(JSON.stringify({"status":0,"desc":"fail"}));
        res.send(JSON.stringify({"status":1,"desc":"success"}))
    });
  });
});

/*
get session id and audio file
{data: file.mp3, sessionId:sessionid}
return status 1 if success and 0 if fail
*/
router.post("/session/uploadAudio",multipartMiddleware, function(req, res ) {
  fldname = _public+req.body.sessionId;
  fs.readFile(req.files.data.path, function (err, data) { //req.files.data.path
    if (err) res.send(JSON.stringify({"status":0,"desc":"fail"}));
    else fs.writeFile(fldname+"/"+new Date().getTime()+".mp3", data, function (err) {
        if (err) res.send(JSON.stringify({"status":0,"desc":"fail"}));
        res.send(JSON.stringify({"status":1,"desc":"success"}))
    });
  });
});

/*
get image by session id
return audio file or status 0 (fail)
*/
router.get('/session/getImages/:sessionId?', function (req, res) {
  fldname = _public+req.query.sessionId;
  try{
    var images =[]
    files = fs.readdirSync(fldname),
    files.forEach(function (file) {
        if (file.indexOf(".jpg")!= -1)
         images.push(fs.readFileSync(fldname+"/"+file));  
       
    });

    res.writeHead(200, {'Content-Type': 'image/jpg' });
    res.end(images[0], 'binary');
   
   
  }catch(err){
    res.send(JSON.stringify({"status":0,"desc":"fail"})); 
  }
});

/*
get session id and audio file
return audio file of status 0 (fail)
*/
router.get('/session/getAudio/:sessionId?', function (req, res) {
  fldname = _public+req.query.sessionId;
  var recId = fldname+"/levi.mp3";
  var recId2 = fldname+"/left.mp3";

  var imgId = fldname+"/1.mp3";
  var imgId2 = fldname+"/2.mp3";

  try{
    var stat = fs.statSync(recId);
    res.writeHead(200, {'Content-Type': 'audio/mpeg','Content-Length': stat.size });
    var readStream = fs.createReadStream(recId);

    /*var data='';
    readStream.on('data', function(chunk) {
      data+=chunk;
    });
     
    readStream.on('end', function() {
       res.send(data)
    });*/

    /*
    var readStream = fs.createReadStream('play.js', {'bufferSize': 1024});
    readStream.setEncoding('utf8');
    readStream.on('data', function (data) {
        console.log(activeRequests);
        res.write(data);
    });
    readStream.on('end', function () {
        res.end();
        console.log('end');
        //activeRequests--;
    });
    */
    readStream.on('open', function () {
      readStream.pipe(res);
    });
    readStream.on('error', function(err) {
      res.end({"status":0,"desc":"failed while transfering"});
    });
  }catch(err){
    res.send(JSON.stringify({"status":0,"desc":"fail"}));
  }
});

function checkAndCreateSessionDirectory(dirName){
  //check if directory exist else create
  if (fs.existsSync(dirName)) {
  }
  else fs.mkdirSync(dirName);
}

module.exports = router;
