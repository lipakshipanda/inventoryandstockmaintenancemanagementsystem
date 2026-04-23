const express = require('express');
const router  = express.Router();
const { getPurchases, createPurchase } = require('../controllers/purchaseController');
const { protect, managerAndAbove } = require('../middleware/auth');

router.get('/',  protect, managerAndAbove, getPurchases);
router.post('/', protect, managerAndAbove, createPurchase);

module.exports = router;