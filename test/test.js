var pjson = require('prettyjson');

var Okapi = require('../index');

Okapi.log=true;

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


optimist=optimist.describe("help","show help");
optimist=optimist.describe("config","load the specified config file");
optimist=optimist.describe("test","test file to run");
optimist=optimist.describe("db","the databases to test as a csv");

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

if(args.test && typeof args.test == "string"){
  tests.push(require(args.test));
} else {
  tests.push(require('./test_user'));
  tests.push(require('./test_basic'));
  tests.push(require('./test_clone'));
  tests.push(require('./test_join'));
  tests.push(require('./test_ops'));
  tests.push(require('./test_tx'));
  tests.push(require('./test_psql'));
}

var databases = {

  mysql:new Okapi.MySQLDialect({  host:"localhost", user:"root", database:"okapi" }),
  pg:new Okapi.PGSQLDialect({  host:"localhost", user:"postgres", database:"okapi"}),
  sqlite:new Okapi.SQLiteDialect(new sqlite.Database(":memory:")),
};

var testDB=[];

if(args.db && typeof args.db=="string" && args.db!="all"){
  var db = args.db.split(",");
  db = db.filter(function(f){ return f.trim(); });


  db.map(function(q){
    if(databases[q]){
      testDB.push(databases[q]);
    } else {
      console.log("Unrecognized database type: ",q,"supported types are:",Object.keys(databases).join(", "));
    }
  });  
  
} else {
  Object.keys(databases).map(function(q){
    testDB.push(databases[q]);
   });
}
        
var tp=0,tf=0;

async.mapSeries(tests,function(test,done){

  async.mapSeries(testDB,test,function(err,res){
    console.log("\n\n-------------------\t");
    if(err) { 
      console.log("Exited with error".red,err);
      process.exit(-1);
    } else {
      if(res){
        var p=0,f=0;
        var rs = {};
        res.map(function(r){
          rs[r.type]={ pass: r.pass, fail: r.fail };
          p+=r.pass;
          f+=r.fail;
          tp+=r.pass;
          tf+=r.fail;
        });
        console.log(pjson.render(rs));
        console.log();
        if(f>0){
          console.log(("Results: pass "+p+" fail "+f).red);
          process.exit(-1);
        } else {
          console.log(("Results: pass "+p+" fail "+f).green);
        }
      } else {
        console.log("No results were returned".red);
        process.exit(-1);
      }
      done();
    }

  });

},function(){
	console.log("\n\nFor all tests:");
  console.log("-----------------------------------");
  if(tf>0){
    console.log(("Results: pass "+tp+" fail "+tf).red);
    process.exit(-1);
  } else {
    console.log(("Results: pass "+tp+" fail "+tf).green);
  }
  process.exit(0);
});
