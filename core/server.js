var express = require('express');
var path = require('path');
var bodyParser  = require('body-parser');
var fs = require("fs-extra");
require( process.cwd() + '/logs/init.js');


app = express();
app.use(express.static(process.cwd() + '/out'));
app.use(express.static(process.cwd() + '/logs'));
// app.set('views',process.cwd() + '/views');
// app.set('view engine', 'ejs');
app.use(bodyParser()); 
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var port = process.env.PORT || 8080;
app.set('port', port);

var controllers = { };
controllers_path = process.cwd() + '/controllers';

fs.readdirSync(controllers_path).forEach(function (file) 
{
    if (file.indexOf('.js') != -1) 
    {
        controllers[file.split('.')[0]] = require(controllers_path + '/' + file);
    }
});

app.post("/auxiliary/getCoursesByOrg", controllers.s_auxiliary.getCoursesByOrg);
app.post("/auxiliary/checkCoursesChanges", controllers.s_auxiliary.checkCoursesChanges);
app.get("/auxiliary/getSessionsByCourse/:email?:degree?:course?:from?:to?", controllers.s_auxiliary.getSessionsByCourse);
app.post("/auxiliary/searchSessions", controllers.s_auxiliary.searchSessions);
app.post("/auxiliary/getTopRated", controllers.s_auxiliary.getTopRated);
app.post("/auxiliary/followedUsers", controllers.s_auxiliary.followedUsers);
app.post("/auxiliary/getUserSessions", controllers.s_auxiliary.getUserSessions);
app.post("/auxiliary/getUserFavorites", controllers.s_auxiliary.getUserFavorites);
app.post("/auxiliary/addRemoveFavorites", controllers.s_auxiliary.addRemoveFavorites);
app.post("/auxiliary/lastViews", controllers.s_auxiliary.lastViews);

app.post("/session/createSession", controllers.s_sessions_get.createSession);
app.post("/session/getUserSessions", controllers.s_sessions_get.getUserSessions);
app.post("/session/addMembers", controllers.s_sessions_get.addMembers);
app.post("/session/updateViews", controllers.s_sessions_get.updateViews);
app.post("/session/getSessionById", controllers.s_sessions_get.getSessionById);
app.get("/session/getAllVideos/:email?", controllers.s_sessions_get.getAllVideos);
app.post("/session/getMembers", controllers.s_sessions_get.getMembers);

app.post("/session/updateSessionStatus", controllers.s_sessions_get_set.updateSessionStatus);
app.post("/session/seekSessionStandby", controllers.s_sessions_get_set.seekSessionStandby);
app.post("/session/pauseSession", controllers.s_sessions_get_set.pauseSession);

app.post("/session/updateSession", controllers.s_sessions_set.updateSession);
app.post("/session/updateSessionRating", controllers.s_sessions_set.updateSessionRating);
app.post("/session/joinSession", controllers.s_sessions_set.joinSession);
app.post("/session/deleteImage", controllers.s_sessions_set.deleteImage);
app.post("/session/rotateImage", controllers.s_sessions_set.rotateImage);
app.post("/session/deleteSession", controllers.s_sessions_set.deleteSession);
app.post("/session/switchSessionOwner", controllers.s_sessions_set.switchSessionOwner);

app.post("/session/uploadTags", controllers.s_sessions_uploads.uploadTags);
app.post("/session/uploadImage", controllers.s_sessions_uploads.uploadImage);
app.post("/session/uploadAudio", controllers.s_sessions_uploads.uploadAudio);

app.post("/tags/insertTag", controllers.s_tags.insertTag);
app.post("/tags/updateTag", controllers.s_tags.updateTag);
app.post("/tags/deleteTag", controllers.s_tags.deleteTag);
app.post("/tags/updateTagRating", controllers.s_tags.updateTagRating);

app.post("/users/getActiveUsers", controllers.s_users_get.getActiveUsers);
app.post("/users/getUsersData", controllers.s_users_get.getUsersData);
app.post("/users/getUser", controllers.s_users_get.getUser);

app.post("/users/addRemoveFollow", controllers.s_users_get_set.addRemoveFollow);

app.post("/users/updateUser", controllers.s_users_set.updateUser);
app.post("/users/registerUser", controllers.s_users_set.registerUser);


process.on("uncaughtException", function(err) 
{
  	logger.error({data:'uncaughtException', error: err.stack}); 
});

app.listen(app.get('port'), function() 
{
  	logger.info('LecturuS Server running...' + app.get('port'));
});

app.get('/', function(req, res) 
{
 	res.sendFile(process.cwd() + '/out/index.html');
});

app.get('/*', function(req, res) 
{
  logger.debug({data:'page not found', url: req.url});
	res.send(405,'page not allowed lecturus');
});
