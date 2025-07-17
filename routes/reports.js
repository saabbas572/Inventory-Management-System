const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Report = require('../models/Report');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Item = require('../models/Item');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose'); // Make sure mongoose is required

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '../public/reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// GET /reports - Show report filter form
router.get('/', isAuthenticated, (req, res) => {
  res.render('reports/index', {
    title: 'Reports',
    user: req.session.user,
    csrfToken: req.csrfToken()
  });
});

// POST /reports/generate - Generate report
router.post('/generate', isAuthenticated, async (req, res) => {
  try {
    const { reportType, startDate, endDate, format } = req.body;

    // Validate inputs
    if (!reportType || !startDate || !endDate || !format) {
      req.flash('error', 'All fields are required');
      return res.redirect('/reports');
    }

    const userId = req.user?.id || req.session.user?.id;
    if (!userId) {
      req.flash('error', 'User authentication required');
      return res.redirect('/reports');
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    if (start > end) {
      req.flash('error', 'End date must be after start date');
      return res.redirect('/reports');
    }

    let data;
    switch (reportType) {
      case 'Sales':
        data = await Sale.find({ saleDate: { $gte: start, $lte: end } }).sort({ saleDate: -1 });
        break;
      case 'Purchases':
        data = await Purchase.find({ purchaseDate: { $gte: start, $lte: end } }).populate('vendor').sort({ purchaseDate: -1 });
        break;
      case 'Inventory':
        data = await Item.find({ status: 'Active' }).sort({ itemName: 1 });
        break;
      default:
        req.flash('error', 'Invalid report type');
        return res.redirect('/reports');
    }

    const displayStartDate = startDate;
    const displayEndDate = endDate;

    if (format === 'pdf') {
      const report = await generatePDFReport({
        reportType,
        data,
        userId,
        userName: req.user?.username || req.session.user?.username || 'Unknown',
        startDate: displayStartDate,
        endDate: displayEndDate,
      });

      // Set success flash message
      req.flash('success', 'Your report has been generated successfully.');

      // Render the same form page with flash message and pass the generated report so user can download it
      return res.render('reports/index', {
        title: 'Reports',
        user: req.session.user,
        csrfToken: req.csrfToken(),
        success: req.flash('success'),
        generatedReport: report, // pass to show download link
      });
    } else {
      // If format is html, render the report view page directly
      return res.render('reports/view', {
        reportType,
        data: data || [],
        startDate: displayStartDate,
        endDate: displayEndDate,
        report: { _id: null },
        user: req.session.user,
        csrfToken: req.csrfToken()
      });
    }
  } catch (err) {
    console.error('Report generation error:', err);
    req.flash('error', 'Failed to generate report');
    return res.redirect('/reports');
  }
});


// GET /reports/view/:id - View report with download option
router.get('/view/:id', isAuthenticated, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      req.flash('error', 'Report not found');
      return res.redirect('/reports');
    }

    let data;
    switch (report.reportType) {
      case 'Sales':
        data = await Sale.find({
          saleDate: { $gte: report.dateRange.start, $lte: report.dateRange.end }
        }).sort({ saleDate: -1 });
        break;
      case 'Purchases':
        data = await Purchase.find({
          purchaseDate: { $gte: report.dateRange.start, $lte: report.dateRange.end }
        }).populate('vendor') // <-- Add this line
.sort({ purchaseDate: -1 });
        break;
      case 'Inventory':
        data = await Item.find({ status: 'Active' }).sort({ itemName: 1 });
        break;
    }

    res.render('reports/view', {
      reportType: report.reportType,
      data: data || [],
      startDate: report.dateRange.start.toISOString().split('T')[0],
      endDate: report.dateRange.end.toISOString().split('T')[0],
      report,
      user: req.session.user,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('Error viewing report:', err);
    req.flash('error', 'Failed to load report');
    res.redirect('/reports');
  }
});

// GET /reports/download/:id - Download PDF report
router.get('/download/:id', isAuthenticated, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      req.flash('error', 'Report not found');
      return res.redirect('/reports');
    }

    const filePath = path.resolve(__dirname, '../public/reports', report.downloadUrl);
    
    if (!fs.existsSync(filePath)) {
      console.error(`Report file not found at: ${filePath}`);
      req.flash('error', 'Report file not found');
      return res.redirect('/reports');
    }

    res.download(filePath, `${report.reportType}_Report.pdf`, (err) => {
      if (err) {
        console.error('Download failed:', err);
        if (!res.headersSent) {
          req.flash('error', 'Error downloading report');
          res.redirect('/reports');
        }
      }
    });
  } catch (err) {
    console.error('Download error:', err);
    req.flash('error', 'Failed to download report');
    res.redirect('/reports');
  }
});

// Generate PDF Report with improved error handling
async function generatePDFReport({ reportType, data, userId, userName, startDate, endDate }) {
  return new Promise((resolve, reject) => {
    // Validate userId is a proper ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return reject(new Error('Invalid user ID provided'));
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `${reportType.toLowerCase()}_${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, filename);

    const stream = fs.createWriteStream(filePath);
    
    stream.on('error', (err) => {
      console.error('File write error:', err);
      reject(err);
    });

    stream.on('finish', async () => {
      try {
        const report = new Report({
          reportType,
          dateRange: { 
            start: new Date(startDate), 
            end: new Date(endDate) 
          },
          generatedBy: userId,
          downloadUrl: filename
        });
        
        await report.save();
        resolve(report);
      } catch (err) {
        req.flash('error','Error Saving Report');
        console.error('Error saving report:', err);
        reject(err);
      }
    });

    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(`${reportType} Report`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
    doc.text(`Date range: ${new Date(startDate).toDateString()} to ${new Date(endDate).toDateString()}`);
    doc.moveDown();

    // Table generation function
    const generateTable = (headers, rows) => {
      const colWidths = headers.map((_, i) => (i === 2 ? 150 : 100));
      let y = doc.y;
      
      // Headers
      doc.font('Helvetica-Bold');
      headers.forEach((header, i) => {
        doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
          width: colWidths[i],
          align: 'left'
        });
      });
      doc.font('Helvetica');
      
      // Rows
      rows.forEach(row => {
        y += 20;
        row.forEach((cell, i) => {
          doc.text(cell, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
            width: colWidths[i],
            align: 'left'
          });
        });
      });
    };

    // Report-specific content
    switch (reportType) {
      case 'Sales':
        generateTable(
          ['Sale ID', 'Date', 'Item', 'Qty', 'Price', 'Total'],
          data.map(sale => [
            sale.saleId,
            sale.saleDate.toDateString(),
            sale.itemName,
            sale.quantity.toString(),
            `$${sale.unitPrice.toFixed(2)}`,
            `$${sale.total.toFixed(2)}`
          ])
        );
        break;
        
      case 'Purchases':
        generateTable(
          ['Purchase ID', 'Date', 'Item', 'Vendor', 'Qty', 'Cost', 'Total'],
          data.map(purchase => [
            purchase.purchaseId,
            purchase.purchaseDate.toDateString(),
            purchase.itemName,
            purchase.vendor?.fullName || 'N/A',
            purchase.quantity.toString(),
            `$${purchase.unitPrice.toFixed(2)}`,
            `$${purchase.totalCost.toFixed(2)}`
          ])
        );
        break;
        
      case 'Inventory':
        generateTable(
          ['Item #', 'Name', 'Stock', 'Price', 'Status'],
          data.map(item => [
            item.itemNumber,
            item.itemName,
            item.stock.toString(),
            `$${item.unitPrice.toFixed(2)}`,
            item.status
          ])
        );
        break;
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).text(`Generated by user : ${userName}`, { align: 'right' });

    doc.end();
  });
}

module.exports = router;