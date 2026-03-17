const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { redirectIfAuthenticated } = require('../../middlewares/authMiddleware');
const { setFlash } = require('../../libs/helpers');

// We no longer show standalone login/register pages – only popup
router.get('/register', redirectIfAuthenticated, (req, res) => {
  setFlash(req, 'info', 'Create an account to continue');
  res.redirect('/');
});

router.post('/register', redirectIfAuthenticated, authController.register);

router.get('/login', redirectIfAuthenticated, (req, res) => {
  setFlash(req, 'error', 'Please login to continue');
  res.redirect('/');
});

router.post('/login', redirectIfAuthenticated, authController.login);
router.post('/logout', authController.logout);

module.exports = router;

