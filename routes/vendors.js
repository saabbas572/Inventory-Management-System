const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor'); // Make sure you have a Mongoose model
const { isAuthenticated } = require('../middleware/auth'); // Your auth middleware

// Get vendor list page
router.get('/vendors', isAuthenticated, async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ fullName: 1 });
    res.render('vendors', {
      vendors,
      csrfToken: req.csrfToken(),
      user: req.session.user // if you want to display user info in view
      // csrfToken, successMessage, errorMessage are available globally via middleware
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load vendors');
    res.redirect('/');
  }
});

// GET /vendors/:id - Return single vendor data as JSON (for edit form)
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


// Add new vendor
router.post('/vendors', isAuthenticated, async (req, res) => {
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

// Update vendor
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

// Delete vendor
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

module.exports = router;
