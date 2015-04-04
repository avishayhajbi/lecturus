var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var sessionsSchema = new Schema( 
	{
		sessionId : String,
    	name : String,			//Should not be named title???
    	description : String,
    	lecturer : String,
    	degree : String,
    	course : String,
    	owner : String,
    	recordStarts : Boolean,	//TODO. change the property, so we could understand what it is related to....
    	startTime: Number,
    	stopTime: Number,
    	length : Number,		//TODO. length of what???
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
    	audios : [ { lenght : String, email : String, url : String, startAt : String } ],
    	elements : {},			//TODO. Add properties here
    	views : String,
    	active : Boolean,		//TODO. what is it for?
    	public : Boolean,
    	timestamp : String		//TODO. what is it for?
		
	});
	
mongoose.model('sessions', sessionsSchema);
