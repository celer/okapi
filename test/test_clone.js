var Okapi = require('../index');
var assert = require('assert');
var async = require('async');

var testClone = function(dialect,onComplete){
  Okapi.Assert.reset();
    
  var vehicle = new Okapi.Object(dialect,"vehicle");

  vehicle.column("id",{type: Okapi.ID });
  vehicle.column("make",{ type:Okapi.String });
  vehicle.column("model",{ type:Okapi.String });

  /* 
    We will clone the object and make a new one
    that is limited to dealing only with mazda
  */
  var mazdaOnly = vehicle.clone();
  mazdaOnly.filter(function(q){
    q.eq("make","Mazda");
  });

  async.series([
    vehicle.dropTable().async(),
    vehicle.createTable().async(),
    
    vehicle.insert({ make:"Mazda", model:"Miata" }).async(),
    vehicle.insert({ make:"Ford", model:"F150" }).async(),
    vehicle.insert({ make:"Geo", model:"Metro" }).async(),

    vehicle.find().assert("All the vehicles are there",function(q){
      q.containsRow({ make:"Mazda", model:"Miata"});
      q.containsRow({ make:"Ford", model:"F150"});
      q.containsRow({ make:"Geo", model:"Metro"});
    }),  


    //Currently insert does not support filtering


    mazdaOnly.find().assert("Only contains mazda",function(q){
      q.containsRow({ make:"Mazda", model:"Miata"});
      q.rowsReturned(1);
    }),

    mazdaOnly.update({ model:"626"}).assert("Only updates mazda", function(q){
      q.contains({ changedRows: 1 });
    }),
    
    vehicle.find().assert("All the vehicles are there",function(q){
      q.containsRow({ make:"Mazda", model:"626"});
      q.containsRow({ make:"Ford", model:"F150"});
      q.containsRow({ make:"Geo", model:"Metro"});
    }),  

    mazdaOnly.delete({ model:"626"}).async(),
    
    vehicle.find().assert("All the vehicles are there",function(q){
      q.containsRow({ make:"Ford", model:"F150"});
      q.containsRow({ make:"Geo", model:"Metro"});
      q.rowsReturned(2);
    }),  
  
  ],function(err,res){

    var r = { type: dialect.type, pass: Okapi.Assert.results.pass, fail: Okapi.Assert.results.fail };
    return onComplete(null,r);
  });
}

module.exports=testClone;
