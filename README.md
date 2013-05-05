Build Status: [![Build Status](https://travis-ci.org/celer/okapi.png)](https://travis-ci.org/celer/okapi)

Okapi is not an ORM
===================

Okapi aims at making SQL easier to use within Node.JS but isn't an ORM. 

Okapi: 
	
 * Doesn't do anything magical, it simply makes it easier to write SQL statements
 * Provides a single interface for Postgres, MySQL and SQLite
 * Works with regular JavaScript Objects - it purposefully doesn't provide any magical relationship mapping
 * Attempts to make it easy to write SQL when needed
 * Designed to work with async
 * Has an integrated assertion framework

```javascript

	Person = new Okapi.Object(dialect,"person");
	
	Person.column("id",{type: Okapi.ID });
	Person.column("name",{type: Okapi.String, unique: true});
	Person.column("email",{type: Okapi.String });

	Person.index("name_email",["name","email"]);

	async.serial([
	
		Person.createTable(),
	
		//Create a new person
		Person.insert({ name:"celer", email:"test@test.com"}).async(),

		//Return everything that has a name of celer
		Person.find({name:"celer"}).async(),
		
		//Return the item with an primary key of 1 (id=1)
		Person.find(1).async();

		//Find an individual using a more advanced query
		Person.find(function(q){
			q.or(function(q){
				q.eq("name","celer");
				q.eq("name","bob");
			});
		}).async(),

		//Use plain old SQL
		Person.sqlQuery("select * from person where name=?name?",{name:"celer"}).async(),


		
	]);
	
```

Now let's add a profile

```javascript

Profile = new Okapi.Object(dialect,"profile");

Profile.column("userId",{type:Okapi.IDRef, ref: { dao: Person, column: "id" }});
Profile.column("gender",{type:Okapi.String});


...
async.serial([

	//This will join across user and profile
	Profile.find({gender:"male"}).join(user,"userId").async(),

	//Or we could join from user:
	Person.find().join(Profile,"id",{gender:"male"}).async(),
	
]);


```

