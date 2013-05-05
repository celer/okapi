var DAO = require('./dialect');
var util = require('util');
var mysql = require('mysql');
var async = require('async');


DAO.MySQLDialect=function(options){
	DAO.SQLDialect.call(this,"mysql");
	this.pool = mysql.createPool({ config: options, host:"localhost", user:"root", database:"dao"});
}
util.inherits(DAO.MySQLDialect, DAO.SQLDialect);


DAO.MySQLDialect.prototype.prepareQuery=function(conn,sql,vals,dao){
	if(typeof vals=="function"){ 
		onComplete=vals;
		vals={};
	}
		
	for(var i in vals){
		sql = sql.replace("?"+i+"?",conn.escape(vals[i]));
	}

	return sql;
}

DAO.MySQLDialect.prototype.doQuery=function(conn,sql,onComplete){
		this.logQuery(sql,{});
		conn.query(sql,function(err,rows){
			return onComplete(err,rows);
		});	
}

DAO.MySQLDialect.prototype.query=function(sql,vals,onComplete,dao){
	if(typeof vals=="function"){ 
		dao=onComplete;
		onComplete=vals;
		vals={};
	}
	var self=this;
	self.pool.getConnection(function(err,conn){
		if(err)
			return onComplete(err);

		sql = self.prepareQuery(conn,sql,vals,dao);

		self.doQuery(conn,sql,function(err,res){
			conn.end();
			onComplete(err,res);
		});

	});
}


DAO.MySQLDialect.prototype.writeType=function(column){
	var type = column.type;
	var sql="";

	switch(type){ 
		case DAO.ID: 
			sql+="bigint";
		break;
		case DAO.Date:
			sql+="datetime";
		break;
		default:
			sql = DAO.SQLDialect.prototype.writeType.call(this,column);
	}
	return sql;
}

DAO.MySQLDialect.prototype.buildInsertResult=function(inserter,err,res,onComplete){
		if(err) return onComplete(err);
		var vals = inserter.values;
		if(res && res.lastInsertId  && inserter.dao.pk()){
			vals[inserter.dao.pk()]=res.lastInsertId;
		} 
		return onComplete(err,vals);
}


DAO.MySQLDialect.prototype.buildUpdateResults=function(updater,err,res,onComplete){
	if(err) return onComplete(err);
	if(!res) return onComplete(err,res);
	return onComplete(err,{ changedRows: res.affectedRows });
}



module.exports=DAO;

