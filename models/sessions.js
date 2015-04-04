var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var sessionsSchema = new Schema( 
	{
		sessionId : String,
    	name : String,
    	description : String,
    	lecturer : String,
    	degree : String,
    	course : String,
    	owner : String,
    	length : String,
    	rating : {
        	positive : {
            	value : String,
            	users : { type : Array , "default" : [] }
        },
        	negative : {
            	value : String,
            	users : { type : Array , "default" : [] }
        	}
    	},
    	participants : [
        	{ user : String }
    		],
    	audios : [],
		
	});
	
mongoose.model('sessions', sessionsSchema);
