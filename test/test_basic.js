var Okapi = require('../index');
var async = require('async');



var test_basic= function(dialect,onComplete){
    Okapi.Assert.reset();


    onComplete=onComplete||function(){};

    var table1 = new Okapi.Object(dialect,"table1");

    table1.column("cstring",{type: Okapi.String });
    table1.column("ctext",{type: Okapi.Text});
    table1.column("cnumber",{type: Okapi.Number});
    table1.column("cfloat",{type: Okapi.Float});
    table1.column("cboolean", { type: Okapi.Boolean});
    table1.column("cdate",{ type: Okapi.Date });


    var date1 = new Date();
    var date2 = new Date();
  
    date1.setMilliseconds(0);
    date2.setMilliseconds(0);


    var table2 = new Okapi.Object(dialect,"table2");


    table2.column("cstring2", { type: Okapi.String });


    async.series([  
      table1.dropTable().async(),
      table1.createTable().async(),        
      table2.createTable().async(),

      table1.insert({ cstring:"cstring", ctext:"ctext", cnumber:33, cfloat:33.44, cboolean:true, cdate: date1}).async(),
      table1.insert({ cstring:"cstring", ctext:"ctext", cnumber:43, cfloat:43.44, cboolean:false, cdate: date2}).async(),

      table1.find().assert("The various different values are supported",function(q){
        q.containsRow({ cstring:"cstring", ctext:"ctext", cnumber:33, cfloat:33.44, cboolean:true, cdate: date1});
        q.containsRow({ cstring:"cstring", ctext:"ctext", cnumber:43, cfloat:43.44, cboolean:false, cdate: date2});
      }),

      table1.update({ cstring:"cstring2"}).assert("Updates two rows",function(q){
        q.contains({ changedRows:2 });
      }),
      
      table1.insert({ cstring:null, ctext:null, cnumber:null, cfloat:null, cboolean:null, cdate: null}).async(),

      table1.find().assert("Row contains all nulls",function(q){
        q.containsRow({  cstring:null, ctext:null, cnumber:null, cfloat:null, cboolean:null, cdate: null });
      }),

  
      table2.update({ cstring2: "cstring2"}).async(),
      table2.insert({ cstring2: "cstring2"}).async(),

      /* 
          Join resolution
            -> a.join(b);
              -> a or b describes how to join to the other one
            -> a.join(b);  // table c describes the join
              -> a builds a list of all possible joins
              -> b builds a list of all possible joins
                -> finds common join in c?
              -> defaults to looking for a similar column name in each
            -> a.join(c,"id=userId",query,) // a.id = c.userId 

       */  


      //table1.find().join("cstring",table2,"cstring2").async(),
    
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

module.exports=test_basic;

