const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const orderController = require('../controllers/order.controller');

// Root route must come first to avoid matching /products/ as /products/:id
router.get('/', productController.getAllProducts);
router.get('/qrcode/:qrcode', productController.getProductByQRCode);
router.get('/:id', productController.getProductDetails);
router.post('/:id/review', orderController.addReview);

module.exports = router;

