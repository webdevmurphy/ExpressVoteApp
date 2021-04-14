const mongoose = require("mongoose");

module.exports = function(db) {
let voteSchema = new mongoose.Schema({
voterId: String,
district: Number,
votes:mongoose.Schema.Types.Mixed,
});

return db.model('Vote', voteSchema);
};