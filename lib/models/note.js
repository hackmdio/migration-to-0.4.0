"use strict";

// external modules
var shortId = require('shortid');
var Sequelize = require("sequelize");

// permission types
var permissionTypes = ["freely", "editable", "locked", "private"];

module.exports = function (sequelize, DataTypes) {
    var Note = sequelize.define("Note", {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
        },
        shortid: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            defaultValue: shortId.generate
        },
        alias: {
            type: DataTypes.STRING,
            unique: true
        },
        permission: {
            type: DataTypes.ENUM,
            values: permissionTypes
        },
        viewcount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        title: {
            type: DataTypes.TEXT
        },
        content: {
            type: DataTypes.TEXT
        },
        lastchangeAt: {
            type: DataTypes.DATE
        }
    }, {
        classMethods: {
            associate: function (models) {
                Note.belongsTo(models.User, {
                    foreignKey: "ownerId",
                    as: "owner",
                    constraints: false
                });
                Note.belongsTo(models.User, {
                    foreignKey: "lastchangeuserId",
                    as: "lastchangeuser",
                    constraints: false
                });
            },
            checkNoteIdValid: function (id) {
                var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                var result = id.match(uuidRegex);
                if (result && result.length == 1)
                    return true;
                else
                    return false;
            }
        }
    });

    return Note;
};