const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  itemNumber: {
    type: Number,
    required: true,
    unique: true
  },
  itemName: {
    type: String,
    required: true
  },
  description: String,
  discountPercent: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    default: 0
  },
  unitPrice: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  imagePath: String
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);