const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { redirectIfAuthenticated } = require('../../middlewares/authMiddleware');
const { setFlash } = require('../../libs/helpers');

// We no longer show standalone login/register pages – only popup
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.redirect('/');
});

router.post('/register', redirectIfAuthenticated, authController.register);

router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.redirect('/');
});

router.post('/login', redirectIfAuthenticated, authController.login);
router.post('/logout', authController.logout);

// Email verification (2-step signup)
router.get('/verify-email', authController.showVerifyEmail);
router.get('/verify-email/confirm', authController.confirmEmailVerification);
router.post('/verify-email/resend', authController.resendEmailVerification);

module.exports = router;

