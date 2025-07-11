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

    // Create date objects at start and end of day in UTC
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0); // Set to beginning of day in UTC
    
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999); // Set to end of day in UTC

    if (start > end) {
      req.flash('error', 'End date must be after start date');
      return res.redirect('/reports');
    }

    let data;
    switch (reportType) {
      case 'Sales':
        data = await Sale.find({
          saleDate: { 
            $gte: start, 
            $lte: end 
          }
        }).sort({ saleDate: -1 });
        break;
      case 'Purchases':
        data = await Purchase.find({
          purchaseDate: { 
            $gte: start, 
            $lte: end 
          }
        }).sort({ purchaseDate: -1 });
        break;
      case 'Inventory':
        data = await Item.find({ status: 'Active' }).sort({ itemName: 1 });
        break;
      default:
        req.flash('error', 'Invalid report type');
        return res.redirect('/reports');
    }

    // Format dates for display (without timezone conversion)
    const displayStartDate = new Date(startDate).toISOString().split('T')[0];
    const displayEndDate = new Date(endDate).toISOString().split('T')[0];

    if (format === 'pdf') {
      const report = await generatePDFReport({
        reportType,
        data,
        userId: req.user._id,
        startDate: displayStartDate,
        endDate: displayEndDate,
        queryStart: start,
        queryEnd: end
      });
      return res.redirect(`/reports/download/${report._id}`);
    } else {
      res.render('reports/view', {
        reportType,
        data: data || [],
        startDate: displayStartDate,
        endDate: displayEndDate,
        report: { _id: null }, // Temporary for HTML view
        user: req.session.user,
        csrfToken: req.csrfToken()
      });
    }
  } catch (err) {
    console.error('Report generation error:', err);
    req.flash('error', 'Failed to generate report');
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

    const filePath = path.join(__dirname, '../public/reports', report.downloadUrl);
    
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      req.flash('error', 'Report file not found');
      return res.redirect('/reports');
    }

    // Set proper headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${report.downloadUrl}`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Handle stream errors
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      req.flash('error', 'Error downloading report');
      res.redirect('/reports');
    });

  } catch (err) {
    console.error('Download error:', err);
    req.flash('error', 'Failed to download report');
    res.redirect('/reports');
  }
});

// Generate PDF Report (Improved)
async function generatePDFReport({ reportType, data, userId, startDate, endDate }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `${reportType.toLowerCase()}_report_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../public/reports', filename);

      // Create reports directory if not exists
      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(20).text(`${reportType} Report`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
      doc.text(`Date range: ${new Date(startDate).toDateString()} to ${new Date(endDate).toDateString()}`);
      doc.moveDown();

      // Table-like structure
      const generateTable = (headers, rows) => {
        const colWidths = [100, 80, 150, 60, 60, 60];
        let y = doc.y;
        
        // Draw headers
        doc.font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
            width: colWidths[i],
            align: 'left'
          });
        });
        doc.font('Helvetica');
        
        // Draw rows
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
              item.itemNumber.toString(),
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
      doc.fontSize(10).text(`Generated by: ${userId}`, { align: 'right' });

      doc.end();

      stream.on('finish', async () => {
        try {
          const report = new Report({
            reportType,
            dateRange: { start: new Date(startDate), end: new Date(endDate) },
            generatedBy: userId,
            downloadUrl: filename
          });
          await report.save();
          resolve(report);
        } catch (err) {
          reject(err);
        }
      });

      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = router;