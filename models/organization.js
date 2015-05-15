var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var organizationsSchema = new Schema( 
	{
		name : { type : String ,  index : 1 , unique : true , required :true},
		students : { type : Array , default : [] }
	});
	
Organization = mongoose.model('organizations', organizationsSchema);