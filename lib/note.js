//note
//external modules
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var shortId = require('shortid');

//permission types
permissionTypes = ["freely", "editable", "locked", "private"];

// create a note model
var model = mongoose.model('note', {
    id: String,
    shortid: {
        type: String,
        unique: true,
        default: shortId.generate
    },
    permission: {
        type: String,
        enum: permissionTypes
    },
    lastchangeuser: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    viewcount: {
        type: Number,
        default: 0
    },
    updated: Date,
    created: Date
});

//public
var note = {
    model: model
};

module.exports = note;