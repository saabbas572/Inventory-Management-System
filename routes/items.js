const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { isAuthenticated } = require('../middleware/auth');
const csrf = require('csurf');

const csrfProtection = csrf({ cookie: false });

// GET items list page
router.get('/items', isAuthenticated, csrfProtection, async (req, res) => {
  try {
    const { status, search, success, error } = req.query;
    let query = {};

    if (status && ['Active', 'Inactive'].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { itemNumber: { $regex: search, $options: 'i' } },
        { itemName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await Item.find(query).sort({ itemName: 1 }).lean();

    res.render('items', { 
      user: req.session.user,
      items,
      currentStatus: status || 'All',
      searchQuery: search || '',
      successMessage: success || null,
      errorMessage: error || null,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error(err);
    res.redirect('/items?error=Failed to load items');
  }
});

// API: Fetch single item data for editing (JSON)
router.get('/items/:id', isAuthenticated, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).lean();
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Add new item
router.post('/items', isAuthenticated, csrfProtection, async (req, res) => {
  try {
    const { itemNumber, itemName, description, discountPercent, stock, unitPrice, status } = req.body;

    if (!itemNumber || !itemName || !unitPrice) {
      return res.redirect('/items?error=Item number, name, and unit price are required');
    }

    const existingItem = await Item.findOne({ itemNumber });
    if (existingItem) {
      return res.redirect('/items?error=Item number already exists');
    }

    if (isNaN(discountPercent) || isNaN(stock) || isNaN(unitPrice)) {
      return res.redirect('/items?error=Discount, stock, and price must be numbers');
    }

    if (unitPrice <= 0) {
      return res.redirect('/items?error=Unit price must be greater than 0');
    }

    const newItem = new Item({
      itemNumber,
      itemName,
      description,
      discountPercent: parseFloat(discountPercent) || 0,
      stock: parseInt(stock) || 0,
      unitPrice: parseFloat(unitPrice),
      status: status || 'Active',
      createdBy: req.session.user._id
    });

    await newItem.save();
    res.redirect(`/items?success=${encodeURIComponent(`Item "${itemName}" added successfully`)}`);
  } catch (error) {
    console.error(error);
    res.redirect('/items?error=Failed to add item');
  }
});

// Update existing item
router.post('/items/:id', isAuthenticated, csrfProtection, async (req, res) => {
  try {
    const { itemNumber, itemName, description, discountPercent, stock, unitPrice, status } = req.body;

    if (!itemNumber || !itemName || !unitPrice) {
      return res.redirect('/items?error=Item number, name, and unit price are required');
    }

    if (isNaN(discountPercent) || isNaN(stock) || isNaN(unitPrice)) {
      return res.redirect('/items?error=Discount, stock, and price must be numbers');
    }

    if (unitPrice <= 0) {
      return res.redirect('/items?error=Unit price must be greater than 0');
    }

    const updateData = {
      itemNumber,
      itemName,
      description,
      discountPercent: parseFloat(discountPercent) || 0,
      stock: parseInt(stock) || 0,
      unitPrice: parseFloat(unitPrice),
      status: status || 'Active',
      updatedBy: req.session.user._id,
      updatedAt: Date.now()
    };

    await Item.findByIdAndUpdate(req.params.id, updateData);
    res.redirect(`/items?success=${encodeURIComponent(`Item "${itemName}" updated successfully`)}`);
  } catch (error) {
    console.error(error);
    res.redirect('/items?error=Failed to update item');
  }
});

// Toggle item status (Active/Inactive)
router.post('/items/toggle-status/:id', isAuthenticated, csrfProtection, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.redirect('/items?error=Item not found');
    }

    item.status = item.status === 'Active' ? 'Inactive' : 'Active';
    item.updatedBy = req.session.user._id;
    item.updatedAt = Date.now();
    await item.save();

    res.redirect(`/items?success=Item status changed to ${item.status}`);
  } catch (err) {
    console.error(err);
    res.redirect('/items?error=Failed to update item status');
  }
});

// Delete item
router.post('/items/delete/:id', isAuthenticated, csrfProtection, async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.redirect('/items?error=Item not found');
    }

    res.redirect(`/items?success=${encodeURIComponent(`Item "${item.itemName}" deleted successfully`)}`);
  } catch (err) {
    console.error(err);
    res.redirect('/items?error=Failed to delete item');
  }
});

module.exports = router;