const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const { isAuthenticated } = require('../middleware/auth');

router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Get recent 5 purchases with vendor populated
    const recentPurchases = await Purchase.find()
      .populate('vendor', 'fullName')
      .sort({ purchaseDate: -1 })
      .limit(5)
      .lean();

    // Get recent 5 sales
    const recentSales = await Sale.find()
      .sort({ saleDate: -1 })
      .limit(5)
      .lean();

    // Calculate total cost from recent purchases
    const totalCost = recentPurchases.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);

    // Calculate total revenue from recent sales
    const totalRevenue = recentSales.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);

    const profit = totalRevenue - totalCost;

    // --- New Feature: Calculate Profit/Loss per Item based on recent purchases and sales ---
    // Create maps keyed by itemNumber for purchases and sales
    const purchaseMap = {};
    recentPurchases.forEach(p => {
      if (!purchaseMap[p.itemNumber]) {
        purchaseMap[p.itemNumber] = { totalQty: 0, totalCost: 0, itemName: p.itemName };
      }
      purchaseMap[p.itemNumber].totalQty += p.quantity;
      purchaseMap[p.itemNumber].totalCost += p.quantity * p.unitPrice;
    });

    const saleMap = {};
    recentSales.forEach(s => {
      if (!saleMap[s.itemNumber]) {
        saleMap[s.itemNumber] = { totalQty: 0, totalRevenue: 0 };
      }
      saleMap[s.itemNumber].totalQty += s.quantity;
      saleMap[s.itemNumber].totalRevenue += s.quantity * s.unitPrice;
    });

    // Build profitLossSummary array
    const profitLossSummary = Object.keys(purchaseMap).map(itemNumber => {
      const purchaseData = purchaseMap[itemNumber];
      const saleData = saleMap[itemNumber] || { totalQty: 0, totalRevenue: 0 };
      const avgPurchasePrice = purchaseData.totalCost / purchaseData.totalQty;
      const avgSalePrice = saleData.totalQty ? saleData.totalRevenue / saleData.totalQty : 0;
      const soldQty = saleData.totalQty;
      const profitLoss = soldQty * (avgSalePrice - avgPurchasePrice);

      return {
        itemNumber,
        itemName: purchaseData.itemName,
        purchasedQty: purchaseData.totalQty,
        soldQty,
        avgPurchasePrice,
        avgSalePrice,
        profitLoss
      };
    });

    res.render('dashboard', {
      user: req.session.user,
      recentPurchases,
      recentSales,
      totalCost,
      totalRevenue,
      profit,
      profitLossSummary,   // <-- pass new data to template
      successMessage: req.flash('success'),
      errorMessage: req.flash('error'),
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('🔥 Error loading dashboard:', err);
    req.flash('error', 'Failed to load dashboard data');
    res.redirect('/');
  }
});

module.exports = router;
