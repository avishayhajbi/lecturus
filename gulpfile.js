// "test": "gulp js-doc"
var gulp = require( './node_modules/gulp' );
var shell = require( './node_modules/gulp-shell' );
 
gulp.task( 'js-doc', shell.task( [
  '.\\node_modules\\.bin\\jsdoc .\\controllers .\\index.js --readme .\\README.md'
] ) );