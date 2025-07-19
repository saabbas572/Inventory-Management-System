const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const { isAuthenticated } = require('../middleware/auth');

/**
 * @swagger
 * /customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Filter by customer status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, phone, or city
 *     responses:
 *       200:
 *         description: Rendered list of customers
 *       302:
 *         description: Redirect to dashboard on error
 */

// GET: Render all customers
router.get('/customers', isAuthenticated, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status && ['Active', 'Inactive'].includes(status)) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneMobile: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(query).sort({ fullName: 1 });

    res.render('customers', {
      customers,
      currentStatus: status || 'All',
      searchQuery: search || '',
      user: req.session.user,
      csrfToken: req.csrfToken(),
      successMessage: req.flash('success'),
      errorMessage: req.flash('error')
    });
  } catch (err) {
    console.error('Error loading customers:', err);
    req.flash('error', ['Failed to load customers']);
    res.redirect('/dashboard');
  }
});

/**
 * @swagger
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Customer object in JSON
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Server error
 */

// GET: Customer JSON for edit
router.get('/customers/:id', isAuthenticated, async (req, res) => {
  try {
    console.log('Fetching customer:', req.params.id);
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Failed to load customer' });
  }
});

/**
 * @swagger
 * /customers:
 *   post:
 *     summary: Add a new customer
 *     tags: [Customers]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phoneMobile
 *               - address
 *               - _csrf
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneMobile:
 *                 type: string
 *               phone2:
 *                 type: string
 *               email:
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
 *                 description: CSRF token
 *     responses:
 *       302:
 *         description: Redirect with flash message
 */

// POST: Add new customer
router.post('/customers', isAuthenticated, async (req, res) => {
  const {
    fullName, phoneMobile, email, address, phone2,
    address2, city, district
  } = req.body;

  console.log('Add customer request body:', req.body);

  try {
    if (!fullName || fullName.length < 2) {
      console.log('Validation failed: Full name');
      req.flash('error', ['Full name must be at least 2 characters']);
      return res.redirect('/customers');
    }

    if (!phoneMobile || !/^\d{10,15}$/.test(phoneMobile)) {
      console.log('Validation failed: Phone mobile');
      req.flash('error', ['Valid mobile number is required (10-15 digits)']);
      return res.redirect('/customers');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.log('Validation failed: Email format');
      req.flash('error', ['Invalid email format']);
      return res.redirect('/customers');
    }

    if (!address || address.length < 5) {
      console.log('Validation failed: Address');
      req.flash('error', ['Address must be at least 5 characters']);
      return res.redirect('/customers');
    }

    // Check for duplicates
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phoneMobile }]
    });

    if (existingCustomer) {
      console.log('Duplicate customer found');
      req.flash('error', ['Customer with this email or phone already exists']);
      return res.redirect('/customers');
    }

    // Create new ID
    const count = await Customer.countDocuments();
    const customerId = `CUST${(count + 1).toString().padStart(4, '0')}`;
    console.log('Generated customerId:', customerId);

    const newCustomer = new Customer({
      fullName,
      customerId,
      status: 'Active',
      phoneMobile,
      phone2,
      email,
      address,
      address2,
      city,
      district,
      createdBy: req.session.user._id,
      createdAt: new Date()
    });

    const saved = await newCustomer.save();
    console.log('Customer saved:', saved);

    req.flash('success', [`Customer "${fullName}" added successfully`]);
    res.redirect('/customers');
  } catch (err) {
    console.error('Error saving customer:', err);
    req.flash('error', ['Failed to add customer']);
    res.redirect('/customers');
  }
});

/**
 * @swagger
 * /customers/{id}:
 *   post:
 *     summary: Update customer by ID
 *     tags: [Customers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phoneMobile
 *               - address
 *               - _csrf
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneMobile:
 *                 type: string
 *               phone2:
 *                 type: string
 *               email:
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
 *                 description: CSRF token
 *     responses:
 *       302:
 *         description: Redirect with flash message
 */

// POST: Update customer
router.post('/customers/:id', isAuthenticated, async (req, res) => {
  try {
    console.log('Update request for:', req.params.id);
    const updateData = {
      fullName: req.body.fullName,
      phoneMobile: req.body.phoneMobile,
      phone2: req.body.phone2,
      email: req.body.email,
      address: req.body.address,
      address2: req.body.address2,
      city: req.body.city,
      district: req.body.district,
      updatedBy: req.session.user._id,
      updatedAt: new Date()
    };

    const updated = await Customer.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) {
      console.log('Customer not found for update');
      req.flash('error', ['Customer not found']);
      return res.redirect('/customers');
    }

    console.log('Customer updated:', updated);
    req.flash('success', [`Customer "${updated.fullName}" updated successfully`]);
    res.redirect('/customers');
  } catch (err) {
    console.error('Error updating customer:', err);
    req.flash('error', ['Failed to update customer']);
    res.redirect('/customers');
  }
});

/**
 * @swagger
 * /customers/delete/{id}:
 *   post:
 *     summary: Delete customer by ID
 *     tags: [Customers]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID to delete
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               _csrf:
 *                 type: string
 *                 description: CSRF token
 *     responses:
 *       302:
 *         description: Redirect with flash message
 */

// POST: Delete customer
router.post('/customers/delete/:id', isAuthenticated, async (req, res) => {
  try {
    console.log('Deleting customer:', req.params.id);
    const deleted = await Customer.findByIdAndDelete(req.params.id);
    if (!deleted) {
      req.flash('error', ['Customer not found']);
      return res.redirect('/customers');
    }

    console.log('Customer deleted:', deleted.customerId);
    req.flash('success', [`Customer "${deleted.fullName}" deleted successfully`]);
    res.redirect('/customers');
  } catch (err) {
    console.error('Error deleting customer:', err);
    req.flash('error', ['Failed to delete customer']);
    res.redirect('/customers');
  }
});

module.exports = router;
