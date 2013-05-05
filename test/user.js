var DAO = require('../lib/dao');
var async = require('async');


var testUser = function(dialect,onComplete){
		DAO.Assert.reset();


		onComplete=onComplete||function(){};
	
		var person= new DAO.Object(dialect, "person");

		person.column("id",{type: DAO.ID });
		person.column("name",{type: DAO.String, unique: true });
		person.column("enabled", { type:DAO.Boolean, default: 1});
		person.column("email",{ type: DAO.String });

		person.index("email",["email"],{ unique: true });
		person.index("name_email",["name","email"]);

		var profile = new DAO.Object(dialect, "profile");

		profile.column("personId",{ type:DAO.IDRef, ref: { dao: person, column:"id"}, pk:true});
		profile.column("gender",{ type:DAO.String });
		profile.column("birthdate",{type:DAO.Date});

		var vehicle = new DAO.Object(dialect,"vehicle");

		vehicle.column("ownerId",{ type:DAO.IDRef, ref: { dao: person, column:"id"}});
		vehicle.column("driverId",{ type:DAO.IDRef, ref: { dao: person, column:"id"}});
		vehicle.column("make",{ type:DAO.String });
		vehicle.column("model",{ type:DAO.String });

		var date1 = new Date(1977,8,30, 5,5,5);
		var date2 = new Date(1970,1,3, 4,4,4);

		async.series([
			(vehicle.dropTable()),
			(profile.dropTable()),
			(person.dropTable()),
			(person.createTable()),
			(profile.createTable()),
			(vehicle.createTable()),


			person.insert({ name:"bob" }).contains({ name:"bob" }).async(),

			person.update({enabled:1 }).contains({ changedRows:1 }).async(),

			person.insert({ name:"wolf"}).contains({ name:"wolf"}).async(),
			person.insert({ name:"person1"}).contains({ name:"person1"}).async(),
			person.insert({ name:"person2"}).contains({ name:"person2"}).async(),
			person.insert({ name:"person3"}).contains({ name:"person3"}).async(),
			person.find({name:"bob"}).containsRow({name:"bob"}).rowsReturned(1).async(),
			person.find(1).containsRow({ name:"bob"}).async(),
			person.find(function(q){ 
				q.ne("name","wolf");
			}).containsRow({ name:"bob"}).async(),
			person.update({ id: 1, name:"foo"}).contains({ changedRows: 1}).async(),
			person.update({enabled:0}).where({name: "foo"}).contains({ changedRows: 1}).async(),
			person.find({ id: 1 }).containsRow({name:"foo", enabled:0 }).async(),
			person.find(function(q){ 
				//Do a find with no conditions
			}).containsRow({ name:"foo" }).rowsReturned(5).async(),
			person.find(function(q){ 
				q.in("name",[ "bob","wolf","person1"]);
			}).containsRow({ name:"person1" }).containsRow({name:"wolf"}).rowsReturned(2).async(),
			
			person.find(function(q){ 
				q.in("name",[ "bob","wolf","person1"]);	
				q.or(function(q){
					q.eq("name","person1");
					q.eq("name","wolf");
				});
			}).containsRow({ name:"person1" }).containsRow({name:"wolf"}).rowsReturned(2).async(),
			
			person.find(function(q){ 
				q.lt("id",2);
			}).containsRow({ name:"foo"}).rowsReturned(1).async(),
			person.find(function(q){ 
				q.lte("id",2);
			}).containsRow({ name:"foo"}).rowsReturned(2).async(),
			person.update({ email:"test@foo.com"}).where({name:"wolf"}).contains({ changedRows:1 }).async(),
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
			person.find().join(profile,"personId",null,{ type: "left"}).containsRow({ profile:null}).rowsReturned(5).async(),

			vehicle.insert({ ownerId:1, make:"Mazda", model:"Miata" }).contains({ model:"Miata"}).async(),
			vehicle.insert({ ownerId:1, make:"Ford", model:"F150" }).contains({ model:"F150"}).async(),
			vehicle.insert({ ownerId:1, make:"Aston Martin", model:"Lagonda" }).contains({ model:"Lagonda"}).async(),

			
			person.find().join(profile).join(vehicle,"driverId").rowsReturned(0).async(),
			
			person.find().join(profile,"personId").join(vehicle,"ownerId").containsRow({ profile:{ gender:"male" }, vehicle: { model:"Miata" }}).rowsReturned(3).async(),
			
			vehicle.find().join(person,"driverId", null, { as: "driver", type: "left" }).join(person,"ownerId", null, { as:"owner"}).containsRow({ owner:{ name:"foo" }, vehicle: { model:"Miata" }}).rowsReturned(3).async(),
			
			vehicle.find().join(person,"driverId", null, { as: "driver", type: "left" }).join(person,"ownerId", { name:"foo"}, { as:"owner"}).rowsReturned(3).async(),

			vehicle.find().join(person,"driverId", null, { as: "driver", type: "left" }).join(person,"ownerId", { name:"foo"}, { as:"owner"}).join(profile,"personId",null,{ as:"ownerProfile", on: "owner" }).rowsReturned(3).async(),

			vehicle.sqlQuery("update vehicle set model=?model1? where model=?model2?",{model1:'Miata', model2:'Miata'},"update").contains({changedRows:1}).async(),

			vehicle.sqlQuery("select * from vehicle",{},"select").rowsReturned(3).containsRow({ model:"Miata" }).async(),

			//Test Where Exp
			vehicle.find().whereExp("model='Miata'").rowsReturned(1).containsRow({ model:'Miata'}).async(),
			
			vehicle.find().whereExp("0=1").rowsReturned(0).async(),
			
			vehicle.find({make:"Jeep"}).whereExp(" and 0=1").rowsReturned(0).async(),
			
			vehicle.find().whereExp("model=?model?", { model: "Miata"} ).rowsReturned(1).containsRow({ model:'Miata'}).async(),


			//Test Delete
			vehicle.find().rowsReturned(3).async(),

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
											}),


			person.find().page(0,2).orderBy("name","desc").orderBy("email","desc").assert("Can use multiple order by's",function(q){
																																q.rowsReturned(2);
																														}),
			
			person.find().page(0,2).orderBy(["name","email"],"asc").assert("Paginates and Sorts",function(q){
																																q.rowsReturned(2)
																																q.lastRowContains({ name: "foo"})
																																q.firstRowContains({ name: "dennis"})
																														})


		],function(err,res){	
			if(err){
				console.error("Exited due to error".red,err);
				return onComplete(err);
			} else {
				var r = { type: dialect.type, pass: DAO.Assert.results.pass, fail: DAO.Assert.results.fail };
				return onComplete(null,r);
			}
		});

}

module.exports=testUser;

