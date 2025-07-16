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

    // Calculate totals
    const totalCost = recentPurchases.reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const totalRevenue = recentSales.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);
    const profit = totalRevenue - totalCost;

    // Enhanced analytics using only existing variables
    const itemPerformance = recentPurchases.map(purchase => {
      // Find matching sales for this item
      const itemSales = recentSales.filter(s => s.itemNumber === purchase.itemNumber);
      const soldQty = itemSales.reduce((sum, s) => sum + s.quantity, 0);
      const salesRevenue = itemSales.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);

      // Calculate profit only on sold items
      // Cost of goods sold is soldQty * purchase unit price
      const costOfSoldItems = soldQty * purchase.unitPrice;
      const itemProfit = salesRevenue - costOfSoldItems;
      const profitPercentage = costOfSoldItems > 0 ? (itemProfit / costOfSoldItems) * 100 : 0;

      return {
        itemNumber: purchase.itemNumber,
        itemName: purchase.itemName,
        purchasePrice: purchase.unitPrice,
        avgSalePrice: soldQty > 0 ? salesRevenue / soldQty : 0,
        purchasedQty: purchase.quantity,
        soldQty,
        profit: itemProfit,
        profitPercentage
      };
    });

    res.render('dashboard', {
      user: req.session.user,
      recentPurchases,
      recentSales,
      totalCost,
      totalRevenue,
      profit,
      itemPerformance,  // New analytics data with profit on sold items only
      successMessage: req.flash('success'),
      errorMessage: req.flash('error'),
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('Error loading dashboard:', err);
    req.flash('error', 'Failed to load dashboard data');
    res.redirect('/');
  }
});

module.exports = router;
