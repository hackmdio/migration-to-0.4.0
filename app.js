// app
// external modules
var async = require('async');
var mongoose = require('mongoose');
var pg = require('pg');
var session = require('express-session');
var MongoClient = require('mongodb').MongoClient;
var SequelizeStore = require('connect-session-sequelize')(session.Store);

// core
var config = require("./config.js");
var logger = require("./lib/logger.js");

if (!config.old_db_mongodb || !config.old_db_mongodb || !config.new_db_postgresql) {
    logger.error('you must provide all the db connection strings!');
    return;
}

// old schemas
var db = require("./lib/db.js");
var Note = require("./lib/note.js");
var User = require("./lib/user.js");
var Temp = require("./lib/temp.js");

// new models
var models = require("./lib/models");

// session store
try {
    var sessionStore = new SequelizeStore({
        db: models.sequelize
    });
    logger.info('new SequelizeStore success!');
} catch (err) {
    return logger.error('new SequelizeStore failed: ' + err);
}

// sessions
function migrateSessions(callback) {
    logger.info('> migrate sessions from old db mongodb to new db postgresql');
    MongoClient.connect(config.old_db_mongodb, function(err, db) {
        if (err) {
            logger.error('connect to old db mongodb failed: ' + err);
            return callback(err);
        }
        var sessionCollection = db.collection('sessions');
        sessionCollection.find({}).sort({lastModified: 1}).toArray(function(err, sessions) {
            if (err) {
                logger.error('find sessions in old db mongodb failed: ' + err);
                return callback(err);
            }
            if (sessions.length <= 0) {
                logger.info('not found any sessions!');
                return callback();
            }
            logger.info('found ' + sessions.length + ' sessions!');
            async.forEachOfSeries(sessions, function (session, key, _callback) {
                sessionStore.sessionModel.findOrCreate({
                    where: {
                        sid: session._id
                    },
                    defaults: {
                        sid: session._id,
                        expires: session.expires,
                        data: session.session,
                        createdAt: session.lastModified,
                        updatedAt: session.lastModified
                    },
                    silent: true
                }).spread(function (session, created) {
                    if (!created) {
                        logger.info('session already exists: ' + session.sid);
                    }
                    return _callback();
                }).catch(function (err) {
                    return _callback(err);
                });
            }, function (err) {
                if (err) {
                    logger.error('migrate sessions failed: ' + err);
                    return callback(err);
                }
                sessionStore.sessionModel.count().then(function (count) {
                    logger.info('migrate sessions success: ' + count + '/' + sessions.length);
                    return callback();
                }).catch(function (err) {
                    logger.error('count new db postgresql sessions failed: ' + err);
                    return callback(err);
                });
            });
        });
    });
}

// temps
function migrateTemps(callback) {
    logger.info('> migrate temps from old db mongodb to new db postgresql');
    Temp.model.find({}).sort({created: 1}).exec(function (err, temps) {
        if (err) {
            logger.error('find temps in old db mongodb failed: ' + err);
            return callback(err);
        }
        if (temps.length <= 0) {
            logger.info('not found any temps!');
            return callback();
        }
        logger.info('found ' + temps.length + ' temps!');
        async.forEachOfSeries(temps, function (temp, key, _callback) {
            models.Temp.findOrCreate({
                where: {
                    id: temp.id
                },
                defaults: {
                    id: temp.id,
                    data: temp.data,
                    createdAt: temp.created,
                    updatedAt: temp.created
                },
                silent: true
            }).spread(function (temp, created) {
                if (!created) {
                    logger.info('temp already exists: ' + temp.id);
                }
                return _callback();
            }).catch(function (err) {
                return _callback(err);
            });
        }, function (err) {
            if (err) {
                logger.error('migrate temps failed: ' + err);
                return callback(err);
            }
            models.Temp.count().then(function (count) {
                logger.info('migrate temps success: ' + count + '/' + temps.length);
                return callback();
            }).catch(function (err) {
                logger.error('count new db postgresql temps failed: ' + err);
                return callback(err);
            });
        });
    });
}

// sync new db models
models.sequelize.sync().then(function () {
    logger.info('connect to new db postgresql and sync success!');
    // connect to the old db mongodb
    try {
        mongoose.connect(config.old_db_mongodb);
        logger.info('connect to old db mongodb success!');
    } catch (err) {
        return logger.error('connect to old db mongodb failed: ' + err);
    }
    // connect to the old db postgresql
    var client = new pg.Client(config.old_db_postgresql);
    client.connect(function (err) {
        if (err) return logger.error('connect to old db postgresql failed: ' + err);
        logger.info('connect to old db postgresql success!');
        logger.info('---start migration---');
        async.series({
            migrateSessions: migrateSessions,
            migrateTemps: migrateTemps
        }, function(err, results) {
            if (err) {
                logger.error('migration failed: ' + err);
                process.exit(1);
            } else {
                logger.info('---migration complete---');
                process.exit(0);
            }
        });
                     
        // user
        //logger.info('---users from old db mongodb to new db postgresql---');
//        var selectquery = "SELECT * FROM user;";
//        client.query(selectquery, function (err, result) {
//            client.end();
//            if (err) {
//                return logger.error('select notes in the old db postgresql failed: ' + err);
//            } else {
//                if (result.rows.length <= 0) {
//                    logger.info('not found any notes!');
//                } else {
//                    logger.info('found ' + result.rows.length + ' notes!');
//                    for (var i = 0, l = result.rows.length; i < l; i++) {
//                        var note = result.rows[i];
//                        // find or create owner
//                    }
//                }
//            }
//        });
//        // note
//        var selectquery = "SELECT * FROM notes;";
//        client.query(selectquery, function (err, result) {
//            client.end();
//            if (err) {
//                return logger.error('select notes in the old db postgresql failed: ' + err);
//            } else {
//                if (result.rows.length <= 0) {
//                    logger.info('not found any notes!');
//                } else {
//                    logger.info('found ' + result.rows.length + ' notes!');
//                    for (var i = 0, l = result.rows.length; i < l; i++) {
//                        var note = result.rows[i];
//                        // find or create owner
//                    }
//                }
//            }
//        });
    });
}).catch(function (err) {
    return logger.error('new db sync failed: ' + err);
});

// log uncaught exception
process.on('uncaughtException', function (err) {
    logger.error(err);
    process.exit(1);
});