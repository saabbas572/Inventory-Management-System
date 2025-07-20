/**
 * @swagger
 * tags:
 *   name: Purchases
 *   description: Purchase management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Purchase:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the purchase
 *         purchaseId:
 *           type: string
 *           description: The human-readable purchase ID
 *         purchaseDate:
 *           type: string
 *           format: date
 *         itemNumber:
 *           type: string
 *         itemName:
 *           type: string
 *         vendor:
 *           type: string
 *           description: Reference to Vendor
 *         quantity:
 *           type: integer
 *         unitPrice:
 *           type: number
 *           format: float
 *         totalCost:
 *           type: number
 *           format: float
 *         createdBy:
 *           type: string
 *           description: Reference to User who created
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - purchaseId
 *         - purchaseDate
 *         - itemNumber
 *         - vendor
 *         - quantity
 *         - unitPrice
 *   securitySchemes:
 *     sessionAuth:
 *       type: apiKey
 *       in: cookie
 *       name: connect.sid
 */

/**
 * @swagger
 * /purchases:
 *   get:
 *     summary: Get list of purchases with filtering options
 *     tags: [Purchases]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering (YYYY-MM-DD)
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *         description: Vendor ID to filter by
 *     responses:
 *       200:
 *         description: HTML page with purchases list
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       302:
 *         description: Redirect to dashboard if error occurs
 *     security:
 *       - sessionAuth: []
 */

/**
 * @swagger
 * /purchases/{id}:
 *   get:
 *     summary: Get details of a specific purchase
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Purchase ID
 *     responses:
 *       200:
 *         description: HTML page with purchase details
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       302:
 *         description: Redirect to purchases list if error occurs
 *     security:
 *       - sessionAuth: []
 */

/**
 * @swagger
 * /purchases/{id}/edit:
 *   get:
 *     summary: Get edit form for a purchase
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Purchase ID
 *     responses:
 *       200:
 *         description: HTML edit form
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       302:
 *         description: Redirect to purchases list if error occurs
 *     security:
 *       - sessionAuth: []
 */

/**
 * @swagger
 * /purchases:
 *   post:
 *     summary: Create a new purchase
 *     tags: [Purchases]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               itemNumber:
 *                 type: string
 *               vendorId:
 *                 type: string
 *               purchaseDate:
 *                 type: string
 *                 format: date
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *                 format: float
 *               _csrf:
 *                 type: string
 *             required:
 *               - itemNumber
 *               - vendorId
 *               - purchaseDate
 *               - quantity
 *               - unitPrice
 *     responses:
 *       302:
 *         description: Redirect to purchases list
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /purchases
 *     security:
 *       - sessionAuth: []
 */

/**
 * @swagger
 * /purchases/{id}/update:
 *   post:
 *     summary: Update a purchase
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Purchase ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *                 format: float
 *               _csrf:
 *                 type: string
 *             required:
 *               - quantity
 *               - unitPrice
 *     responses:
 *       302:
 *         description: Redirect to purchases list
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /purchases
 *     security:
 *       - sessionAuth: []
 */

/**
 * @swagger
 * /purchases/{id}/delete:
 *   post:
 *     summary: Delete a purchase
 *     tags: [Purchases]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Purchase ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               _csrf:
 *                 type: string
 *     responses:
 *       302:
 *         description: Redirect to purchases list
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /purchases
 *     security:
 *       - sessionAuth: []
 */

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


router.post('/purchases', isAuthenticated, async (req, res) => {
  const { itemNumber, vendorId, purchaseDate, quantity, unitPrice } = req.body;

  try {

    // Input validation
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

    // Find item and vendor
    const item = await Item.findOne({ itemNumber });
    const vendor = await Vendor.findById(vendorId);

    if (!item || !vendor) {
      req.flash('error', !item ? 'Item not found' : 'Vendor not found');
      return res.redirect('/purchases');
    }

    // Get next purchase ID
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

    // Update stock
    item.stock += parsedQuantity;
    await item.save();

    req.flash('success', `Purchase #${purchaseId} recorded successfully`);
    res.redirect('/purchases');
  } catch (err) {
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
    req.flash('error', 'Failed to delete purchase');
    res.redirect('/purchases');
  }
});

module.exports = router;
