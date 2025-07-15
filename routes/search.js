const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Vendor = require('../models/Vendor');
const { isAuthenticated } = require('../middleware/auth');

// Maximum results to return per search
const MAX_RESULTS = 50;


router.get('/search', isAuthenticated, (req, res) => {
  const defaultType = req.session.lastSearchType || 'Item';
  res.redirect(`/search/${defaultType}`);
});

/**
 * Search by type with session persistence
 */
router.get('/search/:type', isAuthenticated, async (req, res) => {
  const { type } = req.params;
  const { q } = req.query;
  
  try {
    // Validate search type
    const validTypes = ['Item', 'Customer', 'Sale', 'Purchase', 'Vendor'];
    if (!validTypes.includes(type)) {
      req.flash('error', 'Invalid search type');
      return res.redirect('/search');
    }

    // Validate query length
    if (q && q.length > 100) {
      req.flash('error', 'Search query too long (max 100 characters)');
      return res.redirect(`/search/${type}`);
    }

    let results = [];
    let searchConditions = [];

    // Build search conditions based on type
    switch (type) {
      case 'Item':
        searchConditions.push(
          { itemName: { $regex: q || '', $options: 'i' } },
          { description: { $regex: q || '', $options: 'i' } }
        );
        if (!isNaN(q)) {
          searchConditions.push({ itemNumber: parseInt(q) });
        }
        results = await Item.find({ $or: searchConditions })
          .limit(MAX_RESULTS)
          .sort({ itemName: 1 });
        break;

      case 'Customer':
        searchConditions.push(
          { fullName: { $regex: q || '', $options: 'i' } },
          { email: { $regex: q || '', $options: 'i' } }
        );
        if (!isNaN(q)) {
          searchConditions.push({ customerId: q });
        }
        results = await Customer.find({ $or: searchConditions })
          .limit(MAX_RESULTS)
          .sort({ fullName: 1 });
        break;

      case 'Sale':
        searchConditions = [];
        
        // Search by sale ID
        if (q && q.trim() !== '') {
          searchConditions.push(
            { saleId: { $regex: q, $options: 'i' } },
            { itemName: { $regex: q, $options: 'i' } },
            { customerName: { $regex: q, $options: 'i' } }
          );
          
          // Search by item number if numeric
          if (!isNaN(q)) {
            searchConditions.push({ itemNumber: parseInt(q) });
          }
        }
        
        results = await Sale.find(searchConditions.length ? { $or: searchConditions } : {})
          .limit(MAX_RESULTS)
          .sort({ saleDate: -1 });
        break;

      case 'Purchase':
        searchConditions = [];
        
        // Search by purchase ID
        if (q && q.trim() !== '') {
          searchConditions.push(
            { purchaseId: { $regex: q, $options: 'i' } },
            { itemName: { $regex: q, $options: 'i' } }
          );
          
          // Search by item number if numeric
          if (!isNaN(q)) {
            searchConditions.push({ itemNumber: parseInt(q) });
          }
        }
        
        results = await Purchase.find(searchConditions.length ? { $or: searchConditions } : {})
          .limit(MAX_RESULTS)
          .sort({ purchaseDate: -1 })
          .populate('vendor', 'fullName'); // Only populate if needed in results
        break;

      case 'Vendor':
        searchConditions.push(
          { fullName: { $regex: q || '', $options: 'i' } },
          { email: { $regex: q || '', $options: 'i' } },
          { phoneMobile: q || '' }
        );
        results = await Vendor.find({ $or: searchConditions })
          .limit(MAX_RESULTS)
          .sort({ fullName: 1 });
        break;
    }

    // Store search in session history
    if (q && q.trim() !== '') {
      const searchEntry = {
        type,
        query: q,
        date: new Date(),
        resultCount: results.length
      };

      req.session.recentSearches = req.session.recentSearches || [];
      req.session.recentSearches.unshift(searchEntry);
      
      // Keep only last 5 searches
      if (req.session.recentSearches.length > 5) {
        req.session.recentSearches = req.session.recentSearches.slice(0, 5);
      }
    }

    // Store last search type in session
    req.session.lastSearchType = type;

    res.render('search', { 
      user: req.user,
      activeTab: type,
      searchQuery: q || '',
      items: type === 'Item' ? results : [],
      customers: type === 'Customer' ? results : [],
      sales: type === 'Sale' ? results : [],
      purchases: type === 'Purchase' ? results : [],
      vendors: type === 'Vendor' ? results : [],
      recentSearches: req.session.recentSearches || [],
      resultCount: results.length
    });

  } catch (err) {
    console.error('Search error:', err);
    req.flash('error', 'Search failed - please try again');
    res.redirect('/search');
  }
});

/**
 * Clear search history from session
 */
router.post('/search/clear-history', isAuthenticated, (req, res) => {
  try {
    delete req.session.recentSearches;
    req.flash('info', 'Search history cleared');
    res.redirect('/search');
  } catch (err) {
    console.error('Clear history error:', err);
    req.flash('error', 'Failed to clear history');
    res.redirect('/search');
  }
});

module.exports = router;