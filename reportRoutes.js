const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const {
  getInventoryReport,
  getSalesReport,
  getPurchaseReport,
  getSalesByPeriod,
  getManagerReports
} = require('../controllers/reportController');
const { protect, managerAndAbove, adminOnly } = require('../middleware/auth');

// Log when a manager/admin generates a period report
async function logReport(req, res, next) {
  res.on('finish', async () => {
    if (res.statusCode === 200) {
      try {
        await mongoose.connection.db.collection('reportlogs').insertOne({
          generatedBy:   req.user?.name  || 'Unknown',
          generatedById: req.user?._id   || null,
          role:          req.user?.role  || 'unknown',
          period:        req.query?.period || 'all',
          reportType:    req.path,
          generatedAt:   new Date()
        });
      } catch (e) { console.error('Log error:', e); }
    }
  });
  next();
}

router.get('/inventory',       protect, managerAndAbove, getInventoryReport);
router.get('/sales',           protect, managerAndAbove, getSalesReport);
router.get('/purchases',       protect, managerAndAbove, getPurchaseReport);
router.get('/sales/period',    protect, managerAndAbove, logReport, getSalesByPeriod);
router.get('/manager-reports', protect, adminOnly, getManagerReports);

module.exports = router;