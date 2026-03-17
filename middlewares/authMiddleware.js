const { setFlash } = require('../libs/helpers');

// Check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  setFlash(req, 'error', 'Please login to continue');
  res.redirect('/');
};

// Check if admin is authenticated
const requireAdmin = (req, res, next) => {
  if (req.session.adminId) {
    return next();
  }
  setFlash(req, 'error', 'Admin access required');
  res.redirect('/admin/login');
};

// Redirect if already logged in (for login/register pages)
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  next();
};

// Redirect if admin already logged in
const redirectIfAdminAuthenticated = (req, res, next) => {
  if (req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
  redirectIfAuthenticated,
  redirectIfAdminAuthenticated
};

