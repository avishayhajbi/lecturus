var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var sessionsSchema = new Schema( 
{
	sessionId : Number,
	name : String,			//Should not be named title???
	description : String,
	lecturer : String,
	degree : Number,
	course : Number,
	owner : String,
	recordStarts : Boolean,	//TODO. change the property, so we could understand what it is related to....
	startTime: Number,
	stopTime: Number,
	totalSecondLength : Number,		//TODO. length of what???
	rating : {
    	positive : {
        	value : Number,
        	users : { type : Array , "default" : [] }
    },
    	negative : {
        	value : Number,
        	users : { type : Array , "default" : [] }
    	}
	},
	participants : [
    	{ user : String }
		],
	audios : [ { lenght : Number, email : String, url : String, startAt : Number } ],
	elements : {},			//TODO. Add properties here
	views : Number,
	active : Boolean,		//TODO. what is it for?
	public : Boolean,
	timestamp : Number		//TODO. what is it for?
	
});
	
mongoose.model('sessions', sessionsSchema);
