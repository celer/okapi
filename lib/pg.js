var DAO = require('./dialect');
var util = require('util');
var pg = require('pg');
var async = require('async');


DAO.PGSQLDialect=function(options){
	DAO.SQLDialect.call(this);
	this.pgOptions = options;

	this.sql.alterTableColumnForeignKey="alter table <%tableName()%> add constraint fk_<%columnName%> foreign key (<%columnName%>) references <%column.ref.dao.tableName()%> (<%column.ref.column%>)";

}
util.inherits(DAO.PGSQLDialect, DAO.SQLDialect);


DAO.PGSQLDialect.prototype.escape=function(data,str,dao,column){

	data[column]=str;

	return "?"+column+"?";
}

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


DAO.PGSQLDialect.prototype.update=function(updater,onComplete){
	onComplete=onComplete||function(){};
	var self=this;

	var data={};

	var ci=0;

	var escape = function(str,dao,column){ 
		ci++;
		return self.escape(data,str,dao,column+ci);
	}

	var sql = this.buildUpdate(updater,escape);

	self.query(sql,data,function(err,res){
		if(err) return onComplete(err);
		if(!res) return onComplete(err,res);
		return onComplete(err,{ changedRows: res.rowCount } );
	});

}

DAO.PGSQLDialect.prototype.find=function(finder,onComplete){
	onComplete=onComplete||function(){};
	var self=this;

	var data = {};

	var ci=0;

	var escape = function(str,dao,column){
		ci++;
		return self.escape(data,str,dao,column+ci);
	}
	
	var tableAliases={};

	var sql = this.buildSelect(finder,escape,tableAliases);
	
	self.query(sql,data,function(err,res){
		if(err) return onComplete(err);
		if(res && res.rows){
			res = self.buildSelectResults(finder,res.rows,tableAliases);
		}
		return onComplete(err,res);
	});
}

DAO.PGSQLDialect.prototype.insert=function(inserter,onComplete){
	onComplete=onComplete||function(){};
	var sql = this.buildInsert(inserter,null);
	if(inserter.dao.pk()){
		sql+=" returning "+inserter.dao.pk();
	}
	this.query(sql,inserter.values,function(err,res){
		if(err) return onComplete(err);
		var vals = inserter.values;	
		if(res && res.rows && inserter.dao.pk() && res.rows[0][inserter.dao.pk()]){
			vals[inserter.dao.pk()]=res.rows[0][inserter.dao.pk()];
		} 

		return onComplete(err,vals);
	},inserter.dao);
}

DAO.PGSQLDialect.prototype.delete=function(deleter,onComplete){
	onComplete=onComplete||function(){};
	var data = {};
	var self=this;
	var ci=0;

	var escape = function(str,dao,column){
		ci++;
		return self.escape(data,str,dao,column+ci);
	}
	var sql = this.buildDelete(deleter,escape);
	var v = {};
	this.query(sql,data,function(err,res){
		if(err) return onComplete(err);
		return onComplete(err,v);
	},deleter.dao);
}

module.exports=DAO;
