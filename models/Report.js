const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reportType: {
    type: String,
    required: true,
    enum: ['Sales', 'Purchases', 'Inventory', 'Customer', 'Vendor']
  },
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  filters: mongoose.Schema.Types.Mixed,
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  downloadUrl: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);