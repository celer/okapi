var DAO = require("./dao.js");


DAO.tx=function(dialect,onTX){

  dialect.acquire(function(err,conn,done){
    if(err) return onTX(err);
  
    var objs = [];
  
    var tx = {
      use:function(obj){ 
        var d = obj.clone();
        d.useConnection(conn);
        objs.push(d);
        return d;  
      },
      begin:function(onComplete){
        dialect.beginTX(conn,function(err,res){
          return onComplete(err,res);
        });
      },
      commit:function(onComplete){
        dialect.commitTX(conn,function(err,res){
          done();  
          if(err) return onComplete(err);

          var res = {};
    
          objs.map(function(obj){
            res[obj.tableName()]=obj._connStatements;
          });
          
          return onComplete(err,res);
        });
      },
      rollback:function(onComplete){
        dialect.rollbackTX(conn,function(err,res){
          done();  
          return onComplete(err,res);
        });
      }
    }

    tx.begin(function(err){  
      if(err) return onTX(err);
      onTX(null,tx);  
    });

  });
}

module.exports=DAO;
