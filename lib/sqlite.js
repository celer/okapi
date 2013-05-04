var DAO = require('./dialect');
var util = require('util');
var sqlite = require('sqlite3');
var async = require('async');


DAO.SQLiteDialect=function(db){
	DAO.SQLDialect.call(this);
	this.db=db;

	this.sql.alterTableColumnForeignKey=null;
	this.sql.alterTableColumnUniqueKey=null;
}
util.inherits(DAO.SQLiteDialect, DAO.SQLDialect);


DAO.SQLiteDialect.prototype.escape=function(data,str,dao,column){
	data[column]=str;
	return "?"+column+"?";
}


DAO.SQLiteDialect.prototype.query=function(sql,vals,onComplete,dao,type){
	if(typeof vals=="function"){ 
		dao=onComplete;
		onComplete=vals;
		vals={};
	}
	var ovals = {};
	sql = sql.replace(/\?([^?]+)\?/gm,function(str,p1){
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
	});
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


DAO.SQLiteDialect.prototype.update=function(updater,onComplete){
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
		return onComplete(err,{ changedRows: res.changes} );
	});

}

DAO.SQLiteDialect.prototype.find=function(finder,onComplete){
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
		if(res){
			res = self.buildSelectResults(finder,res,tableAliases);
			res.map(function(row){

				//Convert the dates for each object
				for(var obj in row){
					if(typeof row[obj]=="object"){
						for(var column in row[obj]){
							if(tableAliases[obj]){
								var dao = tableAliases[obj];
								if(dao.columns[column] && dao.columns[column].type==DAO.Date){
									var d = new Date(row[obj][column]);
									row[obj][column]=d;
								}
							}
						}
					} else {
						if(finder.dao.columns[obj] && finder.dao.columns[obj].type==DAO.Date){
							row[obj]=new Date(row[obj]);
						}
					}
				}



			});
		}
		return onComplete(err,res);
	},null,"select");
}

DAO.SQLiteDialect.prototype.delete=function(deleter,onComplete){
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
