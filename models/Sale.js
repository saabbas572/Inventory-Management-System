const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
  saleId: {
    type: String,
    unique: true
  },
  saleDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  itemNumber: {
    type: Number,
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  customerId: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);