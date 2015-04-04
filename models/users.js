var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var usersSchema = new Schema( 
	{
		email : String,
		org : String,
		active : Boolean,
		
	});
	
mongoose.model('users', usersSchema);
