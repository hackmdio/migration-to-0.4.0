//config
var path = require('path');

var old_db_mongodb = 'mongodb://localhost/hackmd';
var old_db_postgresql = 'postgresql://localhost:5432/hackmd';
var new_db = {
    username: '',
    password: '',
    database: 'hackmd',
    host: 'localhost',
    port: 5432,
    dialect: 'postgres'
};

var config = {
    old_db_mongodb: process.env.OLD_DB_MONGODB || old_db_mongodb,
    old_db_postgresql: process.env.OLD_DB_POSTGRESQL || old_db_postgresql,
    new_db: new_db
};

module.exports = config;
