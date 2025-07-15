const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const { isAuthenticated } = require('../middleware/auth');

// List all sales - GET /sales
router.get('/sales', isAuthenticated, async (req, res) => {
  try {
    const sales = await Sale.find().sort({ saleDate: -1 });
    const items = await Item.find({ status: 'Active' }).sort({ itemName: 1 });
    const customers = await Customer.find({ status: 'Active' }).sort({ fullName: 1 });

    res.render('sales', {
      sales,
      items,
      customers,
      csrfToken: req.csrfToken(),
      errorMessage: req.flash('error'),
      successMessage: req.flash('success')
    });
  } catch (err) {
    console.error('Error fetching sales:', err);
    req.flash('error', 'Failed to load sales data');
    res.redirect('/dashboard');
  }
});

// Get single sale as JSON for edit - GET /sales/:id
router.get('/sales/:id', isAuthenticated, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(sale);
  } catch (err) {
    console.error('Error fetching sale:', err);
    res.status(500).json({ error: 'Failed to fetch sale details' });
  }
});

// Add new sale - POST /sales
router.post('/sales', isAuthenticated, async (req, res) => {
  try {
    const { itemNumber, customerId, saleDate, quantity, unitPrice } = req.body;

    // Validate required fields
    if (!itemNumber || !customerId || !saleDate || !quantity || !unitPrice) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/sales');
    }

    if (quantity <= 0) {
      req.flash('error', 'Quantity must be greater than zero.');
      return res.redirect('/sales');
    }

    if (unitPrice <= 0) {
      req.flash('error', 'Unit price must be greater than zero.');
      return res.redirect('/sales');
    }

    // Check item & customer existence
    const item = await Item.findOne({ itemNumber });
    if (!item) {
      req.flash('error', 'Item not found.');
      return res.redirect('/sales');
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      req.flash('error', 'Customer not found.');
      return res.redirect('/sales');
    }

    // Check stock availability
    if (item.stock < quantity) {
      req.flash('error', `Insufficient stock. Only ${item.stock} available.`);
      return res.redirect('/sales');
    }

    // Generate sale ID
    const count = await Sale.countDocuments();
    const saleId = `SALE${(count + 1).toString().padStart(4, '0')}`;

    const total = quantity * unitPrice;

    const sale = new Sale({
      saleId,
      saleDate,
      itemNumber,
      itemName: item.itemName,
      customerId,
      customerName: customer.fullName,
      quantity,
      unitPrice,
      total,
      createdBy: req.session.user._id,
      createdAt: new Date()
    });

    await sale.save();

    // Update item stock
    item.stock -= quantity;
    await item.save();

    req.flash('success', `Sale #${saleId} recorded successfully.`);
    res.redirect('/sales');
  } catch (err) {
    console.error('Error creating sale:', err);
    req.flash('error', 'Failed to record sale.');
    res.redirect('/sales');
  }
});

// Update existing sale - PUT /sales/:id
router.post('/sales/:id', isAuthenticated, async (req, res) => {
  try {
    const { quantity, unitPrice } = req.body;

    if (quantity <= 0 || unitPrice <= 0) {
      req.flash('error', 'Quantity and unit price must be greater than zero.');
      return res.redirect('/sales');
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      req.flash('error', 'Sale not found.');
      return res.redirect('/sales');
    }

    const item = await Item.findOne({ itemNumber: sale.itemNumber });
    if (!item) {
      req.flash('error', 'Item not found.');
      return res.redirect('/sales');
    }

    // Calculate stock adjustment
    const quantityDiff = quantity - sale.quantity;

    if (quantityDiff > 0 && item.stock < quantityDiff) {
      req.flash('error', `Insufficient stock to increase quantity by ${quantityDiff}. Only ${item.stock} available.`);
      return res.redirect('/sales');
    }

    // Update item stock accordingly
    item.stock -= quantityDiff;
    await item.save();

    const total = quantity * unitPrice;

    await Sale.findByIdAndUpdate(req.params.id, {
      quantity,
      unitPrice,
      total,
      updatedBy: req.session.user._id,
      updatedAt: new Date()
    });

    req.flash('success', 'Sale updated successfully.');
    res.redirect('/sales');
  } catch (err) {
    console.error('Error updating sale:', err);
    req.flash('error', 'Failed to update sale.');
    res.redirect('/sales');
  }
});

// Delete sale - POST /sales/delete/:id
router.post('/sales/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      req.flash('error', 'Sale not found.');
      return res.redirect('/sales');
    }

    const item = await Item.findOne({ itemNumber: sale.itemNumber });
    if (item) {
      item.stock += sale.quantity;  // Revert stock
      await item.save();
    }

    await Sale.findByIdAndDelete(req.params.id);

    req.flash('success', `Sale #${sale.saleId} deleted successfully.`);
    res.redirect('/sales');
  } catch (err) {
    console.error('Error deleting sale:', err);
    req.flash('error', 'Failed to delete sale.');
    res.redirect('/sales');
  }
});

module.exports = router;
