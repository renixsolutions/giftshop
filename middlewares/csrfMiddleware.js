const crypto = require('crypto');

// Generate CSRF token
const generateToken = (req) => {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = crypto.randomBytes(32).toString('hex');
  }
  return crypto
    .createHmac('sha256', req.session.csrfSecret)
    .update(req.sessionID || 'default')
    .digest('hex');
};

// CSRF token middleware
const csrfMiddleware = (req, res, next) => {
  // Generate token and make it available to views
  res.locals.csrfToken = generateToken(req);
  
  // Skip CSRF validation for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // For multipart/form-data, skip validation here (will be validated after multer)
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }
  
  // Validate CSRF token for POST, PUT, DELETE, PATCH
  const token = req.body._csrf || req.headers['x-csrf-token'];
  const expectedToken = generateToken(req);
  
  if (!token || token !== expectedToken) {
    const { setFlash } = require('../libs/helpers');
    setFlash(req, 'error', 'Invalid security token. Please try again.');
    return res.status(403).redirect('back');
  }
  
  next();
};

// CSRF validation middleware for after multer (multipart forms)
const csrfValidationAfterMulter = (req, res, next) => {
  const token = req.body._csrf || req.headers['x-csrf-token'];
  const expectedToken = generateToken(req);
  
  if (!token || token !== expectedToken) {
    const { setFlash } = require('../libs/helpers');
    setFlash(req, 'error', 'Invalid security token. Please try again.');
    return res.status(403).redirect('back');
  }
  
  next();
};

module.exports = {
  csrfMiddleware,
  csrfValidationAfterMulter,
  generateToken
};

