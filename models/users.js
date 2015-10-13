var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usersSchema = new Schema( 
	{
		email : { type : String ,  index : true, unique : true , required :true},
		org : { type : String , default : '' },
		regId : { type : String , default : '' },
		location : { type : String , default : '' },
		name : { type : String , default : '' },
		lastName : { type : String , default : '' },
		image : { type : String , default : '' },
		active : { type : Boolean , default : true },
		timestamp : { type : Number , default : 0 },
		lastViews : { type : Array , default : [] },
		follow : { type : Array , default : [] },
		friends : { type : Array , default : [] },
		favorites :  { type : Array , default : [] },
		owner :  { type : Array , default : [] }
	});
	
User = mongoose.model('users', usersSchema);
// exports.schemaName = schemaName