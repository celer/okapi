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


			person.insert({ name:"bob" }).assertContains({ name:"bob" }).async(),

			person.update({enabled:1 }).assertContains({ changedRows:1 }).async(),

			person.insert({ name:"wolf"}).assertContains({ name:"wolf"}).async(),
			person.insert({ name:"person1"}).assertContains({ name:"person1"}).async(),
			person.insert({ name:"person2"}).assertContains({ name:"person2"}).async(),
			person.insert({ name:"person3"}).assertContains({ name:"person3"}).async(),
			person.find({name:"bob"}).assertContainsRow({name:"bob"}).assertRowsReturned(1).async(),
			person.find(1).assertContainsRow({ name:"bob"}).async(),
			person.find(function(q){ 
				q.ne("name","wolf");
			}).assertContainsRow({ name:"bob"}).async(),
			person.update({ id: 1, name:"foo"}).assertContains({ changedRows: 1}).async(),
			person.update({enabled:0}).where({name: "foo"}).assertContains({ changedRows: 1}).async(),
			person.find({ id: 1 }).assertContainsRow({name:"foo", enabled:0 }).async(),
			person.find(function(q){ 
				//Do a find with no conditions
			}).assertContainsRow({ name:"foo" }).assertRowsReturned(5).async(),
			person.find(function(q){ 
				q.in("name",[ "bob","wolf","person1"]);
			}).assertContainsRow({ name:"person1" }).assertContainsRow({name:"wolf"}).assertRowsReturned(2).async(),
			
			person.find(function(q){ 
				q.in("name",[ "bob","wolf","person1"]);	
				q.or(function(q){
					q.eq("name","person1");
					q.eq("name","wolf");
				});
			}).assertContainsRow({ name:"person1" }).assertContainsRow({name:"wolf"}).assertRowsReturned(2).async(),
			
			person.find(function(q){ 
				q.lt("id",2);
			}).assertContainsRow({ name:"foo"}).assertRowsReturned(1).async(),
			person.find(function(q){ 
				q.lte("id",2);
			}).assertContainsRow({ name:"foo"}).assertRowsReturned(2).async(),
			person.update({ email:"test@foo.com"}).where({name:"wolf"}).assertContains({ changedRows:1 }).async(),
			person.find(function(q){
				q.notNull("email");
			}).assertContainsRow({ name:"wolf", email:"test@foo.com"}).async(),
			
			//Now let's create a profile
			profile.insert({ personId:1, gender: "male", birthdate: date1 }).assertContains({ gender:"male", birthdate: date1}).async(),
			profile.insert({ personId:2, gender: "female", birthdate: date2 }).assertContains({ gender:"female", birthdate: date2}).async(),

			//Now let's load a profile and make sure the dates are good
			profile.find().assertContainsRow({ gender:"male", birthdate: date1}).assertContainsRow({gender:"female",birthdate:date2}).async(),

			//Let's do an inner join and make sure we get the two profiles
			person.find().join(profile,"personId").assertContainsRow({ profile:{ gender:"male" }}).assertContainsRow({ profile:{ gender:"female"}}).assertRowsReturned(2).async(),
			person.find().join(profile).assertContainsRow({ profile:{ gender:"male" }}).assertContainsRow({ profile:{ gender:"female"}}).assertRowsReturned(2).async(),
			person.find().join(profile,"personId",{ gender:"male"}).assertContainsRow({ person: { id:1 }, profile:{ personId:1 }}).assertRowsReturned(1).async(),
			
			//Let's do an left join and make sure we get the two profiles
			person.find().join(profile,"personId",null,{ type: "left"}).assertContainsRow({ profile:null}).assertRowsReturned(5).async(),

			vehicle.insert({ ownerId:1, make:"Mazda", model:"Miata" }).assertContains({ model:"Miata"}).async(),
			vehicle.insert({ ownerId:1, make:"Ford", model:"F150" }).assertContains({ model:"F150"}).async(),
			vehicle.insert({ ownerId:1, make:"Aston Martin", model:"Lagonda" }).assertContains({ model:"Lagonda"}).async(),

			
			person.find().join(profile).join(vehicle,"driverId").assertRowsReturned(0).async(),
			
			person.find().join(profile,"personId").join(vehicle,"ownerId").assertContainsRow({ profile:{ gender:"male" }, vehicle: { model:"Miata" }}).assertRowsReturned(3).async(),
			
			vehicle.find().join(person,"driverId", null, { as: "driver", type: "left" }).join(person,"ownerId", null, { as:"owner"}).assertContainsRow({ owner:{ name:"foo" }, vehicle: { model:"Miata" }}).assertRowsReturned(3).async(),
			
			vehicle.find().join(person,"driverId", null, { as: "driver", type: "left" }).join(person,"ownerId", { name:"foo"}, { as:"owner"}).assertRowsReturned(3).async(),

			vehicle.find().join(person,"driverId", null, { as: "driver", type: "left" }).join(person,"ownerId", { name:"foo"}, { as:"owner"}).join(profile,"personId",null,{ as:"ownerProfile", on: "owner" }).assertRowsReturned(3).async(),


			//Test Where Exp
			vehicle.find().whereExp("model='Miata'").assertRowsReturned(1).assertContainsRow({ model:'Miata'}).async(),
			
			vehicle.find().whereExp("0=1").assertRowsReturned(0).async(),
			
			vehicle.find({make:"Jeep"}).whereExp(" and 0=1").assertRowsReturned(0).async(),
			
			vehicle.find().whereExp("model=?model?", { model: "Miata"} ).assertRowsReturned(1).assertContainsRow({ model:'Miata'}).async(),


			//Test Delete
			vehicle.find().assertRowsReturned(3).async(),

			vehicle.delete().where({model:"Lagonda"}).async(),
			
			vehicle.find().assertRowsReturned(2).async(),
			
			vehicle.delete().async(),
			
			vehicle.find().assertRowsReturned(0).async(),


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

