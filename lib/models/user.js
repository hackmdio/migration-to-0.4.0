"use strict";

// external modules
var Sequelize = require("sequelize");

module.exports = function (sequelize, DataTypes) {
    var User = sequelize.define("User", {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
        },
        profileid: {
            type: DataTypes.STRING,
            unique: true
        },
        profile: {
            type: DataTypes.TEXT
        },
        history: {
            type: DataTypes.TEXT
        }
    }, {
        classMethods: {
            associate: function (models) {
                User.hasMany(models.Note, {
                    foreignKey: "ownerId",
                    constraints: false
                });
                User.hasMany(models.Note, {
                    foreignKey: "lastchangeuserId",
                    constraints: false
                });
            }
        }
    });
    
    return User;
};