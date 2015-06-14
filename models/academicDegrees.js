var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var academicDegreesSchema = new Schema( 
	{
		academicId : { type : String,  index : 1, unique : true, required : true},
		check : { type : Number, default : 0 },
		org : { type : String, default : '' },
		degrees : { any: Schema.Types.Mixed }
	});
	
AcademicDegrees = mongoose.model('academic_degrees', academicDegreesSchema);