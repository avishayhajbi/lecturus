var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var organizationsSchema = new Schema( 
	{
		name : String,
		students : { type : Array , default : [] }
	});
	
Organization = mongoose.model('organizations', organizationsSchema);