var Okapi = require('../index');
var async = require('async');


var testUser = function(dialect,onComplete){
    Okapi.Assert.reset();


    onComplete=onComplete||function(){};
  
    var person= new Okapi.Object(dialect, "person");

    person.column("id",{type: Okapi.ID });
    person.column("name",{type: Okapi.String, unique: true });
    person.column("enabled", { type:Okapi.Boolean, default: 1});
    person.column("email",{ type: Okapi.String });

    person.index("email",["email"],{ unique: true });
    person.index("name_email",["name","email"]);

    var profile = new Okapi.Object(dialect, "profile");

    profile.column("personId",{ type:Okapi.IDRef, ref: { dao: person, column:"id"}, pk:true});
    profile.column("gender",{ type:Okapi.String });
    profile.column("birthdate",{type:Okapi.Date});

    var vehicle = new Okapi.Object(dialect,"vehicle");

    vehicle.column("ownerId",{ type:Okapi.IDRef, ref: { dao: person, column:"id"}});
    vehicle.column("driverId",{ type:Okapi.IDRef, ref: { dao: person, column:"id"}});
    vehicle.column("make",{ type:Okapi.String });
    vehicle.column("model",{ type:Okapi.String });

    var date1 = new Date(1977,8,30, 5,5,5);
    var date2 = new Date(1970,1,3, 4,4,4);

    async.series([
      (vehicle.dropTable().async()),
      (profile.dropTable().async()),
      (person.dropTable().async()),
      (person.createTable().async()),
      (profile.createTable().async()),
      (vehicle.createTable().async()),


      person.insert({ name:"bob" }).assert("Basic inserts with strings work",function(q){ 
                    q.contains({ name:"bob" });
                  }),

      person.update({enabled:1 }).assert("Basic updates on all rows with numbers work",function(q){
                    q.contains({ changedRows:1 });
                  }),

      person.insert({ name:"wolf"}).assert("Inserts return the same values as input",function(q){
                    q.contains({ id:2, name:"wolf"});
                  }),

      person.insert({ name:"person1"}).async(),
      person.insert({ name:"person2"}).async(),
      person.insert({ name:"person3"}).async(),


      person.find({name:"bob"}).assert("We can find something we previously inserted",function(q){
                    q.containsRow({ id: 1, name:"bob"});
                    q.rowsReturned(1);
                  }),

      person.find(1).assert("We can find something by it's id",function(q){
                    q.containsRow({ id: 1, name:"bob"});
                    q.rowsReturned(1);
                  }),


      person.find(function(q){ 
        q.ne("name","wolf");
      }).assert("Not equal to operater works in queries",function(q){
                    q.containsRow({ name:"bob"});
                    q.lacksRow({ name:"wolf"});
                  }),

      person.update({ id: 1, name:"foo"}).assert("We can update something by utilizing it's ID and the columns to set",function(q){
                    q.contains({ changedRows: 1});
                  }),

      person.update({enabled:0}).where({name: "foo"}).assert("We can update a field in something using a conditional",function(q){
                    q.contains({ changedRows: 1});
                  }),
      
      person.update({enabled:1}).where({name: "foo"}).where({enabled:0}).assert("We can update a field in something using a conditional",function(q){
                    q.contains({ changedRows: 1});
                  }),
      
      person.update({enabled:1},function(q){
                    q.eq("name","foo");
                  }).assert("We can update a field in something using a conditional",function(q){
                    q.contains({ changedRows: 1});
                  }),
      
      person.update({email:'hello'}).setExp(", enabled=0").where(function(q){
                    q.eq("name","foo");
                  }).whereExp(" and 1=1").assert("We can update a field in something using a conditional",function(q){
                    q.contains({ changedRows: 1});
                  }),

      person.find({ email:"hello", enabled:false }).assert("Our update worked",function(q){
        q.containsRow({ name:"foo"});
      }),

      person.find({ id: 1 }).assert("Our two previous updates worked",function(q){
                    q.containsRow({name:"foo", enabled:false });
                  }),

      person.find(function(q){ }).assert("A find with no conditionals works",function(q){
                    q.containsRow({ name:"foo" });
                    q.rowsReturned(5)
                  }),

      person.find(function(q){ 
        q.in("name",[ "bob","wolf","person1"]);
      }).assert("A find with an 'in' conditional works",function(q){ q.containsRow({ name:"person1" }).containsRow({name:"wolf"}).rowsReturned(2); }),
      
      person.find(function(q){ 
        q.in("name",[ "bob","wolf","person1"]);  
        q.or(function(q){
          q.eq("name","person1");
          q.eq("name","wolf");
        });
      }).assert("A find with an 'in' and other conditionals works",function(q){ q.containsRow({ name:"person1" }).containsRow({name:"wolf"}).rowsReturned(2); }),
      
      person.find(function(q){ 
        q.lt("id",2);
      }).assert("A find with an 'lt' works",function(q) { q.containsRow({ name:"foo"}).rowsReturned(1); }),

      person.find(function(q){ 
        q.lte("id",2);
      }).assert("A find with an 'lte' works",function(q){ q.containsRow({ name:"foo"}).rowsReturned(2) }),


      person.update({ email:"test@foo.com"}).where({name:"wolf"}).assert("An update with a where condition works",function(q){ q.contains({ changedRows:1 }); }),

      person.find(function(q){
        q.notNull("email");
      }).containsRow({ name:"wolf", email:"test@foo.com"}).async(),
      
      //Now let's create a profile
      profile.insert({ personId:1, gender: "male", birthdate: date1 }).contains({ gender:"male", birthdate: date1}).async(),
      profile.insert({ personId:2, gender: "female", birthdate: date2 }).contains({ gender:"female", birthdate: date2}).async(),

      //Now let's load a profile and make sure the dates are good
      profile.find().containsRow({ gender:"male", birthdate: date1}).containsRow({gender:"female",birthdate:date2}).async(),

      //Let's do an inner join and make sure we get the two profiles
      person.find().join(profile,"personId").containsRow({ profile:{ gender:"male" }}).containsRow({ profile:{ gender:"female"}}).rowsReturned(2).async(),
      person.find().join(profile).containsRow({ profile:{ gender:"male" }}).containsRow({ profile:{ gender:"female"}}).rowsReturned(2).async(),
      person.find().join(profile,"personId",{ gender:"male"}).containsRow({ person: { id:1 }, profile:{ personId:1 }}).rowsReturned(1).async(),
      
      //Let's do an left join and make sure we get the two profiles
      person.find().join(profile,"personId",{ type: "left"}).containsRow({ profile:null}).rowsReturned(5).async(),

      vehicle.insert({ ownerId:1, make:"Mazda", model:"Miata" }).contains({ model:"Miata"}).async(),
      vehicle.insert({ ownerId:1, make:"Ford", model:"F150" }).contains({ model:"F150"}).async(),
      vehicle.insert({ ownerId:1, make:"Aston Martin", model:"Lagonda" }).contains({ model:"Lagonda"}).async(),

      
      person.find().join(profile).join(vehicle,"driverId").rowsReturned(0).async(),
      
      person.find().join(profile,"personId").join(vehicle,"ownerId").containsRow({ profile:{ gender:"male" }, vehicle: { model:"Miata" }}).rowsReturned(3).async(),
      
      vehicle.find().join("driverId", person, { as: "driver", type: "left" }).join("ownerId", person, { as:"owner"}).containsRow({ owner:{ name:"foo" }, vehicle: { model:"Miata" }}).rowsReturned(3).async(),
      
      vehicle.find().join("driverId", person,{ as: "driver", type: "left" }).join("ownerId", person, { name:"foo"}, { as:"owner"}).rowsReturned(3).async(),

      vehicle.find().join("driverId", person,{ as: "driver", type: "left" }).join("ownerId", person,{ name:"foo"}, { as:"owner"}, profile,{ as:"ownerProfile" }).rowsReturned(3).async(),

      vehicle.sqlQuery("update vehicle set model=?model1? where model=?model2?",{model1:'Miata', model2:'Miata'},"update").assert("Raw SQL Updates work",function(q){ 
                          q.contains({changedRows:1})
                        }),

      vehicle.sqlQuery("select * from vehicle",{},"select").assert("Raw SQL Queries work",function(q){
                          q.rowsReturned(3)
                          q.containsRow({ model:"Miata" })
                        }),

      //Test Where Exp
      vehicle.find().whereExp("model='Miata'").rowsReturned(1).containsRow({ model:'Miata'}).async(),
      
      vehicle.find().whereExp("0=1").assert("WhereExp works with a fixed phrase",function(q){ 
                          q.rowsReturned(0);
                        }),
      
      vehicle.find({make:"Jeep"}).where({model:"Cherokee"}).whereExp(" and 0=1").assert("WhereExp works with static string and a where clause",function(q){
                          q.rowsReturned(0);
                        }),
      
      vehicle.find().whereExp("model=?model?", { model: "Miata"} ).assert("WhereExp works with injected parameters",function(q){ 
                          q.rowsReturned(1)
                          q.containsRow({ model:'Miata'})
                        }),


      //Test Delete
      vehicle.find().assert("There are things to delete",function(q){
                          q.rowsReturned(3);
                        }),
      
      function(onComplete){
        dialect.sqlQuery("select * from vehicle where model=?model?",{model:'F150' },"select",function(err,res){
          console.log(err,res);
          return onComplete(err,res);
        });
      },

      vehicle.delete().where({model:"Lagonda"}).assert("Can delete specific rows using where clause",function(q){
                          q.noError();
                        }),
      
      vehicle.find().assert("Rows were returned",function(q){
                          q.rowsReturned(2);
                          q.columnOnlyContains("model","Miata","F150");
                        }),
      
      vehicle.delete().assert("Delete all works",function(q){
                          q.noError();  
                        }),
      
      vehicle.find().assert("Nothing is returned after a delete",function(q){
                                                                q.rowsReturned(0);
                                                            }),

      person.sqlQuery({ 
                          pg:"insert into <%tableName()%> (name,email) values(?name?,?email?) returning id",
                          '*':"insert into <%tableName()%> (name,email) values(?name?,?email?)"
                      },{name:'dennis', email:'email@email.com'},"insert").assert("Can use a regular SQL query with variables and mixins",function(q){
                                                                q.contains({id:6});
                                                            }),

      person.insert({ name: "dennis", email:"Foo@foo.com"}).assert("Returns one common duplicate key error",function(q){
                          q.hasError("Duplicate key:name");
                      },true),


      person.find().page(0).orderBy("name","desc").orderBy("email","desc").assert("Can use multiple order by's",function(q){
                                                                q.rowsReturned(6);
                                                            }),
      
      person.find().page(0).orderBy(["name","email"],"asc").assert("Paginates and Sorts",function(q){
                                                                q.rowsReturned(6)
                                                                q.lastRowContains({ name: "wolf"})
                                                                q.firstRowContains({ name: "dennis"})
                                                            }),
      
      person.find().limit(2).offset(0).orderBy(["name","email"],"asc").assert("Paginates and Sorts",function(q){
                                                                q.rowsReturned(2)
                                                                q.lastRowContains({ name: "foo"})
                                                                q.firstRowContains({ name: "dennis"})
                                                            }),
      
      person.find(1).columnExp({ sqlite:",date('now')", "*":",now()"}).assert("Can ask for an extra column",function(q){ 
                    q.rowsReturned(1);
                  }),

      //Upsert//
      person.insert({name:"bob2",email:"bob2"}).async(),
      person.upsert({id:10, name:"hello22"}).assert("We can upsert an existing row",function(q){
                    q.contains({ changedRows:1 });  
                  }),  
      person.upsert({id:12, name:"foo22"}).assert("We can upsert an new row",function(q){
                    q.contains({ changedRows:1 });  
                  }),


      person.find().async(),

      person.find(function(q){
        q.or(function(q){
          q.eq("id",10);
          q.eq("id",12);
        });
      }).assert("The two rows we just upserted are in the database",function(q){
        q.containsRow({ id: 10 });
        q.containsRow({ id: 12 });
      }),
  

    ],function(err,res){  
      if(err){
        console.error("Exited due to error".red,err);
        return onComplete(err);
      } else {
        var r = { type: dialect.type, pass: Okapi.Assert.results.pass, fail: Okapi.Assert.results.fail };
        return onComplete(null,r);
      }
    });

}

module.exports=testUser;

