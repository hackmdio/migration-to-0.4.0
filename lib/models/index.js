"use strict";

// external modules
var fs = require("fs");
var path = require("path");
var Sequelize = require("sequelize");

// core
var config = require('../../config.js');
var logger = require("../logger.js");

var sequelize = new Sequelize(config.new_db_postgresql, {
    logging: false
});
var db = {};

fs
    .readdirSync(__dirname)
    .filter(function (file) {
        return (file.indexOf(".") !== 0) && (file !== "index.js");
    })
    .forEach(function (file) {
        var model = sequelize.import(path.join(__dirname, file));
        db[model.name] = model;
    });

Object.keys(db).forEach(function (modelName) {
    if ("associate" in db[modelName]) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;