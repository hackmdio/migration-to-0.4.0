//user
//external modules
var mongoose = require('mongoose');

// create a user model
var model = mongoose.model('user', {
    id: String,
    profile: String,
    history: String,
    created: Date
});

//public
var user = {
    model: model
};

module.exports = user;