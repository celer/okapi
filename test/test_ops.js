var Okapi = require('../index');
var assert = require('assert');
var async = require('async');
var fs = require('fs');
var path = require('path');

var testClone = function(dialect,onComplete){
  Okapi.Assert.reset();
    
  var vehicle = new Okapi.Object(dialect,"vehicle");

  vehicle.column("id",{type: Okapi.ID });
  vehicle.column("make",{ type:Okapi.String, notNull:true });
  vehicle.column("model",{ type:Okapi.String, notNull: true });
  vehicle.column("year",{ type:Okapi.Number });
  vehicle.column("mileage", { type: Okapi.Number });
  vehicle.column("transmission",{type:Okapi.String, values:["auto","manual"]});


  async.series([
    vehicle.dropTable().async(),
    vehicle.createTable().postCreateExp({ mysql: "ENGINE = MEMORY;" }).async(),
   
    vehicle.insert({ make:"Mazda", model:"Miata", year: 1993, mileage: 153032 }).async(),
    vehicle.insert({ make:"Ford", model:"F150", year: 2005, mileage: 34309 }).async(),
    vehicle.insert({ make:"Geo", model:"Metro", year: 1997  }).async(),
    
    vehicle.update({ make:null, id:0 }).assert("Errors on null sets for not null columns in an update",function(q){
      q.hasError("make is a required value");
    },true),
   
    vehicle.insert({ year:1990 }).assert("Errors on null sets for not null columns in an insert",function(q){
      q.hasError("make is a required value");
    },true),


    vehicle.find(function(q){
      q.like("make","Maz");
    }).assert("Finds mazda",function(q){
      q.containsRow({ make:"Mazda"});
      q.rowsReturned(1);
    }),

    vehicle.find(function(q){
      q.startsWith("make","Maz");
    }).assert("Finds mazda",function(q){
      q.containsRow({ make:"Mazda"});
      q.rowsReturned(1);
    }),
    
    vehicle.find(function(q){
      q.endsWith("make","azda");
    }).assert("Finds mazda",function(q){
      q.containsRow({ make:"Mazda"});
      q.rowsReturned(1);
    }),
    
    vehicle.find(function(q){
      q.not(function(q){
        q.like("make","Maz");
      });
    }).assert("Finds ford / geo",function(q){
      q.containsRow({ make:"Ford"});
      q.containsRow({ make:"Geo"});
      q.rowsReturned(2);
    }),
    
    vehicle.find(function(q){
      q.or(function(q){
        q.eq("make","Ford");
        q.eq("make","Geo");
      });  
    }).assert("Finds mazda",function(q){
      q.containsRow({ make:"Ford"});
      q.containsRow({ make:"Geo"});
      q.rowsReturned(2);
    }),

    vehicle.find(function(q){
      q.and(function(q){
        q.eq("make","Ford");
        q.eq("model","F150");
      });  
    }).assert("Finds F150",function(q){
      q.containsRow({ make:"Ford"});
      q.rowsReturned(1);
    }),
    
    
    vehicle.find(function(q){
      q.gte("year","1994");
    }).assert("Finds mazda",function(q){
      q.containsRow({ make:"Ford"});
      q.containsRow({ make:"Geo"});
      q.rowsReturned(2);
    }),

    function testFirst(done){
      vehicle.find(function(q){
        q.gte("year","1994");
      }).orderBy("year","asc").first(function(err, res){
        assert.equal(res.make,"Geo");
        done();
      });
    },

    function testLast(done){
      vehicle.find(function(q){
        q.gte("year","1994");
      }).orderBy("year","asc").last(function(err, res){
        assert.equal(res.make,"Ford");
        done();
      });
    },

    vehicle.find(function(q){
      q.isNull("mileage");
    }).assert("Is null works",function(q){
      q.containsRow({ make:"Geo"});
      q.rowsReturned(1);
    }),  

    vehicle.find(function(q){
      q.notNull("mileage");
    }).assert("Not null works",function(q){
      q.containsRow({ make:"Ford"});
      q.containsRow({ make:"Mazda"});
      q.rowsReturned(2);
    }),  

    function(done){
      if(dialect.type=="pg"){
        var soundexFile = path.resolve(__dirname,"soundex.sql");
        console.log(soundexFile);
        fs.readFile(soundexFile,function(err,data){
          data = data.toString();
            
          dialect.sqlQuery(data,{},function(err,res){
            console.log(err,res);          
						if(err){
							Okapi.Assert.results.fail++;
						}
            done(err,res);
          });
        });
      } else {
        done();
      }
    },


    vehicle.find(function(q){
      //Ideally you'd precompute the soundex for all the things you'd wanna match against
      q.soundex("make","Mazduh");
    }).assert("Soundex works",function(q){
      if(dialect.type!="sqlite"){
        q.rowsReturned(1);
        q.containsRow({ make:"Mazda"});
      } else {
        //sqlite doesn't contain soundex by default, it is compiled in
        q.hasError("no such function");
      }
    },true),
    
    vehicle.update({transmission:"auto"}).where().assert("Set valid value",function(q){
      q.contains({ changedRows:3 });
    }), 

    vehicle.update({transmission:"foo"}).where().assert("Invalid value",function(q){
      q.hasError("invalid value");
    },true), 

  ],function(err,res){

    var r = { type: dialect.type, pass: Okapi.Assert.results.pass, fail: Okapi.Assert.results.fail };
    return onComplete(null,r);
  });
}

module.exports=testClone;
