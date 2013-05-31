var Okapi = require('../index');
var assert = require('assert');
var async = require('async');
var fs = require('fs');

var testClone = function(dialect,onComplete){
  Okapi.Assert.reset();
    
  var vehicle = new Okapi.Object(dialect,"vehicle");

  vehicle.column("id",{type: Okapi.ID });
  vehicle.column("make",{ type:Okapi.String, notNull:true });
  vehicle.column("model",{ type:Okapi.String, notNull: true });
  vehicle.column("year",{ type:Okapi.Number });
  vehicle.column("mileage", { type: Okapi.Number });
  vehicle.column("transmission",{type:Okapi.String, values:["auto","manual"]});

	var insert = vehicle.insert({ make:"mazda", model:"Miata",year:Okapi.$("year") }).prepare();
	var find = vehicle.find(function(q){
		q.eqVar("make","make");
	}).prepare();

	var update = vehicle.update({ id: 0, make: Okapi.$("make")}).prepare();

	//FIXME this doesn't work
	//var upsert= vehicle.upsert({ id: Okapi.$("id"), make: Okapi.$("make"), model:"model"}).prepare();
	
	var upsert0= vehicle.upsert({ id: 0 , make: Okapi.$("make"), model:"model"}).prepare();
	
	var upsert1= vehicle.upsert({ id: 0 , make: Okapi.$("make"), model:"model"}).prepare();

	var del = vehicle.delete(function(q){
		q.eqVar("id","id");
	}).prepare();

  async.series([
    vehicle.dropTable().async(),
    vehicle.createTable().postCreateExp({ mysql: "ENGINE = MEMORY;" }).async(),
  
		insert.exec({ make:'ford', year:1997}), 
		find.exec({ make:"mazda"}),
		
		update.exec({ make:"Ford"}),
		
		upsert0.exec({ make:"Ford", id:0}),
		
		upsert1.exec({ make:"Ford", id:0}),

		del.exec({ id: 1 }),
	
  ],function(err,res){
		console.log(err,res);
    var r = { type: dialect.type, pass: Okapi.Assert.results.pass, fail: Okapi.Assert.results.fail };
    return onComplete(null,r);
  });
}

module.exports=testClone;
