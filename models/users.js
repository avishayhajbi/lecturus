var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usersSchema = new Schema( 
	{
		email : String,
		org : String,
		name: { type : String , default : '' },
		lastName: { type : String , default : '' },
		image:{ type : String , default : '' },
		active : Boolean,
		timestamp: Number,
		subscribe : { type : Array , default : [] },
		friends : { type : Array , default : [] },
		favorites:  [{
		 name : String,description:String, participants:{ type : Array , default : [] }, owner:String,course:String,
         degree:String,lecturer:String, sessionId:String, totalSecondLength:Number, rating:Number, title:String, views:Number , default : [] 
		}],
		owner:  [{
		 name : String,description:String, participants:{ type : Array , default : [] }, owner:String,course:String,
         degree:String,lecturer:String, sessionId:String, totalSecondLength:Number, rating:Number, title:String, views:Number , default : [] 
		}]
	});
	
User = mongoose.model('users', usersSchema);
