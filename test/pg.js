var DAO = require('../lib/pg');
require('../lib/assert')(DAO);
var async = require('async');

dialect = new DAO.PGSQLDialect({  host:"localhost", user:"celer", database:"dao", password:"foo", debug: true });

require('./user');
