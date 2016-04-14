//config
var path = require('path');

var old_db_mongodb = 'change this';
var old_db_postgresql = 'change this';
var new_db_postgresql = 'change this';

var config = {
    old_db_mongodb: process.env.OLD_DB_MONGODB || old_db_mongodb,
    old_db_postgresql: process.env.OLD_DB_POSTGRESQL || old_db_postgresql,
    new_db_postgresql: process.env.NEW_DB_POSTGRESQL || new_db_postgresql
};

module.exports = config;
