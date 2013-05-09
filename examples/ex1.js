var Okapi = require('../index');

module.exports=function(dialect,onComplete){

  Person = new Okapi.Object(dialect,"person");
  
  //Now let's add some columns
  Person.column("id",Okapi.ID);
  Person.column("name",{type: Okapi.String, unique: true});
  Person.column("email",Okapi.String);

  Profile = new Okapi.Object(dialect,"profile");

  //This column refers to the id column defined by Person above
  Profile.column("userId",{type:Okapi.IDRef, ref: { dao: Person, column: "id" }});
  Profile.column("gender",Okapi.String);
  Profile.column("birthdate",Okapi.Date);

  var date = new Date(1975,1,1);

  
  Okapi.dropTables(Profile,Person,function(err,res){  
    Okapi.createTables(Person,Profile,function(){


      Person.insert({ name:"bob", email:"bob@bob.com"}).done(function(err,person){
        Profile.insert({ userId: person.id, gender:"male",birthdate: date}).done(function(err,profile){
      
          Person.find().join(Profile).done(function(err,res){

            console.log("I got the users", err,res);

            onComplete();
          });    

          
        });
      });  
    });
  });

}
