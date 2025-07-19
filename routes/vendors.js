const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const { isAuthenticated } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Vendors
 *   description: Vendor management
 */

/**
 * @swagger
 * /vendors:
 *   get:
 *     summary: Get list of all vendors
 *     tags: [Vendors]
 *     responses:
 *       200:
 *         description: List of vendors
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: HTML page with vendors list
 *       302:
 *         description: Redirect to home if error occurs
 *     security:
 *       - sessionAuth: []
 */
router.get('/vendors', isAuthenticated, async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ fullName: 1 });
    res.render('vendors', {
      vendors,
      csrfToken: req.csrfToken(),
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load vendors');
    res.redirect('/');
  }
});

/**
 * @swagger
 * /vendors/{id}:
 *   get:
 *     summary: Get a single vendor by ID
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vendor'
 *       404:
 *         description: Vendor not found
 *       500:
 *         description: Server error
 *     security:
 *       - sessionAuth: []
 */
router.get('/vendors/:id', isAuthenticated, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get vendor data' });
  }
});

/**
 * @swagger
 * /vendors:
 *   post:
 *     summary: Create a new vendor
 *     tags: [Vendors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               status:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phoneMobile:
 *                 type: string
 *               phone2:
 *                 type: string
 *               address:
 *                 type: string
 *               address2:
 *                 type: string
 *               city:
 *                 type: string
 *               district:
 *                 type: string
 *               _csrf:
 *                 type: string
 *             required:
 *               - fullName
 *               - phoneMobile
 *               - address
 *               - _csrf
 *     responses:
 *       302:
 *         description: Redirect to vendors list
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /vendors
 *     security:
 *       - sessionAuth: []
 */
router.post('/vendors', async (req, res) => {
  const { fullName, status, email, phoneMobile, address, city } = req.body;
  try {
    if (!fullName || !phoneMobile || !address) {
      req.flash('error', 'Name, phone, and address are required');
      return res.redirect('/vendors');
    }

    const vendor = new Vendor({
      fullName,
      status: status || 'Active',
      email,
      phoneMobile,
      phone2: req.body.phone2 || '',
      address,
      address2: req.body.address2 || '',
      city,
      district: req.body.district || '',
      createdBy: req.session.user ? req.session.user.id : null,
    });

    await vendor.save();
    req.flash('success', 'Vendor added successfully');
    res.redirect('/vendors');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to add vendor');
    res.redirect('/vendors');
  }
});

/**
 * @swagger
 * /vendors/{id}:
 *   post:
 *     summary: Update a vendor
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Vendor ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               status:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phoneMobile:
 *                 type: string
 *               phone2:
 *                 type: string
 *               address:
 *                 type: string
 *               address2:
 *                 type: string
 *               city:
 *                 type: string
 *               district:
 *                 type: string
 *             required:
 *               - fullName
 *               - phoneMobile
 *               - address
 *     responses:
 *       302:
 *         description: Redirect to vendors list
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /vendors
 *     security:
 *       - sessionAuth: []
 */
router.post('/vendors/:id', isAuthenticated, async (req, res) => {
  try {
    const { fullName, status, email, phoneMobile, address } = req.body;
    if (!fullName || !phoneMobile || !address) {
      req.flash('error', 'Name, phone, and address are required');
      return res.redirect('/vendors');
    }

    await Vendor.findByIdAndUpdate(req.params.id, {
      fullName,
      status,
      email,
      phoneMobile,
      phone2: req.body.phone2 || '',
      address,
      address2: req.body.address2 || '',
      city: req.body.city || '',
      district: req.body.district || '',
      updatedAt: Date.now(),
    });

    req.flash('success', 'Vendor updated successfully');
    res.redirect('/vendors');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update vendor');
    res.redirect('/vendors');
  }
});

/**
 * @swagger
 * /vendors/delete/{id}:
 *   post:
 *     summary: Delete a vendor
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Vendor ID to delete
 *     responses:
 *       302:
 *         description: Redirect to vendors list
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: /vendors
 *     security:
 *       - sessionAuth: []
 */
router.post('/vendors/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await Vendor.findByIdAndDelete(req.params.id);
    req.flash('success', 'Vendor deleted successfully');
    res.redirect('/vendors');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete vendor');
    res.redirect('/vendors');
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Vendor:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the vendor
 *         fullName:
 *           type: string
 *           description: Vendor's full name
 *         status:
 *           type: string
 *           enum: [Active, Inactive]
 *           description: Vendor status
 *         email:
 *           type: string
 *           format: email
 *         phoneMobile:
 *           type: string
 *         phone2:
 *           type: string
 *         address:
 *           type: string
 *         address2:
 *           type: string
 *         city:
 *           type: string
 *         district:
 *           type: string
 *         createdBy:
 *           type: string
 *           description: ID of the user who created the vendor
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - fullName
 *         - phoneMobile
 *         - address
 */

module.exports = router;