var DAO = require('./dao');
var util = require('util');
var async = require('async');


DAO.Dialect=function(type){
	this.type=type;
}

DAO.Dialect.prototype.find=function(finder,onComplete){

}

DAO.Dialect.prototype.update=function(updater,onComplete){

}

DAO.Dialect.prototype.insert=function(inserter,onComplete){

}

DAO.Dialect.prototype.delete=function(deleter,onComplete){

}

DAO.Dialect.prototype.createTable=function(dao,onComplete){

}

DAO.Dialect.prototype.dropTable=function(dao,onComplete){

}

DAO.Dialect.prototype.logQuery=function(query,params){
	console.log(query.cyan,params);
}	


/* -------------------------------------------------- */

DAO.SQLDialect=function(type){
	DAO.Dialect.call(this,type);

	this.sql={
		alterTableColumnForeignKey: "alter table <%tableName()%> add constraint foreign key fk_<%columnName%> (<%columnName%>) references <%column.ref.dao.tableName()%> (<%column.ref.column%>)",
		alterTableColumnUniqueKey: "alter table <%tableName()%> add constraint uc_<%columnName%> unique (<%columnName%>)",	
		createTable: "create table if not exists <%tableName()%> (\n<% eachColumn(function(columnName,column){ return '\\t'+columnName+' '+columnType(columnName)+' '+columnModifiers(columnName); },',\\n')%>"+
		"<?,\n<%eachColumn(function(name,column){ var c = columnUniqueConstraint(name); if(c) return '\\t'+c; },',\\n')%>?>"+
		"<?,\n<%eachColumn(function(name,column){ var c = columnFKConstraint(name); if(c) return '\\t'+c; },',\\n')%>?>"+
		//"<?,\n<%eachIndex(function(name){ var c = index(name); if(c) return '\\t'+c; },',\\n')%>?>"+
		"\n)",
		dropTable: "drop table if exists <%tableName()%>",
		fkColumn: "constraint fk_<%columnName%> foreign key (<%columnName%>) references <%column.ref.dao.tableName()%>(<%column.ref.column%>)",
		uniqueColumn: "unique(<%columnName%>)",
		index:"index idx_<%indexName%> (<% index.columns.join(',') %>)",
		createIndex:"create <%index.opts.unique?'unique':''%> index idx_<%indexName%> on <%tableName()%> (<% index.columns.join(',') %>)",
		insert:"insert into <%tableName()%> (<%columns()%> <%column_exp()%>) values(<%values()%> <%value_exp()%>)",
		update:"update <%tableName()%> set <%sets()%> <%set_exp()%> <? where <%where()%> <%where_exp()%> ?>",
		select:"select <%columns()%><%column_exp()%> from <%tableName()%> <%joins()%> <? where <%where()%><%where_exp()%>?><?order by <%orderBy()%> <%orderBy_exp()%>?><?limit <%limit()%> ?> <? offset <%offset()%> ?>",
		delete:"delete from <%tableName()%> <? where (<%where()%><%where_exp()%>) ?>"
	}


	

}
util.inherits(DAO.SQLDialect,DAO.Dialect);

DAO.SQLDialect.prototype.alterTableColumn=function(sql,dao,columnName,onComplete){

	var context = {
		dao: dao,
		tableName: function(){ return dao.tableName() },
		columnName: columnName,
		column: dao.columns[columnName]
	};
	sql = DAO.SQLDialect.resolveSQL(sql,context);

	if(onComplete){
		this.query(sql,{},onComplete);
	} else {
		var self=this;
		return function(input,onComplete){
			input=input||{};
			self.query(sql,input,onComplete||function(){});
		}
	}
}

DAO.SQLDialect.prototype.resolveQuery=function(sql,dao,context,onComplete){
	context=context||{};

	sql = DAO.SQLDialect.resolveSQL(sql,context,dao);

	if(onComplete){
		this.query(sql,{},onComplete);
	} else {
		var self=this;
		return function(onComplete){
			self.query(sql,{},onComplete||function(){});
		}
	}

}

DAO.SQLDialect.prototype.writeColumnFKConstraint=function(cn,column){
	if(column.ref){
		return DAO.SQLDialect.resolveSQL(this.sql.fkColumn,{ columnName: cn, column: column});
	} else return undefined;
}

DAO.SQLDialect.prototype.writeColumnUniqueConstraint=function(cn,column){
	if(column.unique){
		return DAO.SQLDialect.resolveSQL(this.sql.uniqueColumn,{ columnName: cn, column: column});
	} else return undefined;
}

DAO.SQLDialect.prototype.writeIndex=function(idxn,index){
	return DAO.SQLDialect.resolveSQL(this.sql.index,{ indexName: idxn, index: index});
}


DAO.SQLDialect.prototype.createTable=function(dao,onComplete){

	var self=this;
	var tasks=[];


	tasks.push(this.resolveQuery(this.sql.createTable,dao,{
			columnType: function(name){ return self.writeType(dao.columns[name]); },
			columnModifiers: function(name){ return self.writeModifiers(dao.columns[name]); },
			columnUniqueConstraint:function(name){ return self.writeColumnUniqueConstraint(name,dao.columns[name]);},
			columnFKConstraint:function(name){ return self.writeColumnFKConstraint(name,dao.columns[name]);},
			index:function(name){ return self.writeIndex(name,dao.indexes[name]); },
	}));

	for(var indexName in dao.indexes){
		var index = dao.indexes[indexName];

		tasks.push(this.resolveQuery(this.sql.createIndex,dao,{
			indexName: indexName,
			index: index,
		}));
	}
	

	if(onComplete){
		async.series(tasks,function(err,res){
			return onComplete(err,res);
		});
	} else {
		return function(onComplete){
			async.series(tasks,function(err,res){
				return onComplete && onComplete(err,res);
			});
		}
	}		
	
}

DAO.SQLDialect.prototype.dropTable=function(dao,onComplete){
	return this.resolveQuery(this.sql.dropTable,dao,{},onComplete);
}

DAO.SQLDialect.prototype.writeModifier=function(modifier,value){
	switch(modifier){
		case "pk":
			return "primary key";
		case "autoKey":
			return "auto_increment";
		case "notNull":
			return "not null";
		case "default":
			return "default "+value;
	}	
	return "";
}

DAO.SQLDialect.prototype.writeModifiers=function(column){
	var sql="";

	var modifiers = Object.keys(column).concat(Object.keys(column.type));

	var self = this;
		
	modifiers.map(function(modifier){
		var s = self.writeModifier(modifier,(column[modifier] || column.type[modifier]),column);
		if(s!=""){
			sql+=" "+s;
		}
	});	
	
	return sql;
}

DAO.SQLDialect.prototype.writeType=function(column){
	var type = column.type;
	var sql="";

	switch(type){ 
		case DAO.String:
			var length = column.length || type.length || 128;
			if(length<256){
				sql+="varchar("+length+")";
			} else {
				sql+="text";
			}
		break;
		case DAO.Text:
			sql+="text";	
		break;
		case DAO.IDRef:
			sql+="bigint";
		break;
		case DAO.Number:
			sql+="bigint";
		break;
		case DAO.Float:
			sql+="real";
		break;
		case DAO.Boolean:
			sql+="tinyint";
		break;
	}
	return sql;
}

DAO.SQLDialect.resolveConditionals=function(sql,context){
		sql = sql.replace(/\<\?([^?]+)\?\>/gm,function(str,p1){
			var opts = { resolved: 0 };
			p1 = DAO.SQLDialect.resolveEvals(p1,context,opts);
		
			if(opts.resolved>0){
				return p1
			}	else return "";

	},"gm");
	return sql;
}

DAO.SQLDialect.resolveEvals=function(sql,context,opts){
	opts=opts||{};
	opts.resolved=opts.resolved||0;
	sql= sql.replace(/\<\%([^%]+)\%\>/gm,function(str,p2){
			with(context){ 
				var s = eval(p2);
				if(s!="" && s){
					opts.resolved++; 
					return s;
				}
				return "";
			}
	});
	return sql;	
}

DAO.SQLDialect.resolveSQL=function(sql,context,dao){

	context.dao=dao||context.dao;
	context.tableName=context.tableName||function(){ return dao.tableName(); };
	
	context.eachIndex=function(onIndex,join){ return Object.keys(dao.indexes).map(function(indexName){ 
																												return onIndex.call(context,indexName,dao.indexes[indexName]);
																											}).filter(function(t){ 
																												return (t!="" && t!=undefined?t:undefined);
																											}).join(join||""); 
																						}

	context.eachColumn=function(onColumn,join){ return Object.keys(dao.columns).map(function(columnName){ 
																												return onColumn.call(context,columnName,dao.columns[columnName]);
																											}).filter(function(t){ 
																												return (t!="" && t!=undefined?t:undefined);
																											}).join(join||""); 
																						}

	sql = DAO.SQLDialect.resolveConditionals(sql,context);
	sql = DAO.SQLDialect.resolveEvals(sql,context);
	return sql;
}

DAO.SQLDialect.prototype.escape2=function(str,dao,column,data){
	var i = 0;

	//Find an unused named variable
	while(data[column+i]){ i++; };

	data[column+i]=str;

	str="?"+column+i+"?";

	return str;

}

DAO.SQLDialect.prototype.buildUpdate=function(updater,data){
	var self=this;

	var escape = function(str,dao,column){
		return self.escape2(str,dao,column,data);
	}

	var context = {
		dao: updater.dao,
		statement: updater,
		tableName: function(){ return updater.dao.tableName() },
		set:function(column) { return column+"="+escape(updater.values[column],updater.dao,column) },
		sets: function(){ return Object.keys(updater.values).map(function(column){ return context.set(column); }).join(", "); },
		where:function(){ 
			if(updater._where){
				var w= updater._where.map(function(w){
					return w.writeSQL(escape);
				});
			}
			return w;
		},
		set_exp: function() { return (updater._set_exp?updater._set_exp:""); },
		where_exp: function() { return (updater._where_exp?updater._where_exp:""); },
		//For insert
		columns: function(){ return Object.keys(updater.values).join(", "); },
		value: function(column){ return "?"+column+"?"; },
		values: function(){ return Object.keys(updater.values).map(function(column){ return context.value(column); }).join(", "); },
		value_exp: function() { return (updater._value_exp?updater._value_exp:""); },
		column_exp: function() { return (updater._column_exp?updater._column_exp:""); },
	}

	sql = DAO.SQLDialect.resolveSQL(this.sql.update,context);

	return sql;
}


DAO.SQLDialect.prototype.update=function(updater,onComplete){
	onComplete=onComplete||function(){};
	var self=this;

	var data={};

	var sql = this.buildUpdate(updater,data);

	self.query(sql,data,function(err,res){
		self.makeUpdateResult(err,res,onComplete);
	},updater.dao,"update");

}


DAO.SQLDialect.prototype.buildSelectResults=function(finder,res,tableAliases){
	if(finder._join && res){
		res = res.map(function(r){
			var obj = {};
			for(var i in r){
				if(typeof r[i]!="function"){
					var tc = i.split("_");
					var table = tc[0];
					var column = tc[1];
			
					obj[table]=obj[table]||{};
					obj[table][column]=r[i];	
				}
			}
			for(var j in obj){
				var pk = tableAliases[j] && tableAliases[j].pk();
				if(obj[j][pk]===null){
					obj[j]=null;
				}
			}
			return obj;
		});
	}
	return res;
}

DAO.SQLDialect.prototype.buildSelect=function(finder,data,tableAliases){
		var self=this;

		var escape = function(str,dao,column){
			return self.escape2(str,dao,column,data);
		}

		var context = {
			dao: finder.dao,
			statement: finder,
			tableName: function(){ return finder.dao.tableName() },
			set:function(column) { return column+"="+escape(finder.values[column],finder.dao,column) },
			sets: function(){ return Object.keys(finder.values).map(function(column){ return context.set(column); }).join(", "); },
			limit: function(){ return finder._limit; },
			offset: function(){ return finder._offset; },
			orderBy: function(){ 
				if(finder._orderBy instanceof Array){
					return finder._orderBy.map(function(obs){
						return (obs.column instanceof Array?obs.column.join(", "):obs.column)+" "+obs.order;
					}).join(", ");	
				}
			},
			orderBy_exp:function(){ return finder._orderBy_exp; },
			where:function(){ 
				if(finder._where){
					var w= finder._where.map(function(w){
						return w.writeSQL(escape);
					}).join(" and ");
				}
				return w;
			},
			set_exp: function() { return (finder._set_exp?finder._set_exp:""); },
			where_exp: function() { 
															var w=(finder._where_exp?finder._where_exp:""); 
															
															finder._where_exp_data && Object.keys(finder._where_exp_data).map(function(d){
																w = w.replace("?"+d+"?",escape(finder._where_exp_data[d],finder.dao,d))
															});		
															
															return w;
														},
			//For insert
			value: function(column){ return "?"+column+"?"; },
			values: function(){ return Object.keys(finder.values).map(function(column){ return context.value(column); }).join(", "); },
			value_exp: function() { return (finder._value_exp?finder._value_exp:""); },
			column_exp: function() { return (finder._column_exp?finder._column_exp:""); },
		}

		var columns=[];
	
		context.tables=tableAliases||{};
		
		context.tables[finder.dao.tableName()]=finder.dao;	
		for(var i in finder._join){
				var join = finder._join[i];

				if(join.as){ 
					context.tables[join.as]=join.dao;
				}
				context.tables[join.dao.tableName()]=join.dao;
				context.tables[finder.dao.tableName()]=finder.dao;
		}


		context.join=function(join,as){ 
			var sql="";
	
			if(typeof join=="string"){
				var joins = [];
				for(var i in finder._join){
					var join = finder._join[i];
					if(join.dao.tableName()==join){
						if(as){
							if(join.as==as){
								joins.push(join);
							}
						} else {
							joins.push(join);
						}
					}	
				}
				if(joins.length>0){
					throw new Error("Multiple possible join tables:",joins.map(function(j){ return j.dao.tableName(); }).join(","));
				}	else if(joins.length==1) {
					join = joins[0];
				} else {
					throw new Error("No matching join fround for table:"+join);
				}	

			}

			if(!join) return "";
				
			sql+=" "+join.type+" join "+(join.dao.tableName())+" "+(join.as?"as "+join.as:"")+" on (";
	
					
	
			var jcTableName = (join.as||join.dao.tableName());
			var fcTableName = (join.on||finder.dao.tableName());	
			

			var fc = join.dao.columns[join.by];
			var tc = finder.dao.columns[join.by];
			if(fc && fc.ref && fc.ref.column && fc.ref.dao == finder.dao){
				sql+=jcTableName+"."+join.by+"="+fcTableName+"."+fc.ref.column;
			} else if(tc && tc.ref  && tc.ref.column && tc.ref.dao==join.dao){
				sql+=fcTableName+"."+join.by+"="+(join.as||tc.ref.dao.tableName())+"."+tc.ref.column;
			}	else if(tc && fc){
				sql+=fcTableName+"."+join.by+"="+jcTableName+"."+join.by;
			} else {
				var found=false;
				var joinColumns=[];
				var daoColumns=[];
				for(var columnName in join.dao.columns){
					//Let's try to find a column!
					var column = join.dao.columns[columnName];
					if(column.ref && column.ref.column && column.ref.dao == finder.dao){ 
						joinColumns.push(columnName);
					}
				}
						
				if(joinColumns.length>1){ 
					throw new Error("Unable to resolve join, too many possible join columns: "+joinColumns.join(", ")+" on "+join.dao.tableName());
				} if(joinColumns.length==1){
					sql+=fcTableName+"."+join.dao.columns[joinColumns[0]].ref.column+"="+jcTableName+"."+joinColumns[0];
				} else {
					if(join.on && join.dao.columns[join.by] && join.dao.columns[join.by].ref){
						//It all goes out the window from here, at this point we just pray
						sql+=fcTableName+"."+join.dao.columns[join.by].ref.column+"="+jcTableName+"."+join.by;
					} else {
						throw new Error("Unable to resolve join by column:"+join.by+" on "+join.dao.tableName());
					}
				}
			} 	
			if(join.query.length()>0){
				sql+=" and "+join.query.writeSQL(escape, { tableName: (join.as||join.dao.tableName())});
			}


			sql+=")";
	
			return sql;	
		}

		context.joins=function(){
			var sql = "";
			for(var i in finder._join){
				var join = finder._join[i];
				sql+=context.join(join);
			}
			return sql;
		}

		context.columns=function(tableName, as){ 	
				var sql="";
				if(tableName){
					var dao = context.tables[tableName];
					var as = as || dao.tableName();	
					for(var column in dao.columns){
						if(finder._join){
							columns.push(as+"."+column+" as \""+as+"_"+column+"\"");
						} else {
							columns.push(column+" as \""+column+"\"");
						}
					}
					return columns.join(", ");
				} else {
					var joins=[];
					joins.push(context.columns(finder.dao.tableName()));
					for(var i in finder._join){
						var join = finder._join[i];
						joins.push(context.columns(join.dao.tableName(), join.as));
					}							
					return joins.join(", ");;
				}
		}
	
		sql = DAO.SQLDialect.resolveSQL(this.sql.select,context);
	
		return sql;
}

DAO.SQLDialect.prototype.sqlQuery=function(dao,sql,data,type,onComplete){
	var self=this;

	var context = {
		tableName: function(){ return dao.tableName(); },
		pk: function(){ return dao.pk(); },
		eachColumn:function(onColumn,join){ return Object.keys(dao.columns).map(function(columnName){ 
																												return onColumn.call(context,columnName,dao.columns[columnName]);
																											}).filter(function(t){ 
																												return (t!="" && t!=undefined?t:undefined);
																											}).join(join||""); 
																						}
	};

	data=data||{};
	

	if(typeof type=="function"){
		onComplete=type;
		type=null;	
	}

	if(typeof sql=="object"){ 
		if(sql[this.type]){
			sql = sql[this.type];
		} else {
			if(sql['*']){
				sql = sql['*'];
			} else {
				return onComplete("selected dialect '"+this.type+"' isn't supported");
			}
		}
	}
	var runQuery = function(onComplete){
		sql = DAO.SQLDialect.resolveSQL(sql,context);
		self.query(sql,data,function(err,res){
			switch(type){
				case "select":
					return self.selectRows(err,res,onComplete);	
				break;
				case "insert":	
					return self.injectLastInsertID(data,dao,err,res,onComplete);	
				break;
				case "update":
					return self.makeUpdateResult(err,res,onComplete);	
				break;
				default:
					return onComplete(err,res);
			}
		},dao,type);
	}

	if(onComplete) { 
		runQuery(onComplete);
	} else {
		return runQuery;
	}	
}

DAO.SQLDialect.prototype.selectRows=function(err,res,onComplete){
	var rows=null;
	if(err) return onComplete(err);
	if(res){
		if(res instanceof Array){
			rows = res;
		}
		if(res.rows instanceof Array){
			rows = res.rows;
		}		
	}
	return onComplete(null,rows);
}

DAO.SQLDialect.prototype.injectLastInsertID=function(vals,dao,err,res,onComplete){
	throw new Error("injectLastInsertID must be implemented");
}


DAO.SQLDialect.prototype.makeUpdateResult=function(err,res,onComplete){
	throw new Error("makeUpdateResult must be implemented");
}

DAO.SQLDialect.prototype.find=function(finder,onComplete){
	onComplete=onComplete||function(){};
	var self=this;

	var data = {};

	var tableAliases={};

	var sql = this.buildSelect(finder,data,tableAliases);

	
	self.query(sql,data,function(err,res){
		self.selectRows(err,res,function(err,rows){
			if(err) return onComplete(err);
			rows = self.buildSelectResults(finder,rows,tableAliases);
			return onComplete(null,rows);
		});
	},finder.dao,"select");
}


DAO.SQLDialect.prototype.buildInsert=function(inserter,data){
	
	var self=this;

	var escape = function(str,dao,column){
		return self.escape2(str,dao,column,data);
	}
	var context = {
		dao: inserter.dao,
		statement: inserter,
		tableName: function(){ return inserter.dao.tableName() },
		set:function(column) { return column+"="+escape(inserter.values[column],inserter.dao,column) },
		sets: function(){ return Object.keys(inserter.values).map(function(column){ return funcs.set(column); }).join(", "); },
		where:function(){ 
			if(inserter._where){
				var w= inserter._where.map(function(w){
					return w.writeSQL(escape);
				});
			}
			return w;
		},
		set_exp: function() { return (inserter._set_exp?inserter._set_exp:""); },
		where_exp: function() { return (inserter._where_exp?inserter._where_exp:""); },
		//For insert
		columns: function(){ return Object.keys(inserter.values).join(", "); },
		value: function(column){ return "?"+column+"?"; },
		values: function(){ return Object.keys(inserter.values).map(function(column){ return context.value(column); }).join(", "); },
		value_exp: function() { return (inserter._value_exp?inserter._value_exp:""); },
		column_exp: function() { return (inserter._column_exp?inserter._column_exp:""); },
		pk: function(){ return inserter.dao.pk()||""; }
	}


	sql = DAO.SQLDialect.resolveSQL(this.sql.insert,context);
	return sql;
}

DAO.SQLDialect.prototype.buildInsertResult=function(inserter,err,res,onComplete){
	if(err) return onComplete(err);
	var vals = inserter.values;
	if(res && inserter.dao.pk()){
		vals[inserter.dao.pk()]=(res.lastID | res.lastInsertId );
	}
	return onComplete(err,vals);
}

DAO.SQLDialect.prototype.insert=function(inserter,onComplete){
	onComplete=onComplete||function(){};
	var data={};
	var self=this;

	for(var i in inserter.values){
		data[i]=inserter.values[i];
	}

	var sql = this.buildInsert(inserter,data);
	this.query(sql,data,function(err,res){
		self.injectLastInsertID(inserter.values,inserter.dao,err,res,onComplete);
	},inserter.dao);
}

DAO.SQLDialect.prototype.buildDelete=function(deleter,data){
	var self=this;

	var escape = function(str,dao,column){
		return self.escape2(str,dao,column,data);
	}
	var context = {
		dao: deleter.dao,
		statement: deleter,
		tableName: function(){ return deleter.dao.tableName() },
		set:function(column) { return column+"="+escape(deleter.values[column],deleter.dao,column) },
		sets: function(){ return Object.keys(deleter.values).map(function(column){ return funcs.set(column); }).join(", "); },
		where:function(){ 
			if(deleter._where){

				var w= deleter._where.map(function(w){
					return w.writeSQL(escape);
				});
			}
			return w;
		},
		set_exp: function() { return (deleter._set_exp?deleter._set_exp:""); },
		where_exp: function() { return (deleter._where_exp?deleter._where_exp:""); },
		//For insert
		columns: function(){ return Object.keys(deleter.values).join(", "); },
		value: function(column){ return "?"+column+"?"; },
		values: function(){ return Object.keys(deleter.values).map(function(column){ return context.value(column); }).join(", "); },
		value_exp: function() { return (deleter._value_exp?deleter._value_exp:""); },
		column_exp: function() { return (deleter._column_exp?deleter._column_exp:""); },
	}


	sql = DAO.SQLDialect.resolveSQL(this.sql.delete,context);
	return sql;
}

DAO.SQLDialect.prototype.delete=function(deleter,onComplete){
	onComplete=onComplete||function(){};
	var data = {};
	var sql = this.buildDelete(deleter,data);
	var v = {};
	this.query(sql,data,function(err,res){
		if(err) return onComplete(err);
		return onComplete(err,v);
	},deleter.dao);
}

module.exports=DAO;

