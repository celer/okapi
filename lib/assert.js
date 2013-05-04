var assert = require('assert');
var colors = require('colors');
module.exports=function(DAO){
	/**
		Test to insure that all the input object properties are the same as the output object properties

		* The output object may have more properties then are in the input object
		* The output object must have all of the same properties, with the same value as the input object

		*This function is designed to be usable with (function).toString() for embedding*

		@param {object} input The input object
		@param {object} output The output object

		@method DAO.objectCovers 
		@static
	**/
	DAO.objectCovers=function(input,output){
		var recurse=function(input,output){
			if(typeof input!=typeof output){
				return false;
			} else {
				if(input instanceof Array){
					for(var i in input){
						var found=false;
						for(var j in output){
							if(recurse(input[i],output[j])){
								found=true;
							}
						}
						if(!found){
							return false;			
						}
					}
					return true;
				} else if(typeof input=="object") {
					for(var inputProp in input){
						if(input!=null && output==null)
							return false;
						else if(typeof input[inputProp]!=typeof output[inputProp])
							return false;
						if(input[inputProp] instanceof Array){
							var res = recurse(input[inputProp],output[inputProp]);
							if(res==false)
								return false;
						} else if(input[inputProp] instanceof Date){ 
							if(!output[inputProp] instanceof Date){
								return false;
							}
							if(input[inputProp].getTime()!=output[inputProp].getTime()){
								return false;
							}
						} else if(typeof input[inputProp]=="object"){
							var res = recurse(input[inputProp],output[inputProp]);
							if(res==false)
								return false;
						} else if(input[inputProp]!==output[inputProp])
							return false
					}
					return true; 
				} else {
					return (input==output);
				}
			}
		}
		return recurse(input,output);	
	}

	assert.equal(DAO.objectCovers([1,2,3,4],[1,2,3,4,5]),true);
	assert.equal(DAO.objectCovers([1,2,3,4],[1,2,4,5]),false);
	assert.equal(DAO.objectCovers("hello","hello"),true);
	assert.equal(DAO.objectCovers({a:new Date(1970,1,1)},{a:new Date(1970,1,1)}),true);
	assert.equal(DAO.objectCovers({a:new Date(1970,1,1)},{a:new Date(1970,1,2)}),false);
	assert.equal(DAO.objectCovers({a:1},{a:1}),true);
	assert.equal(DAO.objectCovers({a:1},{b:1}),false);
	assert.equal(DAO.objectCovers({a:1,b:1},{a:1,b:1,c:3}),true);
	assert.equal(DAO.objectCovers({a:1, b:{ k:3} },{a:1, b:{ k:3}}),true);
	assert.equal(DAO.objectCovers({a:1, b:{ k:3} },{a:1, b:{ k:8}}),false);
	assert.equal(DAO.objectCovers({a:1, b:{ k:3}, complex: [ 1, '3','A',{ a:1 },{ b:5, c:[1,2,3,'5']}]}, {a:1, b:{ k:3}, complex: [ 1, '3','A',{ a:1 },{ b:5, c:[1,2,3,'5']}]}),true);
	assert.equal(DAO.objectCovers({a:1, b:{ k:3}, complex: [ 1, '3','A',{ a:1 },{ b:5, c:[1,2,3,'5']}]}, {a:1, b:{ k:3} }),false);
	assert.equal(DAO.objectCovers({a:1, b:{ k:3}, complex: [ 1, '3','A',{ a:1 },{ b:5, c:[1,2,3,'5']}]}, {a:1, b:{ k:3}, complex: [ 1, '3','A',{ a:1 },{ b:5, c:[1,2,3]}]}),false);

	assert.equal(DAO.objectCovers([ { name:'foo' }, {name:'bar',roles:['a','b','c'], thing:{ a:1, b:2}}], [ { name:'foo' }, {name:'bar',roles:['a','b','c'], thing:{ a:1, b:2}}]),true);
	assert.equal(DAO.objectCovers([ { name:'foo' }, {name:'bar',roles:['a','b','c'], thing:{ a:1, b:2}}], [ { name:'foo' }, {name:'bar',roles:['a','b','c'], thing:{ a:1, b:5}}]),false);
	assert.equal(DAO.objectCovers([ { name:'foo' }, {name:'bar',roles:['a','b','c'], thing:{ a:1, b:2}}], [{name:'bar',roles:['a','b','c'], thing:{ a:1, b:5}}]),false);

	DAO.Assert = {};

	DAO.Assert.reset=function(){
		DAO.Assert.results = { pass: 0, fail:0 };
		DAO.Assert.testResults={ pass:0, fail:0 };
	}
	DAO.Assert.startTest=function(msg){
		console.log(msg);
		DAO.Assert.testResults={ pass:0, fail:0 };
	}

	DAO.Assert.logTask=function(taskMsg,err,result){
		console.log(taskMsg,err,result);
	}

	DAO.Assert.logResult=function(r){
		console.log("\t"+(r.result==true?r.passMsg.green:r.result.red));
		if(r.result===true){
			DAO.Assert.testResults.pass++;
			DAO.Assert.results.pass++;
		} else {
			DAO.Assert.testResults.fail++;
			DAO.Assert.results.fail++;
		}
	}

	DAO.Assert.reset();

	DAO.Object.Task.prototype.runAssertTasks=function(err,res){
		DAO.Assert.logTask("Test",err,res);
		if(!this.assertTasks) return [];
		var results= this.assertTasks.map(function(task){
			var r = { result:  task.task(err,res), passMsg: task.passMsg};
			DAO.Assert.logResult(r);
		});
		return results;
	}
	

	DAO.Object.Task.prototype.assertHasError=function(error){
		this.assertTasks=this.assertTasks||[];
		this.assertTasks.push({ task: function(err,res){
			return (res?"An unexpected result was returned when an error was expected":(err && err.indexOf(error)!=1)?true:"The error didn't contain:"+error);
		}, passMsg: "The error contained:"+error });	
		return this;
	}
	
	DAO.Object.Task.prototype.assertRowsReturned=function(rows){
		this.assertTasks=this.assertTasks||[];
		this.assertTasks.push({ task: function(err,res){
			if(err) return "An unexpected error was returned:"+err;
			if(!res) 
						return "No result was returned";
			if(res.length!=rows){
				return "Expected "+rows+" rows to be returned, got: "+res.length;
			}	else {
				return true;
			}
		}, passMsg: "As expected "+rows+" rows were returned" });	
		return this;
	}


	DAO.Object.Task.prototype.assertContainsRow=function(row){
		this.assertTasks=this.assertTasks||[];
		this.assertTasks.push({ task: function(err,res){
			if(err) return "An unexpected error was returned:"+err;	
			if(!res) return "No data was returned";
			for(var i in res){
				if(DAO.objectCovers(row,res[i]))
					return true;
			}
			return "No row was found containing:"+JSON.stringify(row);
		}, passMsg: "The output contained the row:" +JSON.stringify(row) });
		return this;
	}

	DAO.Object.Task.prototype.assertContains=function(data){
		this.assertTasks=this.assertTasks||[];
		this.assertTasks.push({ task: function(err,res){
			if(err) return "An unexpected error was returned:"+err;	
			if(!res) return "No data was returned";
			if(DAO.objectCovers(data,res))
				return true;
			return "No row was found containing:"+JSON.stringify(data);
		}, passMsg: "The output contained:"+JSON.stringify(data)});
		return this;
	}
}

