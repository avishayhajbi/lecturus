var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var sessionsSchema = new Schema( 
{
	sessionId : { type : String,  index : true, unique : true, required : true},
	org : { type : String, default : '' },
	title :  { type : String, default : '' },
	description : { type : String, default : '' },
	lecturer : { type : String, default : '' },
	degreeId : { type : Number, default : 0 },
	courseId : { type : Number, default : 0 },
	degree : { type : String, default : '' },
	course : { type : String, default : '' },
	owner : { type : String, default : '' },
	startTime: { type : Number, default : 0 },
	stopTime:  { type : Number, default : 0 },
	pauseTime:  { type : Number, default : 0 },
	totalSecondLength : { type : Number , default : 0 },
	rating : {
    	positive : {
        	value : { type : Number, default : 0 },
        	users : { type : Array, default : [] }
    	},
    	negative : {
        	value : { type : Number, default : 0 },
        	users : { type : Array, default : [] }
    	}
    },
	participants :  { type : Array, default : [] },
	audios : [ { length : Number,timestamp : Number, email : String, url : String, startAt : Number, default : [] } ],
	elements : {  type: mongoose.Schema.Types.Mixed, default : {} },
	tags : { type : Array, default : [] },
	images : { type : Array, default : [] },
	views : { type : Number, default : 0 },
	active : { type : Boolean, default : true },
	public : { type : Boolean, default : true },
	timestamp : { type : Number, default : 0 }
},
{
    strict: false,
});
	
Session = mongoose.model('sessions', sessionsSchema);
