//var FormData = require('form-data');
var multiparty = require('multiparty');
var express = require('express');
var fs = require("fs-extra");
var mkdirp = require('mkdirp');
var router = express.Router();
var path = require('path');

var files, clips = [], stream, currentfile, dhh;
var fldname="./files";

router.get('/session', function (req, res) {
	res.render('session',{
    title:"Session"
  });
});


router.post("/session/uploadAudio", function(req, res ) {
  var form = new multiparty.Form();
   form.parse(req, function(err, fields, files) {
      fldname=fields['sessionId'][0];
  });

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

router.get("/session/mergeAudios", function(req, res) {
  fldname = "./"+req.query.sessionId;
  files = fs.readdirSync(fldname),
  dhh = fs.createWriteStream(fldname+'/fullAudio.mp3');
  // fs.renameSync(currentname, newname);

  // create an array with filenames (time)
  files.forEach(function (file) {
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

router.get('/session/getAudio', function (req, res) {
  var recId = "./"+req.query.recordId+"/fullAudio.mp3";
  try{
    
    var filePath = path.join(__dirname, recId);
    var stat = fileSystem.statSync(filePath);

    res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size
    });

    var readStream = fs.createReadStream(filePath);

    // We replaced all the event handlers with a simple call to readStream.pipe()
    readStream.pipe(res);

    /*//res.send(createReadStream(recId+"/fullAudio")); //fs.createReadStream(recId+"/fullAudio.mp3") 
    // This will wait until we know the readable stream is actually valid before piping
    var readStream = fs.createReadStream(recId+"/fullAudio");
   
    readStream.on('open', function () {
      // This just pipes the read stream to the response object (which goes to the client)
     
      readStream.pipe(res);
    });

    // This catches any errors that happen while creating the readable stream (usually invalid names)
    readStream.on('error', function(err) {
      res.end(err);
    });*/
  }catch(err){
    res.send("problem while searching"); 
  }
});

function createNewDirectory(dirName){
  /*check if directory exist else create
  if (fs.existsSync(path)) {
      // Do something
  }
  mkdirp('./newFolderCreated', function(err) { 
      //path was created unless there was error
  });
  */
}
module.exports = router;
