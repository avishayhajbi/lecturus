var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usersSchema = new Schema( 
	{
		email : String,//{ type : String ,  index : 1 , unique : true , required :true},
		org : String,
		regId : { type : String , default : '' },
		location : { type : String , default : '' },
		name : { type : String , default : '' },
		lastName : { type : String , default : '' },
		image : { type : String , default : '' },
		active : Boolean,
		timestamp : Number,
		lastViews : { type : Array , default : [] },
		follow : { type : Array , default : [] },
		friends : { type : Array , default : [] },
		favorites :  { type : Array , default : [] },
		owner :  { type : Array , default : [] },
	});
	
User = mongoose.model('users', usersSchema);
// exports.schemaName = schemaName