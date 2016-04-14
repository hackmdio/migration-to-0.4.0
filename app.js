// app
// external modules
var util = require('util');
var async = require('async');
var mongoose = require('mongoose');
var moment = require('moment');
var ObjectId = mongoose.Types.ObjectId;
var pg = require('pg');
var session = require('express-session');
var MongoClient = require('mongodb').MongoClient;
var SequelizeStore = require('connect-session-sequelize')(session.Store);
var LZString = require('lz-string');

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
var sessionStore = new SequelizeStore({
    db: models.sequelize
});

function showProgress(index, total, name) {
    // show every 100 counts
    if (index % 100 == 0) {
        logger.info('migrate ' + name + ' processing: ' + index + '/' + total);
    }
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
                    showProgress(key, sessions.length, 'sessions');
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
                showProgress(key, temps.length, 'temps');
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

// users
function migrateUsers(callback) {
    logger.info('> migrate users from old db mongodb to new db postgresql');
    User.model.find({}).sort({created: 1}).exec(function (err, users) {
        if (err) {
            logger.error('find users in old db mongodb failed: ' + err);
            return callback(err);
        }
        if (users.length <= 0) {
            logger.info('not found any users!');
            return callback();
        }
        logger.info('found ' + users.length + ' users!');
        async.forEachOfSeries(users, function (user, key, _callback) {
            models.User.findOrCreate({
                where: {
                    profileid: user.id
                },
                defaults: {
                    profileid: user.id,
                    profile: user.profile,
                    history: user.history,
                    createdAt: user.created,
                    updatedAt: user.created
                },
                silent: true
            }).spread(function (user, created) {
                if (!created) {
                    logger.info('user already exists: ' + user.profileid);
                }
                showProgress(key, users.length, 'users');
                return _callback();
            }).catch(function (err) {
                return _callback(err);
            });
        }, function (err) {
            if (err) {
                logger.error('migrate users failed: ' + err);
                return callback(err);
            }
            models.User.count().then(function (count) {
                logger.info('migrate users success: ' + count + '/' + users.length);
                return callback();
            }).catch(function (err) {
                logger.error('count new db postgresql users failed: ' + err);
                return callback(err);
            });
        });
    });
}

// notes from mongodb
function migrateNotesFromMongoDB(callback) {
    logger.info('> migrate notes from old db mongodb to new db postgresql');
    Note.model.find({}).populate('lastchangeuser').sort({created: 1}).exec(function (err, notes) {
        if (err) {
            logger.error('find notes in old db mongodb failed: ' + err);
            return callback(err);
        }
        if (notes.length <= 0) {
            logger.info('not found any notes!');
            return callback();
        }
        logger.info('found ' + notes.length + ' notes!');
        async.forEachOfSeries(notes, function (note, key, _callback) {
            var where = null;
            if (models.Note.checkNoteIdValid(note.id)) {
                where = {
                    id: note.id
                };
            } else {
                where = {
                    alias: note.id
                };
            }
            var defaults = util._extend({
                viewcount: note.viewcount,
                createdAt: note.created,
                updatedAt: note.updated || note.created
            }, where);
            if (note.shortid) {
                defaults.shortid = note.shortid;
            }
            if (note.permission) {
                defaults.permission = note.permission;
            }
            models.Note.findOrCreate({
                where: where,
                defaults: defaults,
                silent: true
            }).spread(function (_note, created) {
                if (!created) {
                    logger.info('note already exists: ' + _note.id);
                }
                // if lastchangeuser exists, find coressponding new user and replace to its new id
                if (note.lastchangeuser && !_note.lastchangeuserId) {
                    models.User.findOne({
                        where: {
                            profileid: note.lastchangeuser.id
                        }
                    }).then(function (_user) {
                        if (!_user) {
                            showProgress(key, notes.length, 'notes');
                            return _callback();
                        }
                        _note.update({
                            lastchangeuserId: _user.id
                        }, {
                            silent: true
                        }).then(function (_note) {
                            showProgress(key, notes.length, 'notes');
                            return _callback();
                        }).catch(function (err) {
                            return _callback(err);
                        });
                    }).catch(function (err) {
                        return _callback(err);
                    });
                } else {
                    showProgress(key, notes.length, 'notes');
                    return _callback();
                }
            }).catch(function (err) {
                return _callback(err);
            });
        }, function (err) {
            if (err) {
                logger.error('migrate notes failed: ' + err);
                return callback(err);
            }
            models.Note.count().then(function (count) {
                logger.info('migrate notes success: ' + count + '/' + notes.length);
                return callback();
            }).catch(function (err) {
                logger.error('count new db postgresql notes failed: ' + err);
                return callback(err);
            });
        });
    });
}

// notes from postgresql
function migrateNotesFromPostgreSQL(callback) {
    logger.info('> migrate notes from old db postgresql to new db postgresql');
    var client = new pg.Client(config.old_db_postgresql);
    client.connect(function (err) {
        if (err) {
            client.end();
            logger.error('connect to old db postgresql failed: ' + err);
            return callback(err);
        }
        var selectquery = "SELECT * FROM notes ORDER BY create_time ASC;";
        client.query(selectquery, function (err, result) {
            client.end();
            if (err) {
                logger.error('select notes in the old db postgresql failed: ' + err);
                return callback(err);
            }
            var notes = result.rows;
            if (notes.length <= 0) {
                logger.info('not found any notes!');
                return callback();
            } else {
                logger.info('found ' + notes.length + ' notes!');
                async.forEachOfSeries(notes, function (note, key, _callback) {
                    var where = null;
                    if (models.Note.checkNoteIdValid(note.id)) {
                        where = {
                            id: note.id
                        };
                    } else {
                        where = {
                            alias: note.id
                        };
                    }
                    var values = util._extend({
                        title: note.title,
                        content: note.content,
                        createdAt: note.create_time,
                        updatedAt: note.update_time || note.create_time
                    }, where);
                    // if note title is not compressed, do it now
                    if (values.title) {
                        var title = LZString.decompressFromBase64(values.title);
                        if (!title) {
                            values.title = LZString.compressToBase64(note.title);
                        }
                    } else {
                        var body = LZString.decompressFromBase64(note.content);
                        var title = models.Note.parseNoteTitle(body);
                        values.title = LZString.compressToBase64(title);
                    }
                    models.Note.findOrCreate({
                        where: where,
                        defaults: values,
                        silent: true
                    }).spread(function (_note, created) {
                        if (!created) {
                            logger.info('note already exists: ' + note.id);
                        }
                        var create_time = moment(note.create_time);
                        var update_time = moment(note.update_time);
                        if (!create_time.isSame(update_time)) {
                            values.lastchangeAt = note.update_time;
                        }
                        var createdAt = moment(_note.createdAt);
                        var updatedAt = moment(_note.updatedAt);
                        if (createdAt.isAfter(create_time)) {
                            values.createdAt = note.create_time;
                        }
                        if (updatedAt.isBefore(update_time)) {
                            values.updatedAt = note.update_time;
                        }
                        // every note should have permission
                        if (!_note.permission) {
                            if (note.owner && note.owner !== "null") {
                                values.permission = 'editable';
                            } else {
                                values.permission = 'freely';
                            }
                        }
                        // if owner exists, find coressponding new user and replace to its new id
                        if (note.owner && note.owner !== "null" && ObjectId.isValid(note.owner) && !_note.ownerId) {
                            // from mongodb
                            User.model.findOne({
                                _id: new ObjectId(note.owner)
                            }, function (err, user) {
                                if (err) return _callback(err);
                                if (user) {
                                    // from new postgresql db
                                    models.User.findOne({
                                        where: {
                                            profileid: user.id
                                        }
                                    }).then(function (_user) {
                                        if (_user) values.ownerId = _user.id;
                                        showProgress(key, notes.length, 'notes');
                                        noteUpdate(values, _note, _callback);
                                    }).catch(function (err) {
                                        return _callback(err);
                                    });
                                } else {
                                    showProgress(key, notes.length, 'notes');
                                    noteUpdate(values, _note, _callback);
                                }
                            });
                        } else {
                            showProgress(key, notes.length, 'notes');
                            noteUpdate(values, _note, _callback);
                        }
                    }).catch(function (err) {
                        return _callback(err);
                    });
                }, function (err) {
                    if (err) {
                        logger.error('migrate notes failed: ' + err);
                        return callback(err);
                    }
                    models.Note.count().then(function (count) {
                        logger.info('migrate notes success: ' + count + '/' + notes.length);
                        return callback();
                    }).catch(function (err) {
                        logger.error('count new db postgresql notes failed: ' + err);
                        return callback(err);
                    });
                });
            }
        });
    });
}

function noteUpdate(values, _note, _callback) {
    _note.update(values, {
        silent: true
    }).then(function (_note) {
        return _callback();
    }).catch(function (err) {
        return _callback(err);
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
        logger.error('connect to old db mongodb failed: ' + err);
        throw err;
    }
    // connect to the old db postgresql
    var client = new pg.Client(config.old_db_postgresql);
    client.connect(function (err) {
        client.end();
        if (err) {
            logger.error('connect to old db postgresql failed: ' + err);
            throw err;
        }
        logger.info('connect to old db postgresql success!');
        logger.info('---start migration---');
        async.series({
            migrateSessions: migrateSessions,
            migrateTemps: migrateTemps,
            migrateUsers: migrateUsers,
            migrateNotesFromMongoDB: migrateNotesFromMongoDB,
            migrateNotesFromPostgreSQL: migrateNotesFromPostgreSQL
        }, function(err, results) {
            if (err) {
                throw err;
            } else {
                logger.info('---migration complete---');
                process.exit(0);
            }
        });
    });
}).catch(function (err) {
    logger.error('migration failed: ' + util.inspect(err));
    process.exit(1);
});

// log uncaught exception
process.on('uncaughtException', function (err) {
    logger.error(err);
    process.exit(1);
});