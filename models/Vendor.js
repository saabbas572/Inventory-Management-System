const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  email: String,
  phoneMobile: {
    type: String,
    required: true
  },
  phone2: String,
  address: {
    type: String,
    required: true
  },
  address2: String,
  city: String,
  district: String
}, { timestamps: true });

module.exports = mongoose.model('Vendor', VendorSchema);