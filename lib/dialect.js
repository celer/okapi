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


//Set me to true to see logging
//DAO.log=true;
DAO.Dialect.prototype.logQuery=function(query,params){
  if(DAO.log){
    console.log(query.cyan,params);
  }
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
    "\n<%createExp()%>) <%postCreateExp()%> ",
    dropTable: "drop table if exists <%tableName()%>",
    fkColumn: "constraint fk_<%columnName%> foreign key (<%columnName%>) references <%column.ref.dao.tableName()%>(<%column.ref.column%>)",
    uniqueColumn: "unique(<%columnName%>)",
    index:"index idx_<%indexName%> (<% index.columns.join(',') %>)",
    createIndex:"create <%index.opts.unique?'unique':''%> index idx_<%indexName%> on <%tableName()%> (<% index.columns.join(',') %>)",
    insert:"insert into <%tableName()%> (<%columns()%> <%columnExp()%>) values(<%values()%> <%valueExp()%>)",
    update:"update <%tableName()%> set <%sets()%> <%setExp()%> <? where <%where()%> <%whereExp()%> ?>",
    select:"select <%columns()%><%columnExp()%> from <%tableName()%> <%joins()%> <? where <%where()%><%whereExp()%>?><? order by <%orderBy()%> <%orderByExp()%>?><? limit <%limit()%> ?> <?offset <%offset()%> ?>",
    delete:"delete from <%tableName()%> <? where (<%where()%><%whereExp()%>) ?>"
  }


  

}
util.inherits(DAO.SQLDialect,DAO.Dialect);

DAO.SQLDialect.prototype.sqlExp=function(exp,escape,dao){

  if(typeof exp=="undefined") return "";

  var s = "";
  if(typeof exp.sql=="string"){ s = exp.sql };
  if(typeof exp.sql=="object"){
    if(exp.sql[this.type]) s=exp.sql[this.type];
    else if(exp.sql['*']) s=exp.sql['*'];
  }
  if(s && typeof exp.data=="object"){
      Object.keys(exp.data).map(function(d){
        s = s.replace("?"+d+"?",escape(exp.data[d],dao,d))
      });
  }    
  return s;
}


DAO.SQLDialect.prototype.beginTX=function(conn,onComplete){
  
  this.query("begin",{},onComplete,{ _conn: conn });  
  
}

DAO.SQLDialect.prototype.commitTX=function(conn,onComplete){
  
  this.query("commit",{},onComplete,{ _conn: conn });  
  
}

DAO.SQLDialect.prototype.rollbackTX=function(conn,onComplete){
  
  this.query("rollback",{},onComplete,{ _conn: conn });  
  
}


DAO.SQLDialect.prototype.alterTableColumn=function(sql,dao,columnName,onComplete){
  var context = {
    dao: dao,
    tableName: function(){ return dao.tableName() },
    columnName: columnName,
    column: dao.columns[columnName]
  };
  sql = DAO.SQLDialect.resolveSQL(sql,context);

  if(onComplete){
    this.query(sql,{},onComplete,dao);
  } else {
    var self=this;
    return function(input,onComplete){
      input=input||{};
      self.query(sql,input,onComplete||function(){},dao);
    }
  }
}

DAO.SQLDialect.prototype.resolveQuery=function(sql,dao,context,onComplete){
  context=context||{};

  sql = DAO.SQLDialect.resolveSQL(sql,context,dao);

  if(onComplete){
    this.query(sql,{},onComplete,dao);
  } else {
    var self=this;
    return function(onComplete){
      self.query(sql,{},onComplete||function(){},dao);
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


DAO.SQLDialect.prototype.createTable=function(statement,onComplete){

  var self=this;
  var tasks=[];

  tasks.push(this.resolveQuery(this.sql.createTable,statement.dao,{
      columnType: function(name){ return self.writeType(statement.dao.columns[name]); },
      columnModifiers: function(name){ return self.writeModifiers(statement.dao.columns[name]); },
      columnUniqueConstraint:function(name){ return self.writeColumnUniqueConstraint(name,statement.dao.columns[name]);},
      columnFKConstraint:function(name){ return self.writeColumnFKConstraint(name,statement.dao.columns[name]);},
      createExp: function(){ return self.sqlExp(statement._createExp); },
      postCreateExp: function(){ return self.sqlExp(statement._postCreateExp); },
      index:function(name){ return self.writeIndex(name,statement.dao.indexes[name]); },
  }));

  for(var indexName in statement.dao.indexes){
    var index = statement.dao.indexes[indexName];

    tasks.push(this.resolveQuery(this.sql.createIndex,statement.dao,{
      indexName: indexName,
      index: index,
    }));
  }

  async.series(tasks,function(err,res){
    return onComplete(err,res);
  });
}

DAO.SQLDialect.prototype.dropTable=function(statement,onComplete){
  return this.resolveQuery(this.sql.dropTable,statement.dao,{},onComplete);
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
    var s = self.writeModifier(modifier,((typeof column[modifier]!="undefined")?column[modifier]:column.type[modifier]),column);
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
      }  else return "";

  },"gm");
  return sql;
}

DAO.SQLDialect.resolveEvals=function(sql,context,opts){
  opts=opts||{};
  opts.resolved=opts.resolved||0;
  var errors=[];
  sql= sql.replace(/\<\%([^%]+)\%\>/gm,function evalSQLFunction(str,p2){
      try {
        with(context){ 
          var s = eval(p2);
          if(s!=="" && typeof s!="undefined"){
            opts.resolved++; 
            return s+"";
          }
          return "";
        }
      } catch(e){
        errors.push(p2+" - "+e.toString());
      }  
  });
  if(errors.length>0){
    throw new Error(errors.join(";"));
  }

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

DAO.SQLDialect.prototype.escape=function(str,dao,column,data,type){

	if(str instanceof DAO.Var){
		return "$"+str.toString()+"$";
	}

  var w=function(c){
    return "_"+c+"_";
  }

  if(dao.columns[column]){
    if(type=="set"){
      var error = dao.columns[column].type.validate(str,dao.columns[column]);

      if(error!==true){
        error=error.replace(/:column/g,column);
        throw new Error(error);
      }
    }

    str = dao.columns[column].type.toSQLValue(str);
  }

  if(typeof data[w(column)]=="undefined" || data[w(column)]===str){
    data[w(column)]=str;
    return "?"+w(column)+"?"
  }    

  var i = 0;
  while(typeof data[w(column+i)]!="undefined"){ i++; };
  data[w(column+i)]=str;
  str="?"+w(column+i)+"?";


  return str;

}

DAO.SQLDialect.prototype.buildUpdate=function(updater,data){
  var self=this;
  var context = self.createContext(updater,data);
  sql = DAO.SQLDialect.resolveSQL(this.sql.update,context);
  return sql;
}

DAO.SQLDialect.prototype.compileUpdate=function(updater){
  var self=this;
  var data={};

  var sql = this.buildUpdate(updater,data);
	return { sql: sql, data: data };
}

DAO.SQLDialect.prototype.doUpdate=function(sql,data,dao,onComplete){
  var self=this;
  
	self.query(sql,data,function(err,res){
    self.makeUpdateResult(err,res,onComplete);
  },dao,"update");
}


DAO.SQLDialect.prototype.update=function(updater,onComplete){
  onComplete=onComplete||function(){};
  var self=this;

  try {
    var psql = this.compileUpdate(updater);
  } catch(e){
    return onComplete(e.toString());
  }

  self.doUpdate(psql.sql,psql.data,updater.dao,onComplete);
}

DAO.SQLDialect.prototype.buildUpsert=function(upserter,data){
  var self=this;
  var context = self.createContext(upserter,data);
  sql = DAO.SQLDialect.resolveSQL(this.sql.upsert,context);
  return sql;
}

DAO.SQLDialect.prototype.compileUpsert=function(upserter){
	var sql="";
	var data = {};
	for(var i in upserter.values){
		data[i]=upserter.values[i];	
	}
	if(this.sql.upsert){
		sql = this.buildUpsert(upserter,data);
	}
	return { sql: sql, data: data};
}

DAO.SQLDialect.prototype.doUpsert=function(sql,pdata,dao,onComplete){
  onComplete=onComplete||function(){};
  var self=this;
  //Look to see if we have an optimized upsert statment
  if(!this.sql.upsert){ 
    //If not do it with two statements
    dao.update(pdata).onComplete(function(err,res){
      if(err) return onComplete(err);
      if(res && res.changedRows==0){
        dao.insert(pdata).onComplete(function(err,res){
            if(err) return onComplete(err);
            if(res) {
              return onComplete(null, { changedRows:1 });
            }  
        });
      } else {
				return onComplete(null, res);
      }
    });
  } else {
    self.query(sql,pdata,function(err,res){
      self.makeUpdateResult(err,res,onComplete);
    },dao,"update");
  }

}


DAO.SQLDialect.prototype.upsert=function(updater,onComplete){
  onComplete=onComplete||function(){};
  var self=this;
	var psql = this.compileUpsert(updater);
	this.doUpsert(psql.sql, psql.data, updater.dao,onComplete);
}

DAO.SQLDialect.prototype.buildSelectResults=function(dao,res,tableAliases){
  if(Object.keys(tableAliases).length>1 && res){
    res = res.map(function(r){
      var obj = {};
      for(var i in r){
        if(typeof r[i]!="function"){
          var tc = i.split("_OKAPI_");
          if(tc.length==2){
            var table = tc[0];
            var column = tc[1];
            obj[table]=obj[table]||{};
            obj[table][column]=r[i];  
          } else {
            obj[i]=r[i];
          }
        }
        for(var table in obj){
          var dao = tableAliases[table];
          if(dao){
            obj[table] = dao.fromSQLValue(obj[table]);
          }  
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
  } else {
    res = res.map(function(r){ 
      return dao.fromSQLValue(r);
    });
  }
  return res;
}

/*

DAO.SQLDialect.join=function(dao,opts);
DAO.SQLDialect.join=function(dao,column,opts);
DAO.SQLDialect.join=function(dao,column,opts);

DAO.SQLDialect.join=function(dao,func,opts);
DAO.SQLDialect.join=function(dao,column,func,opts);

*/

DAO.SQLDialect.Join=function(){
  this.joins=[];
}

DAO.SQLDialect.Join.prototype.add=function(from,to){
  this.joins.push({from: from, to: to });
}

DAO.SQLDialect.Join.prototype.toSQL=function(escape,opts){
  var sql="";
  this.joins.map(function(join){
    var type = "inner";
    if(join.from.opts){
      var fromAs = join.from.opts.as;
    }
    if(join.to.opts){
      type = join.to.opts.type||type;
      var toAs = join.to.opts.as;
    }
    sql+=type+" join "+join.to.dao.tableName();
    if(join.to.opts && join.to.opts.as){
      sql+=" as "+join.to.opts.as;
    }
    sql+=" on ("+(fromAs||join.from.dao.tableName())+"."+join.from.column+"="+(toAs||join.to.dao.tableName())+"."+join.to.column;
    if(join.to.query){
      var q = new DAO.Query(join.to.dao);
      q.resolve(join.to.query);
      sql+=" and "+q.writeSQL(escape,{ tableName: (toAs||join.to.dao.tableName())});  
    }
    //FIXME see if the dao has a query filter on it
    var filters = join.to.dao.getFilters("find");
    filters.map(function(filter){
      var qs = new DAO.Query(join.to.dao);
      qs.resolve(filter);
      sql+=" and "+qs.writeSQL(escape,{ tableName: (toAs||join.to.dao.tableName())});  
    });
    sql+=") ";
  });  
  return sql;
}

DAO.SQLDialect.Join.prototype.map=function(name){
  var map = {};
  this.joins.map(function(join){
    map[join.to.dao.tableName()]=join.to.dao; 
    map[join.from.dao.tableName()]=join.from.dao; 

    if(join.to.opts && join.to.opts.as){
      map[join.to.opts.as]=join.to.dao; 
    }
    
    if(join.from.opts && join.from.opts.as){
      map[join.from.opts.as]=join.from.dao; 
    }

  }); 
  if(name){
    return map[name];
  } else return map;
}

DAO.SQLDialect.Join.prototype.columns=function(){
  var columns = {};
  this.joins.map(function(join){
    var to=join.to.dao.tableName(),from=join.from.dao.tableName();
    if(join.to.opts && join.to.opts.as){
      to = join.to.opts.as; 
    }
    
    if(join.from.opts && join.from.opts.as){
      from = join.from.opts.as; 
    }


    columns[to]=[];
    for(var i in join.to.dao.columns){
      if(join.to.opts && join.to.opts.columns){
        if(join.to.opts.columns.indexOf(i)==-1){
          continue;
        }
      }
      columns[to].push(i);
    } 
    

    columns[from]=[];
    for(var i in join.from.dao.columns){
      if(join.from.opts && join.from.opts.columns){
        if(join.from.opts.columns.indexOf(i)==-1){
          continue;
        }
      }
      columns[from].push(i);
    } 

  }); 
  return columns;
}

DAO.SQLDialect.join=function(){
  var args = Array.prototype.splice.call(arguments,0);
 
  var tables = [];

  while(args.length>0){
    if(args[0] instanceof DAO.Object){

      var dao = args[0];
      var column=null,query=null,opts=null;
      
      args.shift();

      while(args.length>0){
        var arg = args.shift();
        if(args!==null){
          if(column==null && typeof arg == "string"){
            column = arg; 
          } else if(query==null && typeof arg=="function"){
            query = arg;
          } else if(arg!=null && typeof arg=="object" && !(arg instanceof DAO.Object)){
            if(arg.as!=null || arg.type!=null || arg.columns!=null){
              opts=arg;
            } else {
              query=arg;
            }
          } else if(arg instanceof DAO.Object){
            args.unshift(arg);
            break;
          } else {
            throw new Error("Invalid join statment '"+arg+"' is unexpected");
          }
        }
      }
      tables.push({ dao: dao, column:column, query: query, opts: opts });
    }
  }
  
  if(tables.length==1){
    throw new Error("More then one table must be specified");
  }

  var getRefColumn=function(fromDAO,toDAO,name){
    var c=fromDAO.columns[name];
    if(!c) throw new Error("Invalid column '"+name+"' on "+fromDAO.tableName());
    if(c && c.ref && c.ref.dao==toDAO){
      return c.ref.column; 
    }
    return null;
  }

  var findRefColumn=function(fromDAO,toDAO){
    for(var cn in fromDAO.columns){
      var c=getRefColumn(fromDAO,toDAO,cn);
      if(c){
        return { from: cn, to:c};
      }  
    }
    return null;
  } 


  var join =  new DAO.SQLDialect.Join();

  tableFrom=tables.shift();
  tableTo=tables.shift();
  while(tableTo){
    var daoFrom = tableFrom.dao.getRootObject();
    var daoTo = tableTo.dao.getRootObject();

    
    if(!tableFrom.column){
      var tt = findRefColumn(daoFrom,daoTo);
      if(tt){
        tableFrom.column=tt.from;
        if(!tableTo.column) {
          tableTo.column=tt.to;
        }
      }
    }
    if(!tableTo.column){
      var tt = findRefColumn(daoTo,daoFrom);
      if(tt){
        tableTo.column=tt.from;
        if(!tableFrom.column) {
          tableFrom.column=tt.to;
        }
      }
      var tt = findRefColumn(daoFrom,daoTo);
      if(tt && !tableTo.column){
        tableTo.column=tt.to;
        if(!tableFrom.column) {
          tableFrom.column=tt.from;
        }
      }
    } else if(!tableFrom.column){
      var c = getRefColumn(daoTo,daoFrom,tableTo.column);
      tableFrom.column = c; 
    } 


    join.add(tableFrom,tableTo);

    tableFrom=tableTo;
    tableTo=tables.shift();
  }

  return join;
}


DAO.SQLDialect.prototype.buildSelect=function(finder,data,tableAliases){
    var self=this;


    var context = this.createContext(finder,data);
    var escape = context.escape;

    var columns=[];
      
    context.limit=function(){ return finder._limit; };
    context.offset=function(){ return finder._offset; };
    context.orderBy=function(){ 
        if(finder._orderBy instanceof Array){
          return finder._orderBy.map(function(obs){
            return (obs.column instanceof Array?obs.column.join(", "):obs.column)+" "+obs.order;
          }).join(", ");  
        }
      };
    context.orderByExp=function(){ return self.sqlExp(finder._orderByExp,escape,finder.dao) };
  
    context.tables=tableAliases||{};

    var joins = [];

    context.tables[finder.dao.tableName()]=finder.dao;  
    for(var i in finder._join){
        var join = finder._join[i];

        var joinArgs = Array.prototype.slice.call(join);
        joinArgs.unshift(finder.dao);


        var j = DAO.SQLDialect.join.apply(null,joinArgs);
        var m = j.map();

        for(var i in m){
          context.tables[i]=m[i];
        } 
        //Capture al the columns from the joins
        joins.push(j);
    }
    


    context.joins=function(){
      var sql = "";
      joins.map(function(join){
        sql+=join.toSQL(escape);
      });
      return sql;
    }


    context.columns=function(tableName, as, columnsToOutput){   
        var sql="";
        if(tableName){
          var dao = context.tables[tableName];
          var as = as || dao.tableName();  
          for(var column in dao.columns){
            if(columnsToOutput){
              if(columnsToOutput.indexOf(column)==-1)
                continue;
            }
            if(finder._join){
              columns.push(as+"."+column+" as \""+as+"_OKAPI_"+column+"\"");
            } else {
              columns.push(column+" as \""+column+"\"");
            }
          }
          return columns.join(", ");
        } else {
          var jc = [];
          if(joins.length>0){
            joins.map(function(join){
              var cs = join.columns();
              for(var table in cs){
                if(finder.dao.tableName()==context.tables[table].tableName() && finder._columns){
                  jc.push(context.columns(context.tables[table].tableName(),table,finder._columns));
                } else {
                  jc.push(context.columns(context.tables[table].tableName(),table,cs[table]));
                }
              }
            });
            return jc.join(", ");
          } else {
            return context.columns(finder.dao.tableName(),null,finder._columns);
          }
        }
    }
  
    sql = DAO.SQLDialect.resolveSQL(this.sql.select,context);
  
    return sql;
}


DAO.SQLDialect.prototype.sqlQuery=function(sql,data,type,onComplete,dao){
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
          if(dao){
            return self.injectLastInsertID(data,dao,err,res,onComplete);  
          } else {
            return onComplete(err,res);
          }
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

DAO.SQLDialect.prototype.compileSelect=function(finder){
  var self=this;
  var data = {};
  var tableAliases={};
  var sql = this.buildSelect(finder,data,tableAliases);

	data._tableAliases=tableAliases;

	return { sql: sql, data: data };
}

DAO.SQLDialect.prototype.doSelect=function(sql,data,dao,onComplete){
  var self=this;
  self.query(sql,data,function(err,res){
    self.selectRows(err,res,function(err,rows){
      if(err) return onComplete(err);
      rows = self.buildSelectResults(dao,rows,data._tableAliases);
      return onComplete(null,rows);
    });
  },dao,"select");
}

DAO.SQLDialect.prototype.find=function(finder,onComplete){
  onComplete=onComplete||function(){};
  var self=this;
	var psql = this.compileSelect(finder);
	this.doSelect(psql.sql,psql.data,finder.dao,onComplete);
}


DAO.SQLDialect.prototype.buildInsert=function(inserter,data){
  var self=this;
  var context = this.createContext(inserter,data);  
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

DAO.SQLDialect.prototype.compileInsert=function(inserter){
  var data={};
  var self=this;

  var w=function(c){
    return "_"+c+"_";
   }
  
  var errors = [];
  for(var i in inserter.values){
    data[w(i)]=inserter.values[i];
  }
  
  for(var i in inserter.dao.columns){  
    var column = inserter.dao.columns[i];
    var error = column.type.validate(data[w(i)],column);
    if(error!==true){  
      error=error.replace(/:column/g,i);
      errors.push(error);
    }  
  }
  if(errors.length>0){
    throw new Error(errors.join(";"));
  }

	data._values=inserter.values;
  var sql = this.buildInsert(inserter,data);
	return { sql: sql, data: data };
}

DAO.SQLDialect.prototype.doInsert=function(sql,data,dao,onComplete){
	var self=this;
  this.query(sql,data,function(err,res){
    self.injectLastInsertID(data._values||{},dao,err,res,onComplete);
  },dao);
}

DAO.SQLDialect.prototype.insert=function(inserter,onComplete){
  onComplete=onComplete||function(){};
	try {
  	var psql = this.compileInsert(inserter);
	} catch (e){
		return onComplete(e.toString());
	}
  this.doInsert(psql.sql,psql.data,inserter.dao,onComplete,inserter.values);
}

DAO.SQLDialect.prototype.createContext=function(statement,data){
  var self=this;

  var escape = function(str,dao,column,type){
    return self.escape(str,dao,column,data,type);
  }


  var context = {
    escape: escape,
    dao: statement.dao,
    statement: statement,
    tableName: function(){ return statement.dao.tableName() },
    set:function(column) { return column+"="+escape(statement.values[column],statement.dao,column,"set") },
    //sets: function(){ return Object.keys(statement.values).map(function(column){ return funcs.set(column); }).join(", "); },
    sets: function(opts){ return Object.keys(statement.values).filter(function(column){ if(opts && opts.noPK && column==statement.dao.pk()) return undefined; return true;  }).map(function(column){ return context.set(column); }).join(", "); },
    where:function(){ 
      if(statement._where){
        var w= statement._where.map(function(w){
          return w.writeSQL(escape);
        }).join(" and ");
      }
      return w;
    },
    setExp: function() { return self.sqlExp(statement._setExp,escape,statement.dao); },
    whereExp: function() { return self.sqlExp(statement._whereExp,escape,statement.dao); },
    //For insert
    columns: function(){ return Object.keys(statement.values).join(", "); },
    value: function(column){ return escape(statement.values[column],statement.dao,column); },
    values: function(){ return Object.keys(statement.values).map(function(column){ return context.value(column); }).join(", "); },
    valueExp: function() { return self.sqlExp(statement._valueExp,escape,statement.dao); },
    columnExp: function() { return self.sqlExp(statement._columnExp,escape,statement.dao); },
    eachColumn:function(onColumn,join){ return Object.keys(statement.dao.columns).map(function(columnName){ 
                                                        return onColumn.call(context,columnName,statement.dao.columns[columnName]);
                                                      }).filter(function(t){ 
                                                        return (t!="" && t!=undefined?t:undefined);
                                                      }).join(join||""); 
                                            },
    pk: function(){ return statement.dao.pk()||""; }
  }


  return context;

}


DAO.SQLDialect.prototype.buildDelete=function(deleter,data){
  var self=this;
  var context = this.createContext(deleter,data);
  sql = DAO.SQLDialect.resolveSQL(this.sql.delete,context);
  return sql;
}

DAO.SQLDialect.prototype.compileDelete=function(deleter){
  var data = {};
  var sql = this.buildDelete(deleter,data);
  return { sql: sql, data: data };
}

DAO.SQLDialect.prototype.doDelete=function(sql,data,dao,onComplete){
  var self=this;
  this.query(sql,data,function(err,res){
    if(err) return onComplete(err);
    return onComplete(err,{});
  },dao);
}


DAO.SQLDialect.prototype.delete=function(deleter,onComplete){
  onComplete=onComplete||function(){};
  var psql = this.compileDelete(deleter);
  this.doDelete(psql.sql,psql.data,deleter.dao,onComplete);
}

module.exports=DAO;
