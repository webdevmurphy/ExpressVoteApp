const mongoose = require("mongoose");
module.exports = function(db) {
let raceSchema = new mongoose.Schema({
office: String,
districts: [Number],
candidates: [{name: String, party: String}]
});

return db.model('Race', raceSchema);
};
