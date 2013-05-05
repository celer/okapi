var DAO = require('./dialect');
var util = require('util');
var async = require('async');

var mysql=null;

DAO.MySQLDialect=function(options){
	DAO.SQLDialect.call(this,"mysql");
	mysql = require('mysql');
	//this.pool = mysql.createPool({ config: options, host:"localhost", user:"root", database:"dao"});
	this.pool = mysql.createPool(options);
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


DAO.MySQLDialect.prototype.injectLastInsertID=function(obj,dao,err,res,onComplete){
		if(err && err.toString().indexOf("ER_DUP_ENTRY")!=-1){
			var m = /for key '([^\s]+)'/gm.exec(err.toString());
			if(m && m[1]){
				return onComplete("Duplicate key:"+m[1]+" ;"+err.toString());
			}
		}
		if(err) return onComplete(err);
		if(res && ( res.lastInsertId || res.insertId)  && dao.pk()){
			obj[dao.pk()]=(res.lastInsertId || res.insertId)
		} 
		return onComplete(err,obj);
}

DAO.MySQLDialect.prototype.makeUpdateResult=function(err,res,onComplete){
	if(err) return onComplete(err);
	if(!res) return onComplete(err,res);
	return onComplete(err,{ changedRows: res.affectedRows });
}




module.exports=DAO;

