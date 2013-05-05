var DAO = require('./dialect');
var util = require('util');
var pg = require('pg');
var async = require('async');


DAO.PGSQLDialect=function(options){
	DAO.SQLDialect.call(this,"pg");
	this.pgOptions = options;

	this.sql.alterTableColumnForeignKey="alter table <%tableName()%> add constraint fk_<%columnName%> foreign key (<%columnName%>) references <%column.ref.dao.tableName()%> (<%column.ref.column%>)";
 	this.sql.insert="insert into <%tableName()%> (<%columns()%> <%column_exp()%>) values(<%values()%> <%value_exp()%>) <? returning <%pk()%> ?>";

}
util.inherits(DAO.PGSQLDialect, DAO.SQLDialect);


DAO.PGSQLDialect.prototype.prepareQuery=function(ret,sql,vals,dao){
	if(typeof vals=="function"){ 
		onComplete=vals;
		vals={};
	}
	var j = 0;
	for(var i in vals){
		if(vals[i] instanceof Array){ 
			var m = [];
			vals[i].map(function(k){ 
				m.push("$"+(j+1));
				ret.push(k);
				j++;
			});
			sql = sql.replace("?"+i+"?",m.join(", "),"gm");
		} else {
			var oldSQL = sql+"";
			sql = sql.replace("?"+i+"?","$"+(j+1),"gm");
			if(sql != oldSQL){
				ret.push(vals[i]);
				j++
			}
		}
	}

	return sql;
}

DAO.PGSQLDialect.prototype.doQuery=function(client,sql,ret,onComplete){
		this.logQuery(sql,ret);
		client.query(sql,ret,function(err,rows){
			return onComplete(err,rows);
		});	
}

DAO.PGSQLDialect.prototype.query=function(sql,vals,onComplete,dao){
	if(typeof vals=="function"){ 
		dao=onComplete;
		onComplete=vals;
		vals={};
	}
	var self=this;
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
	console.log(res);
	return onComplete(err,{ changedRows: res.rowCount});
}


module.exports=DAO;
