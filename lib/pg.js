var DAO = require('./dialect');
var util = require('util');
var async = require('async');

var pg = null;

DAO.PGSQLDialect=function(options){
  DAO.SQLDialect.call(this,"pg");
  this.pgOptions = options;

  pg = require('pg');

  this.sql.alterTableColumnForeignKey="alter table <%tableName()%> add constraint fk_<%columnName%> foreign key (<%columnName%>) references <%column.ref.dao.tableName()%> (<%column.ref.column%>)";
   this.sql.insert="insert into <%tableName()%> (<%columns()%> <%columnExp()%>) values(<%values()%> <%valueExp()%>) <? returning <%pk()%> ?>";

}
util.inherits(DAO.PGSQLDialect, DAO.SQLDialect);


DAO.PGSQLDialect.prototype.prepareQuery=function(ret,sql,vals,dao){
  if(typeof vals=="function"){ 
    onComplete=vals;
    vals={};
  }
  

	var j = 0;

	var replaceFunc = function(str,p1){
		var v = vals[p1];
		if(typeof v!="undefined"){
			if(v instanceof Array){
				var m = [];
				v.map(function(k){
					j++;
					ret.push(k);
					m.push("$"+j);
				});
				return m.join(", ");
			} else {
				j++;
				ret.push(v);
				return "$"+j;			
			}
		} else return str;
	}

  sql = sql.replace(/\$([^?]+)\$/g,replaceFunc);
  sql = sql.replace(/\?([^?]+)\?/g,replaceFunc);
  return sql;
}

DAO.PGSQLDialect.prototype.doQuery=function(client,sql,ret,onComplete){
    this.logQuery(sql,ret);
    client.query(sql,ret,function(err,rows){
      return onComplete(err,rows);
    });  
}

DAO.PGSQLDialect.prototype.acquire=function(onAcquire){
  var self=this;
  pg.connect(self.pgOptions,function(err,client,done){
    if(err)
      return onAcquire(err);

      onAcquire(err,client,done);
  });
}

DAO.PGSQLDialect.prototype.query=function(sql,vals,onComplete,dao){
  if(typeof vals=="function"){ 
    dao=onComplete;
    onComplete=vals;
    vals={};
  }
  var self=this;
  
  if(dao && dao._conn){
      
      var ret = [];
      sql = self.prepareQuery(ret,sql,vals,dao);

      self.doQuery(dao._conn,sql,ret,function(err,res){
        dao._connStatements++;
        onComplete(err,res);
      });

  } else {
    pg.connect(self.pgOptions,function(err,client,done){
      if(err)
        return onComplete(err);

      var ret = [];
      sql = self.prepareQuery(ret,sql,vals,dao);

      self.doQuery(client,sql,ret,function(err,res){
        done();
        onComplete(err,res);
      });
    });
  }
}

DAO.PGSQLDialect.prototype.writeModifier=function(modifier,value){
  switch(modifier){
    case "autoKey":
      return "";
    default:
      return DAO.SQLDialect.prototype.writeModifier.call(this,modifier,value);
  } 
}

DAO.PGSQLDialect.prototype.writeType=function(column){
  var type = column.type;
  var sql="";


  switch(type){ 
    case DAO.ID: 
      sql+="serial";
    break;
    case DAO.Date:
      sql+="timestamp";
    break;
    case DAO.Boolean:
      sql+="smallint";
    break;
    default:
      sql = DAO.SQLDialect.prototype.writeType.call(this,column);
  }
  return sql;
}


DAO.PGSQLDialect.prototype.injectLastInsertID=function(obj,dao,err,res,onComplete){
    if(err && err.detail){
      var m = /Key\s+\(([^\s]+)\)=\([^\s]+\) already exists./gm.exec(err.detail);
      if(m && m[1]){
        return onComplete("Duplicate key:"+m[1]+" ;"+err.toString());
      }
    }
    if(err) return onComplete(err);
    if(res && res.rows && dao.pk() && res.rows[0] && res.rows[0][dao.pk()]){
      obj[dao.pk()]=res.rows[0][dao.pk()];
    } 
    return onComplete(err,obj);
}


DAO.PGSQLDialect.prototype.makeUpdateResult=function(err,res,onComplete){
  if(err) return onComplete(err);
  if(!res) return onComplete(err,res);
  return onComplete(err,{ changedRows: res.rowCount});
}


module.exports=DAO;
