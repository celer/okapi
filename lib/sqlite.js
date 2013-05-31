var DAO = require('./dialect');
var util = require('util');
var async = require('async');

var sqlite=null;

DAO.SQLiteDialect=function(db){
  DAO.SQLDialect.call(this,"sqlite");
  this.db=db;

  sqlite = require('sqlite3');
  
  this.sql.upsert="insert or replace into <%tableName()%> (<%columns()%> <%columnExp()%>) values(<%values()%> <%valueExp()%>)",

  this.sql.alterTableColumnForeignKey=null;
  this.sql.alterTableColumnUniqueKey=null;
}
util.inherits(DAO.SQLiteDialect, DAO.SQLDialect);

DAO.SQLiteDialect.prototype.acquire=function(onAcquire){
  onAcquire(null,null,function(){
    //TBD This may or may not work in the long run
  });
}

DAO.SQLiteDialect.prototype.query=function(sql,vals,onComplete,dao,type){
  if(typeof vals=="function"){ 
    dao=onComplete;
    onComplete=vals;
    vals={};
  }
  var ovals = {};

  var replaceFunc = function(str,p1){
    if(!(vals[p1] instanceof Array)){
      ovals["$"+p1]=vals[p1];  
      return " $"+p1+" ";
    } else {
      var s=[];
      for(var i in vals[p1]){
        ovals["$"+p1+"_"+i]=vals[p1][i];
        s.push(" $"+p1+"_"+i);
      }
      return s.join(",");
    }
  }
  sql = sql.replace(/\$([^?]+)\$/gm,replaceFunc);
  sql = sql.replace(/\?([^?]+)\?/gm,replaceFunc);


  this.logQuery(sql,ovals);
  if(type=="select"){
    this.db.all(sql,ovals,function(err,res){
      onComplete(err,res);
    });
  } else {
    this.db.run(sql,ovals,function(err,res){
      onComplete(err,this);
    });
  }

}

DAO.SQLiteDialect.prototype.writeModifier=function(modifier,value,column){
  switch(modifier){
    case "autoKey":
      return "autoincrement";
    case "notNull":
      if(column.autoKey || column.type.autoKey){
        return "";
      }   
      return "not null";
    default:
      return DAO.SQLDialect.prototype.writeModifier.call(this,modifier,value);
  } 
}

DAO.SQLiteDialect.prototype.writeType=function(column){
  var type = column.type;
  var sql="";


  switch(type){ 
    case DAO.ID: 
      sql+="integer";
    break;
    case DAO.Date:
      sql+="timestamp";
    break;
    default:
      sql = DAO.SQLDialect.prototype.writeType.call(this,column);
  }
  return sql;
}


DAO.SQLiteDialect.prototype.buildSelectResults=function(dao,res,tableAliases){
    var res = DAO.SQLDialect.prototype.buildSelectResults.call(this,dao,res,tableAliases);  
    res.map(function(row){
      //Convert the dates for each object
      for(var obj in row){
        if(typeof row[obj]=="object"){
          for(var column in row[obj]){
            if(tableAliases[obj]){
              var tdao = tableAliases[obj];
              if(tdao.columns[column] && tdao.columns[column].type==DAO.Date){
                var d = new Date(row[obj][column]);
                row[obj][column]=d;
              }
            }
          }
        } else {
          if(dao.columns[obj] && dao.columns[obj].type==DAO.Date){
            row[obj]=new Date(row[obj]);
          }
        }
      }
  });
  return res;
}

DAO.SQLiteDialect.prototype.injectLastInsertID=function(obj,dao,err,res,onComplete){
    if(err){
      var m = /column\s+([^\s]+)\s+is not unique/.exec(err.toString());
      if(m && m[1]){
        return onComplete("Duplicate key:"+m[1]+" ;"+err.toString());
      }
    }
    if(err) return onComplete(err);
    if(dao.pk()){
      obj[dao.pk()]=res.lastID;
    }
    return onComplete(err,obj);
}

DAO.SQLiteDialect.prototype.makeUpdateResult=function(err,res,onComplete){
  if(err) return onComplete(err);
  if(!res) return onComplete(err,res);
  return onComplete(err,{ changedRows: res.changes});
}


module.exports=DAO;
