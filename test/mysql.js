var DAO = require('../lib/mysql');
require('../lib/assert')(DAO);
var async = require('async');

dialect = new DAO.MySQLDialect({  host:"localhost", user:"root", database:"dao", debug: true });

require('./user');
