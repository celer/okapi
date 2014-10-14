#!/usr/local/bin/env node

var sql=require("mssql");
// testing sql server drivers, node-mssql driver got the full ax due to requiring vc++ , this requires a windows box to use which seems like an unreasonable requirement to place on non-windows node projects that may need to talk to a ms sql server db.
// these experiments are using the mssql package - https://www.npmjs.org/package/mssql
var config = {
	user: "sa",
	password:process.argv[2] ,
	server: "10.0.1.172",
	database: "testSSDB",
	options: {
		encrypt: false // set to true for Azure according to https://www.npmjs.org/package/mssql
	}
}



var conn= new sql.Connection(config, function(err) {
	if(err) console.log(err);

	var req=new sql.Request(conn);
	req.query("select 1 as something", function(err,rs){
		if(err) console.log(err);
		console.dir(rs);
	});
});