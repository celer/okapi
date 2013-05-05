var DAO = require('./lib/mysql');
DAO = require('./lib/pg');
DAO = require('./lib/sqlite');


module.exports=DAO;
