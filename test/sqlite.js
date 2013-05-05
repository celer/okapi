var DAO = require('../lib/sqlite');
var sqlite = require('sqlite3');
require('../lib/assert')(DAO);
var async = require('async');

dialect = new DAO.SQLiteDialect(new sqlite.Database(":memory:"));

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

