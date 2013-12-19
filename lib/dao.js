var util=require('util');
var async=require('async');

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
  this.sqlprefix="not";
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
      } else {
        throw new Error("No matching column '"+i+"' found in "+this.dao.table);
      }
    }
  }  else if(thing!=undefined){
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
  var self=this;
  if(!this.dao.containsColumn(this.column)) throw new Error("Invalid column "+this.column+" secified");
  if(this.numeric && !this.dao.columnIsNumeric(this.column)) throw new Error("Column "+this.column+" is not numeric");
  if(this.string && !this.dao.columnIsString(this.column)) throw new Error("Column "+this.column+" is not a string");
  var sql = this.sqlstatement || "#table.#column "+this.sqlop+" #value";
  sql=sql.replace("#table",(opts.tableName||this.dao.tableName()));
  sql=sql.replace("#column",this.column); 

	if(typeof this.variable=="undefined"){ 
    sql=sql.replace(/\#(%)?value(%)?/,function(str,d1,d2){
      var value = self.value;
      if(d1=='%')
        value=d1+value;
      if(d2=='%')
        value+=d2;
      return escape(value,self.dao,self.column);
    });
   } else {
    sql=sql.replace(/\#(%)?value(%)?/,"$"+this.variable+"$");
  }
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
  soundex: {
    string:true,
    sqlstatement: "soundex(#table.#column)=soundex(#value)",
  },
  endsWith: { 
    sqlstatement: "#table.#column like #%value",
    jsstatement: "(#table.#column.indexOf(#value)=(#table.#column.length-#value.length)",
    string: true
  },
  startsWith: { 
    sqlstatement: "#table.#column like #value%",
    jsstatement: "(#table.#column.indexOf(#value)==0)",
    string: true
  },
  like: { 
    sqlstatement: "#table.#column like #%value%",
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
    DAO.Expr[opName]=function(dao,column,value,variable){
      DAO.Expr.call(this,{ dao: dao, sqlop:o.sqlop, jsop:o.jsop, numeric: o.numeric, string: o.string, column:column, value:value, sqlstatement: o.sqlstatement, jsstatement:o.jsstatement, variable: variable });
    }
    util.inherits(DAO.Expr[opName], DAO.Expr);


    DAO.Query.prototype[opName]=function(column,value){
      var expr = new DAO.Expr[opName](this.dao,column,value);
      this.e.push(expr);
      return this;
    }
    
    DAO.Query.prototype[opName+"Var"]=function(column,variable){
      var expr = new DAO.Expr[opName](this.dao,column,null,variable);
      this.e.push(expr);
      return this;
    }


  })(opName,o);
}

DAO.Var=function(name){
	this.name=name;
}

DAO.Var.prototype.toString=function(){
	return this.name;
}

DAO.$=function(name){
	return new DAO.Var(name);
}

DAO.Type=function(type,opts){
  this.type=type;
  for(var i in opts){
    this[i]=opts[i];
  }
}

DAO.Type.prototype.validate=function(data,column){
  if((this.notNull || column.notNull) && !(this.autoKey || column.autoKey)){
    if(data===null || typeof data=="undefined"){
      return ":column is a required value";  
    }
  }

  if(data!=null && typeof data!="undefined" && (this.values || column.values)){
    var values = this.values || column.values;
    if(values.indexOf(data)==-1){
      return "invalid value for :column"; 
    }
  }

  return true;
}


DAO.Type.prototype.toSQLValue=function(input){
  return input;
}

DAO.Type.prototype.fromSQLValue=function(input){
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

DAO.Boolean.toSQLValue=function(input){
  if(input==null) return null;
  return (input===true||input===1||input?1:0);
}

DAO.Boolean.fromSQLValue=function(input){
  if(input==null) return null;
  return (input>=1?true:false);
}

DAO.Number.fromSQLValue=function(input){
  if(input==null) return null;
  if(typeof input=="string")
    return parseInt(input);
  return input;
}

DAO.Float.fromSQLValue=function(input){
  if(input==null) return null;
  if(typeof input=="string")
    return parseFloat(input);
  return input;
}

/* --- Object --- */


DAO.Object = function(dialect,tableName){
  this.dialect=dialect;
  this.columns={};
  this.indexes={};
  this.table=tableName;
}

DAO.Object.prototype.clone=function(){
  var object  = new DAO.Object(this.dialect,this.table);

  for(var i in this.columns){
    object.columns[i]=this.columns[i];
  }
  
  for(var i in this.index){
    object.indexes[i]=this.indexes[i];
  }

  object.root = this.root || this; 
 
  return object;
}

DAO.Object.prototype.filter=function(query,when){
  if(!this._where)
    this._where=[];  
  this._where.push({ query: query, when: when });
}

DAO.Object.prototype.getRootObject=function(){
  return this.root||this;
}


DAO.Object.prototype.sqlQuery=function(sql,data,type,onComplete){
  var self=this;

  if(typeof type=="function"){
    onComplete=type;
    type=null;  
  }

  return new DAO.Object.SQLQuery(this,sql,data,type,onComplete);
}

DAO.Object.prototype.fromSQLValue=function(object){
  for(var columnName in this.columns){
    var column = this.columns[columnName];
    if(typeof object[columnName]!="undefined" && object[columnName]!==null){
      object[columnName] = column.type.fromSQLValue(object[columnName]);
    }
  }
  return object;
}


DAO.Object.prototype.tableName=function(){
  return this.table;
}

DAO.Object.prototype.column=function(name,def){
  if(def instanceof DAO.Type){
    this.columns[name]={ type: def };  
  } else {
    this.columns[name]=def;  
  }
    
  if(!this.columns[name].type){
    throw new Error("'type' is a required property");
  }

  var modifiers = ["pk","notNull","default","unique","type","autoKey","ref","values"];
  for(i in this.columns[name]){
    if(modifiers.indexOf(i)==-1){  
      throw new Error("Unknown column modifier '"+i+"' valid modifiers are:"+modifiers.join(", "));
    } 
  }


  return this.columns[name];
}

DAO.Object.prototype.useConnection=function(conn){
  this._conn=conn;
  this._connStatements=0;
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
  return (this.columns[column].type.string==true);
}

DAO.Object.prototype.columnIsNumeric=function(column){
  return (this.columns[column].type.numeric==true);
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

DAO.Object.prototype.createTable=function(){
  return new DAO.Object.CreateTable(this);
}

DAO.Object.prototype.dropTable=function(){
  return new DAO.Object.DropTable(this);
}

DAO.Object.prototype.getFilters=function(when){
  var filters=[];
  if(this._where){
    this._where.map(function(where){
      if(where.when == when || where.when==undefined){
        filters.push(where.query);
      }
    });
  }
  return filters;
}

DAO.Object.prototype.find=function(onQuery){
  var find = new DAO.Object.Finder(this,onQuery);

  if(this._where){
    this._where.map(function(where){
      if(where.when == "find" || where.when==undefined){
        find.where(where.query);
      }
    });
  }


  return find;
}

DAO.Object.prototype.update=function(values,onQuery){
  var update = new DAO.Object.Updater(this,values,onQuery);
  
  if(this._where){
    this._where.map(function(where){
      if(where.when == "update" || where.when==undefined){
        update.where(where.query);
      }
    });
  }


  return update;
}

DAO.Object.prototype.delete=function(values,onQuery){
  var del = new DAO.Object.Deleter(this,values,onQuery);

  
  if(this._where){
    this._where.map(function(where){
      if(where.when == "delete" || where.when==undefined){
        del.where(where.query);
      }
    });
  }


  return del;
}

DAO.Object.prototype.insert=function(values){
  return new DAO.Object.Inserter(this,values);
}

DAO.Object.prototype.upsert=function(values){
  return new DAO.Object.Upserter(this,values);
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

DAO.Object.Task.prototype.done=function(onComplete){
  this.onComplete(onComplete);
}

DAO.Object.Task.prototype.prepare=function(){
  if(this._what && this.dao.dialect["compile"+this._what] && this.dao.dialect["do"+this._what]){
    var psql = {};
    var self = this;

    psql.sql = this.dao.dialect["compile"+this._what](this);
		psql.dao = this.dao;

    psql.exec=function(input,onComplete){    
			for(var i in input){
					psql.sql.data[i]=input[i];
			}
		
			if(onComplete){
	      self.dao.dialect["do"+self._what](psql.sql.sql,psql.sql.data,psql.dao,onComplete); 
			} else { 
				return function(onComplete){
	      	self.dao.dialect["do"+self._what](psql.sql.sql,psql.sql.data,psql.dao,onComplete); 
				}
			}
    }

    return psql;

  } else {
    throw new Error("This statement type does not support compilation");
  }
} 

/* --- Create Table --- */

DAO.Object.CreateTable=function(dao){
  DAO.Object.Task.call(this,dao);
  return this;
}
util.inherits(DAO.Object.CreateTable, DAO.Object.Task);

DAO.Object.CreateTable.prototype.createExp=function(sql,data){
  this._createExp={ sql: sql, data: data };
  return this;
}

DAO.Object.CreateTable.prototype.postCreateExp=function(sql,data){
  this._postCreateExp={ sql: sql, data: data };
  return this;
}

DAO.Object.CreateTable.prototype.onComplete=function(onComplete){
  this.dao.dialect.createTable(this,onComplete);
  return this;
}

/* --- Drop Table --- */

DAO.Object.DropTable=function(dao){
  DAO.Object.Task.call(this,dao);
  return this;
}
util.inherits(DAO.Object.DropTable, DAO.Object.Task);

DAO.Object.DropTable.prototype.onComplete=function(onComplete){
  this.dao.dialect.dropTable(this,onComplete);
  return this;
}

/* -- SQL Query --- */

DAO.Object.SQLQuery=function(dao,sql,data,type){
  DAO.Object.Task.call(this,dao);
  this.sql=sql;
  this.data=data;
  this.type=type;
  return this;
}
util.inherits(DAO.Object.SQLQuery, DAO.Object.Task);

DAO.Object.SQLQuery.prototype.onComplete=function(onComplete){
  this.dao.dialect.sqlQuery(this.sql,this.data,this.type,onComplete,this.dao);
  return this;
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

DAO.Object.WhereTask.prototype.whereExp=function(sql,data){
  this._whereExp={sql:sql, data:data};
  return this;
}


/* --- Finder ---- */

DAO.Object.Finder=function(dao,onQuery){
  DAO.Object.WhereTask.call(this,dao);
	this._what="Select";
  if(onQuery){
    this.where(onQuery);
  }
  return this;
}
util.inherits(DAO.Object.Finder, DAO.Object.WhereTask);

DAO.Object.Finder.prototype.join=function(){
  this._join=this._join||[];
  /*
  opts=opts||{};

  var q = new DAO.Query(dao);
  q.resolve(query);

  this._join.push({ dao: dao, by: by, query: q, type: opts.type || "inner", as: opts.as, on:opts.on});*/
  this._join.push(arguments);
  return this;
}

DAO.Object.Finder.prototype.columns=function(){
  this._columns = Array.prototype.slice.call(arguments);
  return this;
} 

DAO.Object.Finder.prototype.orderByExp=function(sql,data){
  this._orderByExp={sql: sql, data: data};
  return this;
}

DAO.Object.Finder.prototype.columnExp=function(sql,data){
  this._columnExp={sql: sql, data: data};
  return this;
}

DAO.Object.Finder.prototype.orderBy=function(column,order){
  if(!this._orderBy){
    this._orderBy=[];
  }
  if(order && ["asc","desc"].indexOf(order)==-1){
    throw new Error("Invalid order for order by:"+order);
  }
  this._orderBy.push({ column: column, order: order||"asc"});
  return this;
}

DAO.Object.Finder.prototype.offset=function(offset){
  this._offset=offset;
  return this;
}

DAO.Object.Finder.prototype.limit=function(limit){
  this._limit=limit;
  return this;
}

DAO.Object.Finder.prototype.page=function(number,pageSize){
  pageSize=pageSize||50;
  this._limit = pageSize;
  this._offset = number*pageSize; 
  return this;
}  


DAO.Object.Finder.prototype.onComplete=function(onComplete){
  this.dao.dialect.find(this,onComplete);
}

DAO.Object.Finder.prototype.first=function(onComplete){
  this.dao.dialect.find(this,function(err,res){
    if(res && res instanceof Array){
      if(res.length>0){
        return onComplete(null,res[0]);
      } else return onComplete (null,null);
    } else {
      return onComplete(err,res);
    }
  });
}

DAO.Object.Finder.prototype.last=function(onComplete){
  this.dao.dialect.find(this,function(err,res){
    if(res && res instanceof Array){
      if(res.length>0){
        return onComplete(null,res[res.length-1]);
      } else return onComplete (null,null);
    } else {
      return onComplete(err,res);
    }
  });
}


/* --- Updater --- */

DAO.Object.Updater=function(dao,values,onQuery){
  DAO.Object.WhereTask.call(this,dao);
	this._what="Update";
 
  this.values = {}; 
  for(var column in dao.columns){
    if(typeof values[column]!="undefined"){
      this.values[column] = values[column];
    }
  }

  this._where=[];
  if(onQuery){
    this.where(onQuery);
  } else {
    var pk = dao.pk();  
    if(values[pk]){
      this.where(function(q){
        q.eq(pk,values[pk]);
      });
      this.values = {};
      for(var i in values){
        if(i!=dao.pk())
          this.values[i]=values[i];
      }
    }
  }
  return this;
}
util.inherits(DAO.Object.Updater, DAO.Object.WhereTask);

DAO.Object.Updater.prototype.setExp=function(sql,data){
  this._setExp={ sql: sql, data: data };
  return this;
}

DAO.Object.Updater.prototype.onComplete=function(onComplete){
  this.dao.dialect.update(this,onComplete);
}

/* --- Upserter --- */

DAO.Object.Upserter=function(dao,values,onQuery){
  DAO.Object.WhereTask.call(this,dao,values,onQuery)
	this._what="Upsert";
  
  this.values = {}; 
  for(var column in dao.columns){
    if(typeof values[column]!="undefined"){
      this.values[column] = values[column];
    }
  }

  this._where=[];
  if(onQuery){
    this._where.push(new DAO.Query(dao));
    this._where[0].resolve(onQuery);
  }
  return this;
}
util.inherits(DAO.Object.Upserter,DAO.Object.Updater);


DAO.Object.Upserter.prototype.onComplete=function(onComplete){
  this.dao.dialect.upsert(this,onComplete);
}



/* --- Inserter --- */

DAO.Object.Inserter=function(dao,values){
  DAO.Object.Task.call(this,dao);
  this.values={};

  for(var column in dao.columns){
    if(typeof values[column]!="undefined"){
      this.values[column] = values[column];
    }
  }

	this._what="Insert";
  return this;
}
util.inherits(DAO.Object.Inserter, DAO.Object.Task);

DAO.Object.Inserter.prototype.onComplete=function(onComplete){
  this.dao.dialect.insert(this,onComplete);
}

/* --- Deleter --- */


DAO.Object.Deleter=function(dao,onQuery){
  DAO.Object.WhereTask.call(this,dao);
  this._what="Delete";
  if(onQuery){
    this.where(onQuery);
  }
  return this;
}
util.inherits(DAO.Object.Deleter, DAO.Object.WhereTask);

DAO.Object.Deleter.prototype.onComplete=function(onComplete){
  this.dao.dialect.delete(this,onComplete);
}




DAO.dropTables=function(){
  //FIXME this probably should calculate the ordering to drop / create
  var tables = Array.prototype.slice.call(arguments);
  var onComplete = tables.pop()
  async.mapSeries(tables,function(dao,done){
    dao.dropTable().done(function(err,res){
      done(err,res);  
    });  
  },onComplete);
}


DAO.createTables=function(){
  //FIXME this probably should calculate the ordering to drop / create
  var tables = Array.prototype.slice.call(arguments);
  var onComplete = tables.pop();
  async.mapSeries(tables,function(dao,done){
    dao.createTable().done(function(err,res){
      done(err,res);  
    });  
  },onComplete);
}


module.exports=DAO;
