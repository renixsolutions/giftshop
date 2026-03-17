const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { csrfValidationAfterMulter } = require('../../middlewares/csrfMiddleware');

// Profile routes
router.get('/profile', requireAuth, userController.showProfile);
router.post('/profile', requireAuth, csrfValidationAfterMulter, userController.updateProfile);
router.post('/profile/password', requireAuth, csrfValidationAfterMulter, userController.changePassword);

module.exports = router;

