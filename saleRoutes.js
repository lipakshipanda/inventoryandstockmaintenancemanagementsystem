const express = require('express');
const router  = express.Router();
const { getSales, createSale } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');

// All authenticated users can view and record sales
router.get('/',  protect, getSales);
router.post('/', protect, createSale);

module.exports = router;
