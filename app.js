const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CSRF Protection Middleware
const { csrfMiddleware } = require('./middlewares/csrfMiddleware');
app.use(csrfMiddleware);

// Flash messages middleware
app.use(async (req, res, next) => {
  const { getFlash } = require('./libs/helpers');
  const db = require('./config/database');
  const flash = getFlash(req);
  res.locals.flash = flash;
  res.locals.userId = req.session.userId;
  res.locals.userName = req.session.userName;
  res.locals.adminId = req.session.adminId;
  res.locals.adminName = req.session.adminName;
  
  // Get cart count for logged-in users
  if (req.session.userId) {
    try {
      const cartCount = await db('cart')
        .where({ user_id: req.session.userId })
        .sum('quantity as total')
        .first();
      res.locals.cartCount = cartCount?.total || 0;
    } catch (error) {
      res.locals.cartCount = 0;
    }
  } else {
    res.locals.cartCount = 0;
  }
  
  res.locals.currentPath = req.path;
  
  next();
});

// Routes
app.use('/auth', require('./src/routes/auth.routes'));
app.use('/admin', require('./src/routes/admin.routes'));
app.use('/products', require('./src/routes/product.routes'));
app.use('/cart', require('./src/routes/cart.routes'));
app.use('/orders', require('./src/routes/order.routes'));
app.use('/', require('./src/routes/user.routes'));

// Sitemap.xml
app.get('/sitemap.xml', async (req, res) => {
  const userController = require('./src/controllers/user.controller');
  await userController.generateSitemap(req, res);
});

// Home route
app.get('/', async (req, res) => {
  const productController = require('./src/controllers/product.controller');
  await productController.getHomePage(req, res);
});

// Collections route
app.get('/collections', async (req, res) => {
  const productController = require('./src/controllers/product.controller');
  await productController.getCollectionsPage(req, res);
});

// Catalog route
app.get('/catalog', async (req, res) => {
  const productController = require('./src/controllers/product.controller');
  await productController.getCatalogPage(req, res);
});

// Occasions route
app.get('/occasions', async (req, res) => {
  const productController = require('./src/controllers/product.controller');
  await productController.getOccasionsPage(req, res);
});

// Build a Hamper (GiftHouse)
app.get('/build-hamper', async (req, res) => {
  const hamperController = require('./src/controllers/hamper.controller');
  await hamperController.getBuildPage(req, res);
});
app.post('/api/hampers', async (req, res) => {
  const hamperController = require('./src/controllers/hamper.controller');
  await hamperController.addHamperToCart(req, res);
});

// Corporate gifting page
app.get('/corporate', async (req, res) => {
  res.render('user/corporate-gift', {
    title: 'Corporate Gifting',
    currentPage: 'corporate'
  });
});
app.post('/corporate', async (req, res) => {
  try {
    const db = require('./config/database');
    await db('corporate_leads').insert({
      company_name: req.body.company_name || null,
      contact_person: req.body.contact_person || null,
      email: req.body.email,
      phone: req.body.phone || null,
      message: req.body.message || null,
      status: 'new'
    });
    const { setFlash } = require('./libs/helpers');
    setFlash(req, 'success', 'Thank you! We’ll get back to you within 24 hours.');
  } catch (e) {
    console.error(e);
    const { setFlash } = require('./libs/helpers');
    setFlash(req, 'error', 'Could not send inquiry. Please try again.');
  }
  res.redirect('/corporate');
});

// API routes for infinite scroll
app.get('/api/collections', async (req, res) => {
  const productController = require('./src/controllers/product.controller');
  await productController.getMoreCollections(req, res);
});

app.get('/api/catalog', async (req, res) => {
  const productController = require('./src/controllers/product.controller');
  await productController.getMoreCatalog(req, res);
});

// Header search typeahead
app.get('/api/search-products', async (req, res) => {
  const productController = require('./src/controllers/product.controller');
  await productController.searchProducts(req, res);
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('user/404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('user/500', { 
    title: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = app;

