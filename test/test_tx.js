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
  
  async.series([
    vehicle.dropTable().async(),
    vehicle.createTable().async(),

    function(onComplete){
      Okapi.tx(dialect,function(err,tx){
        var v = tx.use(vehicle);  

        async.series([
          

          v.insert({ make:"make", model:"model"}).async(),

          v.update({ make:"make2", id: 0}).async(),

        ],function(err,res){
          tx.rollback(function(){


            async.series([

              v.find().assert("There is no data",function(q){
                q.rowsReturned(0);
              }),

            ],function(err,res){
                return onComplete(err,res);
            });
          });
        });
      });
    },
    function(onComplete){
      Okapi.tx(dialect,function(err,tx){
        var v = tx.use(vehicle);  

        async.series([
          

          v.insert({ make:"make", model:"model"}).async(),

          v.update({ make:"make2", id: 0}).async(),

        ],function(err,res){
          tx.commit(function(){

            async.series([

              v.find().assert("There is no data",function(q){
                q.rowsReturned(1);
              }),

            ],function(err,res){
                return onComplete(err,res);
            });
          });
        });
      });
    },
  ],function(err,res){
    var r = { type: dialect.type, pass: Okapi.Assert.results.pass, fail: Okapi.Assert.results.fail };
    return onComplete(null,r);
  });

}

module.exports=testClone;
