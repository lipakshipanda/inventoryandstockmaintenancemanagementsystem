const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getLowStock } = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/',          protect, getProducts);
router.get('/lowstock',  protect, getLowStock);
router.get('/:id',       protect, getProduct);
router.post('/',         protect, adminOnly, createProduct);
router.put('/:id',       protect, adminOnly, updateProduct);
router.delete('/:id',    protect, adminOnly, deleteProduct);

module.exports = router;