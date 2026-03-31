const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { checkStoreStatus } = require('../middlewares/storeSettings');

router.get('/', requireAuth, orderController.getUserOrders);
router.get('/checkout', requireAuth, checkStoreStatus, orderController.showCheckout);
router.get('/:id', requireAuth, orderController.getOrderDetails);
router.post('/checkout', requireAuth, checkStoreStatus, orderController.createOrder);
router.post('/verify-payment', requireAuth, checkStoreStatus, orderController.verifyPayment);

module.exports = router;

