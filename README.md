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
 * Is well unit tested (click on the build status above for details)

## Getting Started

To get started with Okapi simply:

### 1 Install the npm module for the database of your choosing

MySQL
```shell
	npm install mysql
```

Postgres
```shell
	npm install pg
```

Sqlite
```shell
	npm install sqlite3
```
	
### 2 Install okapi

```shell
	npm install okapi
```

### 3 Create a dialect for the DB of your choosing

```javascript
var Okapi = require('okapi');

//For MySQL
var dialect = new Okapi.MySQLDialect({  host:"localhost", user:"root", database:"dao" });

//For Postgres
var dialect = new Okapi.PGSQLDialect({  host:"localhost", user:"postgres", database:"okapi", password:"" });

//For SQLite
var dialect = new Okapi.SQLiteDialect(new sqlite.Database(":memory:"));

```

## Using Okapi

### Defining Objects

To use Okapi first we need to define the schema for the object we want to use:

```javascript

	//Let's create a new person table, called 'person'
	Person = new Okapi.Object(dialect,"person");
	
	//Now let's add some columns
	Person.column("id",{type: Okapi.ID });
	Person.column("name",{type: Okapi.String, unique: true});
	Person.column("email",{type: Okapi.String });

	Profile = new Okapi.Object(dialect,"profile");

	//This column refers to the id column defined by Person above
	Profile.column("userId",{type:Okapi.IDRef, ref: { dao: Person, column: "id" }});
	Profile.column("gender",{type:Okapi.String});


```

#### Supported Types

 - Okapi.ID - denotes that the column is the primary id for the table
 - Okapu.IDRef - denotes a column that references another id in another table (may be null)
 - Okapi.String - a string column (short in length)
 - Okapi.Text - a text column (long in length)
 - Okapi.Number - a number column
 - Okapi.Float - a floating point column
 - Okapi.Boolean - a boolean column (1 or 0)
 - Okapi.Date - a date column
	
#### Column Modifiers 

 - type - one of the Okapi types defined above
 - pk (boolean) - this column is a primary key
 - unique (boolean) - this column is unique
 - notNull (boolean) - this column may not be null
 - default - the default value for this column
 - ref     - the information associated with this reference
  - ref.dao - the day this reference referes to 
  - ref.column - the column in the refered dao that joins to this one


#### Indexes

Okapi supports single and multi key indexes:

```javascript
	
	//And create an index on name
	Person.index("name",["name"]);

	//Create a unique index on name and email
	Person.index("name_email",["name","email"], { unique: true });

```

#### Creating and deleting tables

Okapi provides two functions for creating and deleting tables:

```javascript

	//Create a new table, if an onComplete function is provided then it will be called
	//otherwise createTable will return an anonymous function which expects onComplete
	//to be provided 
	Person.createTable([onComplete])

	Person.deleteTable([onComplete]);

```
Each one of these functions can utilize an lambda to be called when the function is invoked or
will return an anonymous function which can be utilized with async.

### Task Interface

Each one of the functions defined below provides a task interface, which uses function chaining
to make it easier to work with each of the functions. 

So for example, the onComplete function can be called to supply an anonymous function for retreiving results


```javascript

	//This will call the provided function when results are returned
	Person.find().onComplete(function(err,res){

	});

```

Or .async() can be called to return a function of the format function(onComplete) making the statement
easily usable with the async library, allowing these functions to be called serially

```javascript

	async.serial([
		
		Person.insert({ name:"name", email:"email"}).async(),
		Person.find().async(),

	],function(err,res){

	})

```

Some functions have other various methods that can be changed with them:

```javascript

	//Find a person whose name is bob, return only the first page, and order by name
	Person.find().where({ name:"bob"}).page(1).orderBy("name").function(err,res){

	});

```

### Where Queries

Anywhere a where block is specified a query can be specified as:

 * An object which implys that each column must match the suplied value
 * A lambda which can be used to construct a complex query
 * A string which will be matched against the primary key column

#### An object based query


```javascript
	// name="bob" and email="bob@bob.com"
	Person.find().where({ name:"bob", email:"bob@bob.com"}).async();

```

#### A Lambda based query

```javascript
	// name="bob" or email="bob@bob.com"
	Person.find().where(function(q){
		q.or(function(q){
			q.eq("name","bob");
			q.eq("email","bob@bob.com");
		});
	}).async();

```

#### A Primary Key based query

```javascript
	// id = 1
	Person.find().where(1).async();
```


### Inserting data

To insert data simply provide a javascript object with variables matching the names 
of the columns specified in the table definition. A new object with the id associated
with the object will be returned


```javascript

	Person.insert({name: "bob", email:"bob@bob.com").onComplete(function(err,res){
		console.log("The person was inserted!",res);
	});


```

### Upating data

The update function will use the provided data to update the rows
selected via the where query


```javascript

	Person.update({name:"bob"}).where({id:1}).onComplete(err,res){
		console.log(err,res);
	});	
	

```

### Delete data

```javascript

	Person.delete().where({name:"bob").async();
```


### Finding Data

```javascript
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

	
	//This will join across user and profile
	Profile.find({gender:"male"}).join(user,"userId").async(),

	//Or we could join from user:
	Person.find().join(Profile,"id",{gender:"male"}).async(),


```

