const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { requireAuth } = require('../../middlewares/authMiddleware');

router.get('/', requireAuth, orderController.getUserOrders);
router.get('/checkout', requireAuth, orderController.showCheckout);
router.get('/:id', requireAuth, orderController.getOrderDetails);
router.post('/checkout', requireAuth, orderController.createOrder);

module.exports = router;

