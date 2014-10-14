var DAO = require('./lib/mysql');
DAO = require('./lib/mssql');
DAO = require('./lib/pg');
DAO = require('./lib/sqlite');
DAO = require('./lib/tx');

module.exports=DAO;
