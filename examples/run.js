var pjson = require('prettyjson');

var Okapi = require('../index');

var optimist = require('optimist');

var sqlite = require('sqlite3');
require('../lib/assert')(Okapi);
var async = require('async');

var tests  = [];


var config={
  mysql:{
    host: "localhost",
    user: "root",
    database: "okapi"
  },
  pg:{
    host: "localhost",
    user: "postgres",
    database: "okapi"
  },
  sqlite:{
    database: ":memory:"
  }
}


Okapi.log=true;

optimist=optimist.describe("help","show help");
optimist=optimist.describe("config","load the specified config file");
optimist=optimist.describe("ex","example to run");
optimist=optimist.describe("db","the databases to test use");

var args = optimist.argv;

if(args.help){
  optimist.showHelp();
  process.exit(-3);
}

if(args.config){
  var fs = require('fs');
  var contents = fs.readFileSync(args.config);
  contents = JSON.parse(contents);
  for(var i in contents){
    config[i]=contents[i];
  }
}


var databases = {
  mysql:new Okapi.MySQLDialect({  host:"localhost", user:"root", database:"okapi" }),
  pg:new Okapi.PGSQLDialect({  host:"localhost", user:"postgres", database:"okapi"}),
  sqlite:new Okapi.SQLiteDialect(new sqlite.Database(":memory:")),
};

var path = require('path');

if(!args.ex || typeof args.ex!="string"){
  console.log("Please choose an example to run\n\n");

  optimist.showHelp();
  process.exit(-3);
}

if(!args.db|| typeof args.db!="string"){
  console.log("Please choose an db to use\n\n");

  optimist.showHelp();
  process.exit(-3);
}

var ex = require(path.resolve(__dirname,args.ex));

ex(databases[args.db],function(){
  console.log("Done");
  process.exit();
});  
        
