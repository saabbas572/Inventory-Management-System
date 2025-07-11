const mongoose = require('mongoose');

const PurchaseSchema = new mongoose.Schema({
  purchaseId: {
    type: String,
    unique: true
  },
  purchaseDate: {
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
  vendor: {  // <-- updated here
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
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
  totalCost: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

// EXPORT the model (this is important!)
module.exports = mongoose.model('Purchase', PurchaseSchema);
