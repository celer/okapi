var util=require('util');

var DAO=function(){

}

DAO.prototype.wrap=function(v,opts){
	
}

DAO.prototype.unwrap=function(v,opts){

}

DAO.Query=function(dao,sqlop,jsop){ 
	this.e=[];
	this.dao=dao;
	this.sqlop=sqlop||"and";
}

DAO.Query.prototype.and=function(onQuery){
	var q = new DAO.Query(this.dao,"and","&&");
	onQuery(q);
	this.e.push(q);
	return this;
}

DAO.Query.prototype.or=function(onQuery){
	var q = new DAO.Query(this.dao,"or","||");
	onQuery(q);
	this.e.push(q);
	return this;
}

DAO.Query.prototype.not=function(onQuery){
	var q = new DAO.Query(this.dao,"and","&&");
	this.sqlprefix="!";
	this.jsprefix="!";
	onQuery(q);
	this.e.push(q);
	return this;
}

DAO.Query.prototype.resolve=function(thing){
	if(typeof thing=="function"){
		thing(this);
	} else if(typeof thing=="object"){
		for(var i in thing){
			if(this.dao.columns[i]){
				this.eq(i,thing[i]);
			}
		}
	}	else if(thing!=undefined){
		var pk = this.dao.pk();
		this.eq(pk,thing);
	}	

}

DAO.Query.prototype.writeJS=function(){
	var js = (this.jsprefix||"")+"(";
	var ex = this.e.map(function(e){
		return e.write();
	});
	js+=ex.join(" "+this.jsop+" ");
	js+=")";
	return js;
}

DAO.Query.prototype.length = function(){
	return this.e.length;
}

DAO.Query.prototype.writeSQL=function(escape,opts){

	if(this.e.length==0) return "";

	var sql = (this.sqlprefix||"")+"(";
	var ex = this.e.map(function(e){
		return e.writeSQL(escape,opts);
	});
	sql+=ex.join(" "+this.sqlop+" ");
	sql+=")";
	return sql;
}


DAO.Expr=function(opts){
	for(var i in opts){
		this[i]=opts[i];
	}
}

DAO.Expr.prototype.writeJS=function(){
	if(!this.dao.containsColumn(this.column)) throw new Error("Invalid column "+this.column+" secified");
	if(this.numeric && !this.dao.columnIsNumeric(this.column)) throw new Error("Column "+this.column+" is not numeric");
	if(this.string && !this.dao.columnIsString(this.column)) throw new Error("Column "+this.column+" is not a string");
	var js = this.jsstatement || "#table.#column "+this.jsop+" #value";
	js=js.replace("#table",this.dao.tableName());
	js=js.replace("#column",this.column);
	js=js.replace("#value",this.value);
	return js;
}

DAO.Expr.prototype.writeSQL=function(escape,opts){
	opts=opts||{};
	if(!this.dao.containsColumn(this.column)) throw new Error("Invalid column "+this.column+" secified");
	if(this.numeric && !this.dao.columnIsNumeric(this.column)) throw new Error("Column "+this.column+" is not numeric");
	if(this.string && !this.dao.columnIsString(this.column)) throw new Error("Column "+this.column+" is not a string");
	var sql = this.sqlstatement || "#table.#column "+this.sqlop+" #value";
	sql=sql.replace("#table",(opts.tableName||this.dao.tableName()));
	sql=sql.replace("#column",this.column);
	sql=sql.replace("#value",escape(this.value,this.dao,this.column));
	return sql;
}

DAO.ops = { 
	lt: { 
		sqlop:"<",
		jsop:"<",
		numeric: true
	},
	lte:{
		sqlop:"<=",
		jsop:"<=",
		numeric: true
	},
	gt:{
		sqlop:">",
		jspop:">",
		numeric:true
	},
	gte:{
		sqlop:">=",
		jsop:">=",
		numeric:true
	},
	eq: { 
		sqlop:"=",
		jsop:"=="
	},
	ne: {
		sqlop:"!=",
		jsop:"!="
	},
	like: { 
		sqlop: "like",
		jsstatement: "(#table.#column.indexOf(#value)!=-1)",
		string: true
	},
	notNull: {
		jsstatement:"#table.#column!==null",
		sqlstatement: "#table.#column is not null"
	},
	isNull: {
		jsstatement:"#table.#column===null",
		sqlstatement: "#table.#column is null"
	},
	in: {
		jsstatement: "#value.indexOf(#table.#column)!=-1",
		sqlstatement: "#table.#column in (#value)"
	}
};

for(var opName in DAO.ops){ 
	var o = DAO.ops[opName];
	(function(opName,o){
		DAO.Expr[opName]=function(dao,column,value){
			DAO.Expr.call(this,{ dao: dao, sqlop:o.sqlop, jsop:o.jsop, numeric: o.numeric, string: o.string, column:column, value:value, sqlstatement: o.sqlstatement, jsstatement:o.jsstatement });
		}
		util.inherits(DAO.Expr[opName], DAO.Expr);


		DAO.Query.prototype[opName]=function(column,value){
			var expr = new DAO.Expr[opName](this.dao,column,value);
			this.e.push(expr);
			return this;
		}


	})(opName,o);
}



DAO.Type=function(type,opts){
	this.type=type;
	for(var i in opts){
		this[i]=opts[i];
	}
}


DAO.Type.prototype.toSQLValue=function(dao,input){
	if(dao.dialect[this.type].toSQLValue){
		return dao.dialect[this.type].toSQLValue(dao,input);
	}
	return input;
}

DAO.Type.prototype.fromSQLValue=function(dao,input){
	if(dao.dialect[this.type].fromSQLValue){
		return dao.dialect[this.type].fromSQLValue(dao,input);
	}
	return input;
}

DAO.String=new  DAO.Type("String",{ string:true });	
DAO.Text=new DAO.Type("Text",{ string:true }); 	
DAO.ID=new DAO.Type("ID",{ numeric:true, pk:true, notNull: true, autoKey: true}); 	
DAO.IDRef=new DAO.Type("IDRef",{ numeric:true }); 
DAO.Number=new DAO.Type("Number",{ numeric:true }); 
DAO.Float=new DAO.Type("Float",{ numeric:true }); 
DAO.Boolean=new DAO.Type("Boolean",{ numeric:true });
DAO.Date=new DAO.Type("Date",{numeric:true });


DAO.Object = function(dialect,tableName){
	this.dialect=dialect;
	this.columns={};
	this.indexes={};
	this.table=tableName;
}


DAO.Object.prototype.tableName=function(){
	return this.table;
}

DAO.Object.prototype.column=function(name,def){
	this.columns[name]=def;	
	return this.columns[name];
}


DAO.Object.prototype.index=function(name,columns,opts){
	this.indexes=this.indexes||{};
	if(! columns instanceof Array) 
		throw new Error("columns must be type of array");
	var self=this;
	columns.map(function(cn){
		if(self.columns[cn]==undefined)
			throw new Error("Invalid column specified in index");
	});	
	this.indexes[name]={ columns: columns, opts: opts||{} };
}

DAO.Object.prototype.containsColumn=function(column){
	return (typeof this.columns[column]!="undefined")
}

DAO.Object.prototype.columnIsString=function(column){
	return true;
}

DAO.Object.prototype.columnIsNumeric=function(column){
	return true;
}

DAO.Object.prototype.pk=function(){
	for(var i in this.columns){
		if(this.columns[i].type==DAO.ID) 
			return i;
	}
	for(var i in this.columns){
		if(this.columns[i].pk) 
			return i;
	}
}

DAO.Object.prototype.createTable=function(onComplete){
	return this.dialect.createTable(this,onComplete);
}

DAO.Object.prototype.dropTable=function(onComplete){
	return this.dialect.dropTable(this,onComplete)
}

DAO.Object.prototype.find=function(onQuery){
	return new DAO.Object.Finder(this,onQuery);
}

DAO.Object.prototype.update=function(values,onQuery){
	return new DAO.Object.Updater(this,values,onQuery);
}

DAO.Object.prototype.delete=function(values,onQuery){
	return new DAO.Object.Deleter(this,values,onQuery);
}

DAO.Object.prototype.insert=function(values){
	return new DAO.Object.Inserter(this,values);
}



/* --- Task --- */

DAO.Object.Task=function(dao){
	this.dao=dao
}

DAO.Object.Task.prototype.async=function(){
	var self = this;
	return function(input,onComplete){
		if(typeof input=="function"){
			onComplete=input;
		} 	
		self.onComplete(function(err,res){
			if(self.runAssertTasks){
				self.runAssertTasks(err,res);
			} 
			onComplete(err,res);
		});
	}
}

/* --- Where Task --- */

DAO.Object.WhereTask=function(dao){
	DAO.Object.Task.call(this,dao);
}
util.inherits(DAO.Object.WhereTask, DAO.Object.Task);

DAO.Object.WhereTask.prototype.where=function(onQuery){
	if(onQuery){
		this._where=this._where||[];
		var q = new DAO.Query(this.dao);
		this._where.push(q);
		q.resolve(onQuery);
	}
	return this;
}

DAO.Object.WhereTask.prototype.whereExp=function(exp,data){
	this._where_exp=exp;
	this._where_exp_data=data;
	return this;
}


/* --- Finder ---- */

DAO.Object.Finder=function(dao,onQuery){
	DAO.Object.WhereTask.call(this,dao);
	if(onQuery){
		this._where=[];
		this._where.push(new DAO.Query(dao));
		this._where[0].resolve(onQuery);
	}
	return this;
}
util.inherits(DAO.Object.Finder, DAO.Object.WhereTask);

DAO.Object.Finder.prototype.join=function(dao,by,query,opts){
	opts=opts||{};
	this._join=this._join||[];

	var q = new DAO.Query(dao);
	q.resolve(query);

	this._join.push({ dao: dao, by: by, query: q, type: opts.type || "inner", as: opts.as, on:opts.on});
	return this;
}

DAO.Object.Finder.prototype.orderBy=function(columns){
	this.orderBy=columns;
}

DAO.Object.Finder.prototype.page=function(number,pageSize){
	pageSize=pageSize||40;
	this.offset={ offset: number*pageSize, limit: pageSize };
}	

DAO.Object.Finder.prototype.onComplete=function(onComplete){
	this.dao.dialect.find(this,onComplete);
}

/* --- Updater --- */

DAO.Object.Updater=function(dao,values,onQuery){
	DAO.Object.WhereTask.call(this,dao);
	this.values=values;
	this._where=[];
	if(onQuery){
		this._where.push(new DAO.Query(dao));
		this._where[0].resolve(onQuery);
	} else {
		var pk = dao.pk();	
		if(values[pk]){
			var q = new DAO.Query(dao);
			q.eq(pk,values[pk]);
			this._where.push(q);		
			delete values[pk];
		}
	}
	return this;
}
util.inherits(DAO.Object.Updater, DAO.Object.WhereTask);

DAO.Object.Updater.prototype.onComplete=function(onComplete){
	this.dao.dialect.update(this,onComplete);
}

/* --- Inserter --- */

DAO.Object.Inserter=function(dao,values){
	DAO.Object.Task.call(this,dao);
	this.values=values;
	return this;
}
util.inherits(DAO.Object.Inserter, DAO.Object.Task);

DAO.Object.Inserter.prototype.onComplete=function(onComplete){
	this.dao.dialect.insert(this,onComplete);
}

/* --- Deleter --- */


DAO.Object.Deleter=function(dao,onQuery){
	DAO.Object.WhereTask.call(this,dao);
	if(onQuery){
		this.where=[];
		this.where.push(new DAO.Query(dao));
		this.where[0].resolve(onQuery);
	}
	return this;
}
util.inherits(DAO.Object.Deleter, DAO.Object.WhereTask);

DAO.Object.Deleter.prototype.onComplete=function(onComplete){
	this.dao.dialect.delete(this,onComplete);
}


module.exports=DAO;

