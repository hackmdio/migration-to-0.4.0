//temp
//external modules
var mongoose = require('mongoose');

// create a temp model
var model = mongoose.model('temp', {
    id: String,
    data: String,
    created: Date
});

//public
var temp = {
    model: model
};

module.exports = temp;