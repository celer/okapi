var DAO = require('./dialect');
var util = require('util');
var mysql = require('mysql');
var async = require('async');


DAO.MySQLDialect=function(options){
	DAO.SQLDialect.call(this);
	this.pool = mysql.createPool({ config: options, host:"localhost", user:"root", database:"dao"});
}
util.inherits(DAO.MySQLDialect, DAO.SQLDialect);


DAO.MySQLDialect.prototype.escape=function(conn,str,dao,column){
	return conn.escape(str);
}

DAO.MySQLDialect.prototype.prepareQuery=function(conn,sql,vals,dao){
	if(typeof vals=="function"){ 
		onComplete=vals;
		vals={};
	}
		
	for(var i in vals){
		sql = sql.replace("?"+i+"?",this.escape(conn,vals[i],dao,i));
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


DAO.MySQLDialect.prototype.insert=function(inserter,onComplete){
	onComplete=onComplete||function(){};
	var sql = this.buildInsert(inserter,null);
	this.query(sql,inserter.values,function(err,res){
		var vals = inserter.values;	
		if(err) return onComplete(err);
		if(res && res.lastInsertId  && inserter.dao.pk()){
			vals[inserter.dao.pk()]=res.lastInsertId;
		} 

		return onComplete(err,vals);
	},inserter.dao);
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

DAO.MySQLDialect.prototype.delete=function(deleter,onComplete){
	onComplete=onComplete||function(){};
	var self=this;
	self.pool.getConnection(function(err,conn){
		if(err) return onComplete(err);

		var escape = function(str,dao,column){ 
			return self.escape(conn,str,dao,column);
		}
	
		var sql = self.buildDelete(deleter,escape);

		sql = self.prepareQuery(conn,sql,{});

		self.doQuery(conn,sql,function(err,res){
			conn.end();
			
			return onComplete(err,res);

		});

	});
}


DAO.MySQLDialect.prototype.update=function(updater,onComplete){
	onComplete=onComplete||function(){};
	var self=this;
	self.pool.getConnection(function(err,conn){
		if(err) return onComplete(err);

		var escape = function(str,dao,column){ 
			return self.escape(conn,str,dao,column);
		}
	
		var sql = self.buildUpdate(updater,escape);

		sql = self.prepareQuery(conn,sql,{});

		self.doQuery(conn,sql,function(err,res){
			conn.end();
			
			return onComplete(err,{ changedRows: res.affectedRows });

		});

	});
}

DAO.MySQLDialect.prototype.find=function(finder,onComplete){
	onComplete=onComplete||function(){};
	var self=this;
	self.pool.getConnection(function(err,conn){

		var escape = function(str,dao,column){
			return self.escape(conn,str,dao,column);
		}

		var tableAliases={};
	
		var sql = self.buildSelect(finder,escape,tableAliases);
	
		var sql = self.prepareQuery(conn,sql,{});
		self.doQuery(conn, sql,function(err,res){
			conn.end();
			res = self.buildSelectResults(finder,res,tableAliases);
			return onComplete(err,res);
		});
	});
}


module.exports=DAO;

