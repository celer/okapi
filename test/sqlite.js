var DAO = require('../lib/sqlite');
var sqlite = require('sqlite3');
require('../lib/assert')(DAO);
var async = require('async');

dialect = new DAO.SQLiteDialect(new sqlite.Database(":memory:"));

require('./user');
