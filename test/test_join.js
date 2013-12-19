var Okapi = require('../index');
var assert = require('assert');
var async = require('async');
var fs = require('fs');

var testClone = function(dialect,onComplete){
  Okapi.Assert.reset();
   
  var person = new Okapi.Object(dialect,"person");
  person.column("id",Okapi.ID);
  person.column("name",Okapi.String);
  person.column("test",Okapi.String);
  
  var profile = new Okapi.Object(dialect,"profile");
  profile.column("id",Okapi.ID);
  profile.column("userID",{ type: Okapi.IDRef, ref: { dao: person, column:"id"}});
  profile.column("email",Okapi.String);   
  
  var vehicle = new Okapi.Object(dialect,"vehicle");
  vehicle.column("id",Okapi.ID);
  vehicle.column("driverID",{ type: Okapi.IDRef, ref: { dao: person, column:"id"}});
  vehicle.column("ownerID",{ type: Okapi.IDRef, ref: { dao: person, column:"id"}});
  vehicle.column("validTo",Okapi.Date);

  var personFiltered=person.clone();
  personFiltered.filter({name: "b"});

  async.series([
      vehicle.dropTable().async(),
      profile.dropTable().async(),
      person.dropTable().async(),
      person.createTable().async(),
      profile.createTable().async(),
      vehicle.createTable().async(),
 
      person.insert({ name:"a", test:"a"}).async(),    
      profile.insert({ email:"a@a.com", userID: 1 }).async(),      
      
      person.insert({ name:"b", test:"b"}).async(),    
      profile.insert({ email:"b@a.com", userID: 2 }).async(),      

      person.insert({ name:"c", test:"c"}).async(),    
      profile.insert({ email:"b@c.com", userID: 3 }).async(),      
      
      vehicle.insert({ driverID: 1, ownerID: 2, validTo: new Date() }).async(),
      vehicle.insert({ driverID: 2, ownerID: 1, validTo: new Date() }).async(),

      profile.find().join(person).assert("Basic join works",function(q){
        q.rowsReturned(3);
      }),

      vehicle.find().columns("driverID","id").join("ownerID",person, { columns: ["test"] }).assert("Basic find/w column works",function(q){
        q.rowsReturned(2);
        q.containsExactRow({ person: { test: 'a' }, vehicle: { id: 2, driverID: 2 }});
      }),
      
      vehicle.find().columns("driverID","id").assert("Basic find/w column works",function(q){
        q.rowsReturned(2);
        q.containsExactRow({ id: 2, driverID: 2 });
      }),
   
      vehicle.find().join("ownerID",person,{name:"b"},{ as:"owner"}).join("driverID",person,{as:"driver"}).assert("Returns a single row",function(q){
        q.rowsReturned(1);
        q.containsRow({ driver: { name:"a"}, owner: { name:"b"}});
      }),
      
      vehicle.find().join("ownerID",person,{name:"b"},{ as:"owner"},profile,{as:"ownerProfile"}).join("driverID",person,{as:"driver"},profile, { as: "driverProfile"}).assert("Returns a single row",function(q){
        q.rowsReturned(1);
        q.containsRow({ driver: { name:"a"}, owner: { name:"b"}});
      }),

       
      person.find().join(profile).assert("Can do simple joins",function(q){
        q.rowsReturned(3);
        q.containsRow({ person: {id: 1}, profile:{ userID: 1}});
      }),
      
      profile.find().join(person).assert("Can do simple joins",function(q){
        q.rowsReturned(3);
        q.containsRow({ person: {id: 1}, profile:{ userID: 1}});
      }),


      person.find().join(vehicle,"ownerID",{ ownerID: 1}).assert("Join on a specific column works",function(q){
        q.rowsReturned(1);
        q.containsRow({ vehicle:{ ownerID: 1 }});
      }),

      person.find({id:3}).join(vehicle,"ownerID", { type: "left" }).assert("Join on a specific column works",function(q){
        q.rowsReturned(1);
        q.containsRow({ vehicle:null, person: { id: 3 } });
      }),

      person.find().async(),

      personFiltered.find().assert("Only returns 'b'",function(q){
        q.rowsReturned(1);
        q.containsRow({ name:'b'});
      }),

      vehicle.find().join(personFiltered).assert("Only returns 1 vehicle",function(q){
        q.rowsReturned(1);
        q.containsRow({ person: { name: "b"}});
      }),

  ],function(err,res){
      var r = { type: dialect.type, pass: Okapi.Assert.results.pass, fail: Okapi.Assert.results.fail };
      return onComplete(null,r);
  });  
  
}

module.exports=testClone;
