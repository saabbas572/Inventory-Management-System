const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  status: { type: String, default: 'Active' },
  phoneMobile: { type: String, required: true },
  phone2: { type: String },
  email: { type: String },
  address: { type: String, required: true },
  address2: { type: String },
  city: { type: String },
  district: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date }
});

module.exports = mongoose.model('Customer', customerSchema);
