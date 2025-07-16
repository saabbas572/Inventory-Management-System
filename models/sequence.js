const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  _id: String, // will be 'purchaseId'
  sequence_value: { type: Number, default: 1 }
});

module.exports = mongoose.model('Sequence', sequenceSchema);