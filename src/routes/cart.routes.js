const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { checkStoreStatus } = require('../middlewares/storeSettings');

router.get('/', requireAuth, cartController.getCart);
router.post('/add', requireAuth, checkStoreStatus, cartController.addToCart);
router.post('/:id/update', requireAuth, cartController.updateCartItem);
router.post('/:id/remove', requireAuth, cartController.removeFromCart);

module.exports = router;

