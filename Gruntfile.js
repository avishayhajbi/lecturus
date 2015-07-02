require('./node_modules/jsdoc/jsdoc')
module.exports = function(grunt) {
	// 'use-strict'
    grunt.initConfig({
    	// pkg: grunt.file.readJSON('package.json'),
    	jsdoc : {
	        dist : {
	            src: ['controllers/*.js','index.js','README.md'],
	            options: {
	                destination: 'jsdoc',
	                template : "./node_modules/grunt-jsdoc/node_modules/ink-docstrap/template",
	                configure : "./node_modules/grunt-jsdoc/node_modules/ink-docstrap/template/jsdoc.conf.json"
	            }
	        }
	      }
    });

    // Call these here instead, where the variable grunt is defined.
    grunt.loadNpmTasks('grunt-jsdoc');

    grunt.registerTask('default', ['lint','test','jsdoc']);
};

