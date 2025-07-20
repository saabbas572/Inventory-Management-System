/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Sale:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the sale
 *         saleId:
 *           type: string
 *           description: The human-readable sale ID (e.g., SALE0001)
 *         saleDate:
 *           type: string
 *           format: date
 *         itemNumber:
 *           type: string
 *         itemName:
 *           type: string
 *         customerId:
 *           type: string
 *         customerName:
 *           type: string
 *         quantity:
 *           type: integer
 *         unitPrice:
 *           type: number
 *           format: float
 *         total:
 *           type: number
 *           format: float
 *         discountPercent:
 *           type: number
 *           format: float
 *         createdBy:
 *           type: string
 *           description: ID of the user who created the sale
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - saleId
 *         - saleDate
 *         - itemNumber
 *         - customerId
 *         - quantity
 *         - unitPrice
 *         - total
 *   securitySchemes:
 *     sessionAuth:
 *       type: apiKey
 *       in: cookie
 *       name: connect.sid
 */

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Get list of all sales
 *     tags: [Sales]
 *     responses:
 *       200:
 *         description: HTML page with sales list
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
 * /sales:
 *   post:
 *     summary: Create a new sale
 *     tags: [Sales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               itemNumber:
 *                 type: string
 *                 description: Item number being sold
 *               customerId:
 *                 type: string
 *                 description: Customer ID
 *               saleDate:
 *                 type: string
 *                 format: date
 *                 description: Date of sale (YYYY-MM-DD)
 *               quantity:
 *                 type: integer
 *                 description: Quantity sold
 *               unitPrice:
 *                 type: number
 *                 format: float
 *                 description: Price per unit
 *               applyDiscount:
 *                 type: string
 *                 description: Whether to apply discount ('on' or omitted)
 *               _csrf:
 *                 type: string
 *                 description: CSRF token
 *             required:
 *               - itemNumber
 *               - customerId
 *               - saleDate
 *               - quantity
 *               - unitPrice
 *               - _csrf
 *     responses:
 *       302:
 *         description: Redirect to sales list
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /sales
 *     security:
 *       - sessionAuth: []
 */

/**
 * @swagger
 * /sales/{id}:
 *   post:
 *     summary: Update a sale
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Sale ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               itemNumber:
 *                 type: string
 *               customerId:
 *                 type: string
 *               saleDate:
 *                 type: string
 *               quantity:
 *                 type: integer
 *               unitPrice:
 *                 type: number
 *               _csrf:
 *                 type: string
 *             required:
 *               - itemNumber
 *               - customerId
 *               - saleDate
 *               - quantity
 *               - unitPrice
 *               - _csrf
 *     responses:
 *       302:
 *         description: Redirect to sales list
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /sales
 *     security:
 *       - sessionAuth: []
 */

/**
 * @swagger
 * /sales/delete/{id}:
 *   post:
 *     summary: Delete a sale
 *     tags: [Sales]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Sale ID to delete
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
 *         description: Redirect to sales list
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /sales
 *     security:
 *       - sessionAuth: []
 */

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
      user: req.session.user
    });
  } catch (err) {
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

router.post('/sales', isAuthenticated, async (req, res) => {
  try {
    const {
      itemNumber,
      customerId,
      saleDate,
      quantity,
      unitPrice,
      applyDiscount
    } = req.body;

    const parsedQuantity = parseInt(quantity);
    const parsedUnitPrice = parseFloat(unitPrice);

    if (!itemNumber || !customerId || !saleDate || !quantity || !unitPrice) {
      req.flash('error', 'All fields are required');
      return res.redirect('/sales');
    }
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      req.flash('error', 'Invalid quantity');
      return res.redirect('/sales');
    }
    if (isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) {
      req.flash('error', 'Invalid unit price');
      return res.redirect('/sales');
    }

    const item = await Item.findOne({ itemNumber });
    if (!item) {
      req.flash('error', `Item not found with number ${itemNumber}`);
      return res.redirect('/sales');
    }

const customer = await Customer.findOne({ _id: customerId });
    if (!customer) {
      req.flash('error', 'Customer not found');
      return res.redirect('/sales');
    }

    if (item.stock < parsedQuantity) {
      req.flash('error', `Insufficient stock. Only ${item.stock} available`);
      return res.redirect('/sales');
    }

    let discountPercent = 0;
    let finalUnitPrice = parsedUnitPrice;

    if (applyDiscount === 'on') {
      discountPercent = item.discountPercent || 0;
      finalUnitPrice = parsedUnitPrice * (1 - discountPercent / 100);
    }

    const total = parsedQuantity * finalUnitPrice;

    const count = await Sale.countDocuments();
    // Generate sale ID safely by getting max existing saleId
const lastSale = await Sale.findOne().sort({ saleId: -1 }).exec();

let nextNumber = 1;
if (lastSale && lastSale.saleId) {
  const match = lastSale.saleId.match(/SALE(\d+)/);
  if (match) {
    nextNumber = parseInt(match[1], 10) + 1;
  }
}

const saleId = `SALE${nextNumber.toString().padStart(4, '0')}`;
    const sale = new Sale({
      saleId,
      saleDate,
      itemNumber,
      itemName: item.itemName,
      customerId,
      customerName: customer.fullName,
      quantity: parsedQuantity,
      unitPrice: finalUnitPrice,
      total,
      discountPercent,
      createdBy: req.session.user._id
    });

    await sale.save();

    // Decrease stock
    item.stock -= parsedQuantity;
    await item.save();

    req.flash('success', `Sale #${saleId} recorded successfully`);
    res.redirect('/sales');
  } catch (err) {
    req.flash('error', 'Failed to record sale');
    res.redirect('/sales');
  }
});


// Update existing sale - POST /sales/:id
router.post('/sales/:id', isAuthenticated, async (req, res) => {
  try {
    const { itemNumber, customerId, saleDate } = req.body;
    const quantity = Number(req.body.quantity);
    const unitPrice = Number(req.body.unitPrice);

    if (quantity <= 0 || unitPrice <= 0) {
      req.flash('error', 'Quantity and unit price must be greater than zero');
      return res.redirect('/sales');
    }

    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      req.flash('error', 'Sale not found');
      return res.redirect('/sales');
    }

    const item = await Item.findOne({ itemNumber: sale.itemNumber });
    if (!item) {
      req.flash('error', 'Item not found');
      return res.redirect('/sales');
    }

    // Calculate stock adjustment
    const quantityDiff = quantity - sale.quantity;

    if (quantityDiff > 0 && item.stock < quantityDiff) {
      req.flash('error', `Insufficient stock. Only ${item.stock} available`);
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

    req.flash('success', 'Sale updated successfully');
    res.redirect('/sales');
  } catch (err) {
    req.flash('error', 'Failed to update sale');
    res.redirect('/sales');
  }
});

// Delete sale - POST /sales/delete/:id
router.post('/sales/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      req.flash('error', 'Sale not found');
      return res.redirect('/sales');
    }

    const item = await Item.findOne({ itemNumber: sale.itemNumber });
    if (item) {
      item.stock += sale.quantity;  // Revert stock
      await item.save();
    }

    await Sale.findByIdAndDelete(req.params.id);

    req.flash('success', `Sale #${sale.saleId} deleted successfully`);
    res.redirect('/sales');
  } catch (err) {
    console.error('Error deleting sale:', err);
    req.flash('error', 'Failed to delete sale');
    res.redirect('/sales');
  }
});

module.exports = router;