var pjson = require('prettyjson');

var DAO = require('../lib/mysql');
var DAO = require('../lib/pg');
var DAO = require('../lib/sqlite');

var sqlite = require('sqlite3');
require('../lib/assert')(DAO);
var async = require('async');

var testUser = require('./user');

var databases = [

	new DAO.MySQLDialect({  host:"localhost", user:"root", database:"dao", debug: true }),
	new DAO.PGSQLDialect({  host:"localhost", user:"celer", database:"dao", password:"foo", debug: true }),
	new DAO.SQLiteDialect(new sqlite.Database(":memory:")),

];

async.mapSeries(databases,testUser,function(err,res){
	console.log("\n\n-------------------\t");
	if(err) { 
		console.log("Exited with error".red,err);
		process.exit(-1);
	} else {
		if(res){
			var p=0,f=0;
			var rs = {};
			res.map(function(r){
				rs[r.type]={ pass: r.pass, fail: r.fail };
				p+=r.pass;
				f+=r.fail;
			});
			console.log(pjson.render(rs));
			console.log();
			if(f>0){
				console.log(("Results: pass "+p+" fail "+f).red);
				process.exit(-1);
			} else {
				console.log(("Results: pass "+p+" fail "+f).green);
				process.exit(0);
			}
		} else {
			console.log("No results were returned".red);
			process.exit(-1);
		}
	}

});
