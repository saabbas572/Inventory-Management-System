const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Item = require('../models/Item');
const Vendor = require('../models/Vendor');
const { isAuthenticated } = require('../middleware/auth');
const Sequence = require('../models/sequence'); // Add this line



async function getNextPurchaseId() {
  const sequence = await Sequence.findByIdAndUpdate(
    'purchaseId',
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return `PUR${sequence.sequence_value.toString().padStart(4, '0')}`;
}

// GET: Load purchases
router.get('/purchases', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate, vendorId } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.purchaseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (vendorId) {
      query.vendor = vendorId;
    }

    const purchases = await Purchase.find(query)
      .sort({ purchaseDate: -1 })
      .populate('vendor', 'fullName');

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
      errorMessage: req.flash('error')[0] || '',
    });
  } catch (err) {
    console.error('Error loading purchases:', err);
    req.flash('error', 'Failed to load purchases');
    res.redirect('/dashboard');
  }
});


// GET /purchases/:id/edit - show edit form for a purchase
router.get('/purchases/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('vendor', 'fullName');
    if (!purchase) {
      req.flash('error', 'Purchase not found');
      return res.redirect('/purchases');
    }

    const items = await Item.find({ status: 'Active' }).sort({ itemName: 1 });
    const vendors = await Vendor.find({ status: 'Active' }).sort({ fullName: 1 });

    res.render('purchase-edit', {
      purchase,
      items,
      vendors,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      successMessage: req.flash('success')[0] || '',
      errorMessage: req.flash('error')[0] || '',
    });
  } catch (err) {
    console.error('Error loading purchase edit page:', err);
    req.flash('error', 'Failed to load purchase edit form');
    res.redirect('/purchases');
  }
});


// POST /purchases/:id/update - process the form submission to update purchase
router.post('/purchases/:id/update', isAuthenticated, async (req, res) => {
  try {
    const { quantity, unitPrice } = req.body;
    const parsedQuantity = parseInt(quantity);
    const parsedUnitPrice = parseFloat(unitPrice);

    if (isNaN(parsedQuantity) || parsedQuantity < 1 || isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) {
      req.flash('error', 'Invalid quantity or unit price');
      return res.redirect(`/purchases/${req.params.id}/edit`);
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      req.flash('error', 'Purchase not found');
      return res.redirect('/purchases');
    }

    // Adjust stock: subtract old quantity from item stock
    const item = await Item.findOne({ itemNumber: purchase.itemNumber });
    if (item) {
      item.stock -= purchase.quantity; // remove old qty
      await item.save();
    }

    // Add new quantity to stock
    if (item) {
      item.stock += parsedQuantity;
      await item.save();
    }

    // Update purchase fields
    purchase.quantity = parsedQuantity;
    purchase.unitPrice = parsedUnitPrice;
    purchase.totalCost = parsedQuantity * parsedUnitPrice;

    await purchase.save();

    req.flash('success', 'Purchase updated successfully');
    res.redirect('/purchases');
  } catch (err) {
    console.error('Error updating purchase:', err);
    req.flash('error', 'Failed to update purchase');
    res.redirect(`/purchases/${req.params.id}/edit`);
  }
});


// GET: View single purchase details
router.get('/purchases/:id', isAuthenticated, async (req, res) => {
  try {
    const purchaseId = req.params.id;

    // Find purchase by Mongo _id
    const purchase = await Purchase.findById(purchaseId).populate('vendor', 'fullName');
    if (!purchase) {
      req.flash('error', 'Purchase not found');
      return res.redirect('/purchases');
    }

    // You can also load item details if needed
    const item = await Item.findOne({ itemNumber: purchase.itemNumber });

    res.render('purchase-details', { // create this view
      purchase,
      item,
      user: req.session.user,
      csrfToken: req.csrfToken(),
      successMessage: req.flash('success')[0] || '',
      errorMessage: req.flash('error')[0] || ''
    });
  } catch (err) {
    console.error('Error loading purchase details:', err);
    req.flash('error', 'Failed to load purchase details');
    res.redirect('/purchases');
  }
});


// POST: Add a new purchase
router.post('/purchases', isAuthenticated, async (req, res) => {
  const { itemNumber, vendorId, purchaseDate, quantity, unitPrice } = req.body;

  try {
    // Input validation (keep your existing code)
    const parsedQuantity = parseInt(quantity);
    const parsedUnitPrice = parseFloat(unitPrice);

    if (
      !itemNumber || !vendorId || !purchaseDate ||
      isNaN(parsedQuantity) || parsedQuantity <= 0 ||
      isNaN(parsedUnitPrice) || parsedUnitPrice <= 0
    ) {
      req.flash('error', 'All fields must be valid');
      return res.redirect('/purchases');
    }

    // Check item and vendor (keep your existing code)
    const item = await Item.findOne({ itemNumber });
    const vendor = await Vendor.findById(vendorId);

    if (!item || !vendor) {
      req.flash('error', !item ? 'Item not found' : 'Vendor not found');
      return res.redirect('/purchases');
    }

    // Generate safe purchase ID
    const purchaseId = await getNextPurchaseId();
    const totalCost = parsedQuantity * parsedUnitPrice;

    const purchaseData = {
      purchaseId,
      purchaseDate,
      itemNumber,
      itemName: item.itemName,
      vendor: vendorId,
      quantity: parsedQuantity,
      unitPrice: parsedUnitPrice,
      totalCost,
      createdBy: req.session.user._id,
    };

    const newPurchase = await Purchase.create(purchaseData);

    // Update stock (keep your existing code)
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
