const mongoose = require("mongoose");
module.exports = function(db) {
let tallySchema = new mongoose.Schema({
votes:[Array]
});

return db.model('Tally', tallySchema);
};