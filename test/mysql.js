var DAO = require('../lib/mysql');
require('../lib/assert')(DAO);
var async = require('async');

dialect = new DAO.MySQLDialect({  host:"localhost", user:"root", database:"dao" });

var pjson = require('prettyjson');
var testUser = require('./user');
testUser(dialect,function(err,res){
	if(err) { 
		console.error("Error",err);
		process.exit(-1);
	} else {
		console.log(pjson.render(res));	
		if(res.fail>0){
			process.exit(-1);
		} else {
			process.exit(0);
		}
	}

});


