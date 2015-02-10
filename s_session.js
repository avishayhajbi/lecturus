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
var fldname="./temp";

router.get('/session', function (req, res) {
	res.render('session',{
    title:"Session"
  });
});

/*
recieve session parameters and create the session
return status 0 if the session already exist
return status 1 if the session created
*/
router.post('/session/createSession', function (req, res) {
  var date= new Date().getTime();
  try{
    data = JSON.parse(req.body.data);
  }catch(err){ }
  var info={};
  if (fs.existsSync("./"+date)) {
    info.status = 0;
    info.desc = "exist";
  }
  else {
    fs.mkdirSync("./"+date);
    info.status = 1;
    info.desc = "created";
  }
  info.timestamp = date;
  res.send(JSON.stringify(info));
});

/*
get session id and audio file
*/
router.post("/session/uploadAudio", function(req, res ) {
  var form = new multiparty.Form();
  form.parse(req, function(err, fields, files) {
      //fldname="./"+fields['sessionId'][0];
  });
  console.log("recieving audio.. locate in "+fldname)
  
  var data = new Buffer('');
	req.on('data', function(chunk) {
	    data = Buffer.concat([data, chunk]);
	});
	req.on('end', function() {
      req.rawBody = data;
	    fs.writeFile(fldname+"/"+new Date().getTime()+'.mp3', data, 'binary', function(err){
        	if (err) throw err;
        	console.log('Wrote out song');
    	});
	});
  res.send("done upload audio "+new Date())
   
});

/*
get session id to fetch the relevant directory
*/
router.get("/session/mergeAudios", function(req, res) {
  //fldname = "./"+req.query.sessionId;
  
  files = fs.readdirSync(fldname),
  dhh = fs.createWriteStream(fldname+'/fullAudio.mp3');
  // fs.renameSync(currentname, newname);

  // create an array with filenames (time)
  files.forEach(function (file) {
      if (file.indexOf(".mp3")!= -1)
       clips.push(file.substring(0, file.length-4));  
  });

  // Sort
  clips.sort(function (a, b) {
      return a - b;
  });

  merge();

  res.send("done merge audios "+new Date())
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
get image by id
*/
router.get('/session/getImage', function (req, res) {
  //var recId = "./"+req.query.recordId+"/fullAudio.mp3";
  var recId = fldname+"/fullAudio.mp3";
  try{
   //try this 
    var img = fs.readFileSync(fldname+"/1423402381793.jpg");
    res.writeHead(200, {'Content-Type': 'image/jpg' });
    res.end(img, 'binary');

  }catch(err){
    res.send("problem while searching"); 
  }
});

/*
get session id and audio file
*/
router.get('/session/getAudio', function (req, res) {
  //var recId = "./"+req.query.recordId+"/fullAudio.mp3";
  var recId = fldname+"/fullAudio.mp3";
  try{
     
    var stat = fs.statSync(recId);
    res.writeHead(200, {'Content-Type': 'audio/mpeg','Content-Length': stat.size });
    var readStream = fs.createReadStream(recId);
    readStream.pipe(res);

  }catch(err){
    res.send("problem while searching"); 
  }
});

/*
get session id and image file
*/
router.post("/session/uploadImage",multipartMiddleware, function(req, res ) {
  console.log(req.body)
   
  fs.readFile(req.files.data.path, function (err, data) {
    fs.writeFile(fldname+"/"+new Date().getTime()+".jpg", data, function (err) {
        res.send("done upload image "+new Date())
    });
  });
  // res.send("done upload image "+new Date())
});

router.post("/session/uploadAudio2",multipartMiddleware, function(req, res ) {
  console.log(req.body)

  fs.readFile(req.files.data.path, function (err, data) {
    fs.writeFile(fldname+"/"+new Date().getTime()+".mp3", data, function (err) {
        res.send("done upload audio "+new Date())
    });
  });
  // res.send("done upload image "+new Date())
});

function checkAndCreateSessionDirectoryIfNotExist(dirName){
  //check if directory exist else create
  if (fs.existsSync(dirName)) {
      // Do something
  }
  else fs.mkdirSync(dirName);
  
}
module.exports = router;
