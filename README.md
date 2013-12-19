
![Okapi Logo](https://raw.github.com/celer/okapi/master/media/okapi.png)

[![Build Status](https://travis-ci.org/celer/okapi.png)](https://travis-ci.org/celer/okapi)
[![Depdendency Status](https://david-dm.org/celer/okapi.png)](https://david-dm.org/celer/okapi);

Okapi is not an ORM, it is better!
==================================

Okapi aims at making SQL easier to use within Node.JS but isn't an ORM. 

Okapi: 
  
 * Doesn't do anything magical, it simply makes it easier to write SQL statements
 * Provides a single interface for Postgres, MySQL and SQLite
  * It is super easy to support other databases with Okapi, look at lib/pg.js, lib/mysql.js, lib/sqlite.js to see how to implement a dialect
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

  Person.insert({ name:"Bob", email:"bob@bob.com"}).done(function(err,insertedPerson){
  
    console.log("I inserted this person",insertedPerson);
  
    Profile.insert({ userId: insertedPerson.id, gender:"male"}).done(function(err,profile){
  
      Person.find().join(Profile).done(function(err,results){
        console.log("I found these people",results);
      });

    });

  });



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

#### Calling methodology

Each statement within Okapi is chainable, and is designed to be utilized
with the standard callback method for node or with the popular async npm module. 

Here is now it would look if your not using async and works the same way
all the other callbacks in NodeJS work.

```javascript

  //This will return all people in the database
  Person.find().done(function(err,result){
    //Returns an array of people
  });

  // .last() and .each() are also available
  Person.find().first(function(err,firstPerson){
    //Returns the first result
  });
  
  //This will return the first 5 people
  Person.find().limit(5).offset(0).done(function(err,result){

  });
  
  Person.insert({ name: "Bob"}).done(function(err,result){
    //Returns the person object with the id of it in the object
  });
  
  Person.update({ id: 1, name: "Bob"}).done(function(err,result){
    //Returns the number of changed rows
  });

  Person.delete({ id:1 }).done(function(err,result){
    
  });

  
```

To make it easier to use with the async npm module you can alternatively return
a call back so that statements can be executed easily in series by using the .async()
method. This method will return a callback that works well with async.

```javascript

  async.series([
  
    //Each one of these statements will be called in sequence
    Person.insert({ name: "Bob"}).async(),
    Person.find().async(),
    Person.update({ id: 1, name: "Sally"}).async(),
    Person.delete({ id: 1 }).async()

  ],function(err,result){
    //This will be called when were done!
  });


```

Lastly you can also use Okapis native assertion framework, which 
was designed to work well with async. Too see how to use the
assertion framework in detail checkout the /test directory.

```javascript

  async.series([
  
    //Each one of these statements will be called in sequence and tested
    // against the assertions
    Person.insert({ name: "Bob"}).assert("A user was created",function(a){
      a.contains({ name: "Bob", id: 1 });
    }),
    
    Person.find().assert("The person we just created is in the database",function(a){
      a.containsRow({ name: "Bob", id: 1 });
      a.rowsReturned(1);
    }),

  ],function(err,result){
    //This will be called when were done!
  });


```

#### Getting to SQL!

First you can simply use SQL via your dialect, simply put '?' around the variables you want to 
substitute in the SQL statement, and then include the data in the second argument. 


The third argument tells Okapi to to prepare the data, simply specify 'select','update','insert' here. 

```javascript
  
  dialect.sqlQuery("select * from person where name=?name?",{name:"bob"},"select",function(err,results){

  });

  person.sqlQuery("select average(height) from person",{},function(err,result){

  });

  //You can also specify different SQL to use for different databases:
  dialect.sqlQuery({ sqlite: "select date('now')", mysql: "select now()", pg: "select now" },...);

```

Okapi crafts SQL statements by using a small template language, if you check out lib/dialect.js you'll see this list of templates. 

So for example the update statement looks like so:
```jsp
    update <%tableName()%> set <%sets()%> <%setExp()%> <? where <%where()%> <%whereExp()%> ?>
```

Okapi uses this statement to generate the update call and it can be overriden by the various database dialects (see lib/sqlite.js for an example), but it
also makes it easy to customize a statement in a way that is exteremly flexible. Anywhere within the SQL templates where something ends in 'Exp' such as 
whereExp() raw SQL can be inserted here. 

So for example, would insert the SQL statement below in the update. 
```javascript
  // update person set namesdx=soundex(name)
  Person.update().setExp("namesdx=soundex(name)").done(...);
```

While this is nice you can also use it to support multiple different databases at once, in the example
below we've inserted custom SQL for each one of the different databases we want to support.

```javascript
  Person.find().columnExp({ 
                            mysql:",TIMESTAMPDIFF(YEAR,birthdate,now()) as age",
                            pg:",date_part('year',age(now(),birthdate)) as age",
                            sqlite:",(?now?-birthdate)/(1000*3600*24*365) as age",
                          },{ now: Date.now() }
                          ).join(Profile).done(...);
```



#### Where Queries

Anywhere a where block is specified a query can be specified as:

 * An object which implys that each column must match the suplied value
 * A lambda which can be used to construct a complex query
 * A string which will be matched against the primary key column

#### An object based query


```javascript
  // name="bob" and email="bob@bob.com"
  Person.find().where({ name:"bob", email:"bob@bob.com"})...


```

#### A Lambda based query

```javascript
  // name="bob" or email="bob@bob.com"
  Person.find().where(function(q){
    q.and(function(q){
      q.eq("name","bob");
      q.eq("email","bob@bob.com");
    });
  }).async(),

  //Or
  Person.update({ name: "Elvis"}).where(function(q){
    q.not(function(q){
      q.or(function(q){
        q.like("name","The King");
        q.startsWith("name","The");
        q.endsWith("name","King");
      });
    });
  }).async(),

```

#### A Primary Key based query

```javascript
  // id = 1
  Person.find().where(1).async();
```

## Statements


### Creating and deleting tables

Okapi provides two functions for creating and deleting tables:

```javascript

  //We can drop and create a table like so:
  Person.dropTable().done(function(err,result){
    Person.createTable().done(function(err,result){

    });
  });

  //Or like so:
  Okapi.dropTables(Profile,Person,function(err,result){
  
    //Or like so:
    Okapi.createTables(Person,Profile,function(err,result){

    });

  });

```

Create Table template:
```jsp
    create table if not exists <%tableName()%> (
      <% eachColumn(function(columnName,column){ return '\\t'+columnName+' '+columnType(columnName)+' '+columnModifiers(columnName); },',\\n')%>
      <?,\n<%eachColumn(function(name,column){ var c = columnUniqueConstraint(name); if(c) return '\\t'+c; },',\\n')%>?>
      <?,\n<%eachColumn(function(name,column){ var c = columnFKConstraint(name); if(c) return '\\t'+c; },',\\n')%>?>
    <%createExp()%>) 
    <%postCreateExp()%>
```

This makes it easy to deal with MySQL specific table types!

```javascript
  Person.createTable().postCreateExp({mysql:"ENGINE=InnoDB"}).done(...);
```

### Inserting data

To insert data simply provide a javascript object with variables matching the names 
of the columns specified in the table definition. A new object with the id associated
with the object will be returned


```javascript

  Person.insert({name: "bob", email:"bob@bob.com").done(function(err,res){
    console.log("The person was inserted!",res);
  });


```

Insert template:
```jsp  
  insert into <%tableName()%> (<%columns()%> <%columnExp()%>) values(<%values()%> <%valueExp()%>)
```

### Upating data

The update function will use the provided data to update the rows
selected via the where query


```javascript
  //This will update the suplied data by using the primary key for the object, in this case it will use 'id'
  // update person set name='bob' where id=3
  Person.update({ name:"Bob", id:3 }).done(...)
      
  //You can also use a 'where' query to specify what to update
  // update person set name='bob' where email='bob@bob.com' 
  Person.update({name:"bob"}).where({email: 'bob@bob.com'}).done(err,res){
    console.log(err,res);
  });  
```

Update template:
```jsp  
    update <%tableName()%> set <%sets()%> <%setExp()%> <? where <%where()%> <%whereExp()%> ?>
```

### Upserts

Upserts are essentially statements that insert or update the row depending upon a primary key conflict. Essentially create or update a row, which is more efficient then
doing and individual insert and update. 

```javascript
  Person.upsert({ id: 1, name:"Bob"}).done(....);
```

Upsert templates:
  
```jsp
  //mysql
  insert into <%tableName()%> (<%columns()%> <%columnExp()%>) values(<%values()%> <%valueExp()%>) on duplicate key update <%sets({ noPK: true })%> <%setExp()%>
  //sqlite 
  insert or replace into <%tableName()%> (<%columns()%> <%columnExp()%>) values(<%values()%> <%valueExp()%>)
  //pg - update followed by insert
```

### Delete data

```javascript
  //Delete everything!
  // delete from person
  Person.delete().done(...);

  //Delete only some people
  // delete from person where name='bob'
  Person.delete().where({name:"bob").async();
```

Delete template:
```jsp
    delete from <%tableName()%> <? where (<%where()%><%whereExp()%>) ?>
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

  //This will perform a find and only return the specified columns
  Profile.find().columns("age","gender").async(),

  
  //This will join across user and profile
  Profile.find({gender:"male"}).join(user,"userId").async(),

  //Or we could join from user:
  Person.find().join(Profile,"id",{gender:"male"}).async(),

  //Get the first page of data
  Person.find().page(1).done(...)

  //Order the results  
  Person.find().orderBy("name","asc").done(...)

```

Select template:
```jsp
    select <%columns()%><%columnExp()%> from <%tableName()%> <%joins()%> <? where <%where()%><%whereExp()%>?><?order by <%orderBy()%> <%orderByExp()%>?><?limit <%limit()%> ?> <? offset <%offset()%> ?>
```

#### Joins

Okapi doesn't have an explicit understanding of relationships, hence why it is not an ORM! Instead it lets you join things:

```javascript
  //If it can figure out how to join things it will just do it (as an inner join)
  Person.find().join(Profile).done(...).done(...)

  //You can give it more details if it gets confused, the second paramter after the DAO being the column to use. 
  Person.find().join(Profile,"userId").done(...);

  //You can tell also give it a query to use for your join:
  Person.find().join(Profile,"userId",function(q){
    q.eq("gender","male");
  });

  //You can even tell it what type of join to use:
  Person.find().join(Profile,"userId",null,{ type:"left"}).done(...)
  
  //Or you can even tell it what columns to return:
  Person.find().join(Profile,"userId",null,{ columns:["age","gender"]}).done(...)

  //And suppose you have multiple joins on the same table:
  Vehicle.find().join(Person,"ownerId", null,{ type: "left, as:"owner"}).join(Person,"driverId",null,{type:"left",as:"driver"}).done(...)

	//Or you want to do a join across linked tables
  Vehicle.find().join("ownerID",person,{name:"b"},{ as:"owner"},profile,{as:"ownerProfile"}).join("driverID",person,{as:"driver"},profile, { as: "driverProfile"}).done(...)
```

The join function expects a sequence like so:

```javascript
	(dao,column?,query?,options?)*
```

Where the only required parameter is the DAO, and everything else is optional - Okapi will figure out the rest if it can. With the first DAO being 
implied by what it was chained upon, so for example:

```javascript
	Vehicle.find().join("ownerID",person,{name:"b"},{ as:"owner"},profile,{as:"ownerProfile"})
```

is interpreted as:

```javascript
	//inner join Vehicle.ownerId to
	join(Vehicle,"ownerID",null,null) 
	//inner join person (Okapi will resolve the correct id column) where name=="B" as "owner" to 
	join(person,null,{name:"b"},{as:"owner"})
	//inner join profile (Okapi will resolve the correct id column) as "ownerProfile"
	join(profile,null,null,{as:"ownerProfile"})
```

The options have two possible values:
	
 * options
  * as - what to name the resulting object
  * type - the type of join to do (left, inner, etc)

Joins may also use filtered DAOs as described below

### Transactions

```javascript
    Okapi.tx(dialect,function(err,tx){
      var v = tx.use(vehicle);  

      async.series([
        
        v.insert({ make:"make", model:"model"}).async(),

        v.update({ make:"make2", id: 0}).async(),

      ],function(err,res){
        if(err){
          tx.rollback(done);
        } else {
          tx.commit(done);
        }
      });
  });

```
### Filtered DAOs

So to make it easy for you to filter a DAO, for example to restrict a view you can simply clone an existing DAO an apply a filter, and these filtered DAOs will even retain their filtering in joins!

```javascript
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
    
	mazdaOnly.find().assert("Only contains mazda",function(q){
		q.containsRow({ make:"Mazda", model:"Miata"});
		q.rowsReturned(1);
	}),
```
### Prepared statements

For the most part Okapi constructs the statement or query at the time it is executed, but is possible to ask it to pre-construct a query that you want to run a bunch, allowing you
to overwrite variables as needed. 

```javascript
	//This will create a prepared insert statement with a variable 'year' that can be overridden as needed:
	var insert = vehicle.insert({ make:"mazda", model:"Miata",year:Okapi.$("year") }).prepare();

	insert.exec({year:1997},function(err,result){  ... }), 

	var find = vehicle.find(function(q){
		q.eqVar("make","make");
	}).prepare();

	find.exec({ make:"mazda"},function(err,result){ ... }),
```

The exec statements will return an async function if no call back is provided for use with the async module.

### Notes

We don't expect Okapi to solve every SQL problem, hence why we endorse dropping to SQL when you need it.


