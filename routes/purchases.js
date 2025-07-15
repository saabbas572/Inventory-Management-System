const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Item = require('../models/Item');
const Vendor = require('../models/Vendor');
const { isAuthenticated } = require('../middleware/auth');

router.get('/purchases', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate, vendorId } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.purchaseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (vendorId) {
      query.vendor = vendorId; // Changed from vendorId to vendor to match schema
    }

    const purchases = await Purchase.find(query)
      .sort({ purchaseDate: -1 })
      .populate('vendor', 'fullName'); // Add this line to populate vendor data

    const items = await Item.find({ status: 'Active' }).sort({ itemName: 1 });
    const vendors = await Vendor.find({ status: 'Active' }).sort({ fullName: 1 });

    res.render('purchases', {
      purchases,
      items,
      vendors,
      user: req.session.user,
      startDate: startDate || '',
      endDate: endDate || '',
      selectedVendor: vendorId || '',
      csrfToken: req.csrfToken(),
      successMessage: req.flash('success')[0] || '',
      errorMessage: req.flash('error')[0] || ''
    });
  } catch (err) {
    console.error('Error loading purchases:', err);
    req.flash('error', 'Failed to load purchases');
    res.redirect('/dashboard');
  }
});

// POST: Add a new purchase
router.post('/purchases', isAuthenticated, async (req, res) => {
  const { itemNumber, vendorId, purchaseDate, quantity, unitPrice } = req.body;
  console.log("POST /purchases req.body:", req.body); // Debug line

  try {
    const parsedQuantity = parseInt(quantity);
    const parsedUnitPrice = parseFloat(unitPrice);

    if (!itemNumber || !vendorId || !purchaseDate || isNaN(parsedQuantity) || isNaN(parsedUnitPrice) || parsedQuantity <= 0 || parsedUnitPrice <= 0) {
      req.flash('error', 'All fields must be valid');
      return res.redirect('/purchases');
    }

    const item = await Item.findOne({ itemNumber });
    const vendor = await Vendor.findById(vendorId);

    if (!item || !vendor) {
      req.flash('error', !item ? 'Item not found' : 'Vendor not found');
      return res.redirect('/purchases');
    }

    const count = await Purchase.countDocuments();
    const purchaseId = `PUR${(count + 1).toString().padStart(4, '0')}`;
    const totalCost = parsedQuantity * parsedUnitPrice;

    const newPurchase = new Purchase({
      purchaseId,
      purchaseDate,
      itemNumber,
      itemName: item.itemName,
      vendor: vendorId,          // Correct field name here
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
      totalCost,
      createdBy: req.session.user._id
    });

    await newPurchase.save();

    item.stock += parsedQuantity;
    await item.save();

    req.flash('success', `Purchase #${purchaseId} recorded successfully`);
    res.redirect('/purchases');
  } catch (err) {
    console.error('Error adding purchase:', err);
    req.flash('error', 'Failed to add purchase');
    res.redirect('/purchases');
  }
});


// POST: Delete a purchase
router.post('/purchases/:id/delete', isAuthenticated, async (req, res) => {
  const purchaseId = req.params.id;

  try {
    const purchase = await Purchase.findById(purchaseId);

    if (!purchase) {
      req.flash('error', 'Purchase not found');
      return res.redirect('/purchases');
    }

    // Decrease stock of item
    const item = await Item.findOne({ itemNumber: purchase.itemNumber });
    if (item) {
      item.stock -= purchase.quantity;
      await item.save();
    }

    await Purchase.findByIdAndDelete(purchaseId);

    req.flash('success', `Purchase ${purchase.purchaseId} deleted successfully`);
    res.redirect('/purchases');
  } catch (err) {
    console.error('Error deleting purchase:', err);
    req.flash('error', 'Failed to delete purchase');
    res.redirect('/purchases');
  }
});



module.exports = router;
