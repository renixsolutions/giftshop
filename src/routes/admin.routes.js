const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const productController = require('../controllers/product.controller');
const orderController = require('../controllers/order.controller');
const categoryController = require('../controllers/category.controller');
const occasionController = require('../controllers/occasion.controller');
const { requireAdmin, redirectIfAdminAuthenticated } = require('../../middlewares/authMiddleware');
const { csrfValidationAfterMulter, csrfMiddleware } = require('../../middlewares/csrfMiddleware');
const upload = require('../../config/upload');

// Auth routes
router.get('/login', redirectIfAdminAuthenticated, adminController.showLogin);
router.post('/login', redirectIfAdminAuthenticated, adminController.login);
router.post('/logout', requireAdmin, adminController.logout);

// Dashboard
router.get('/dashboard', requireAdmin, adminController.dashboard);

// Product routes
router.get('/products', requireAdmin, productController.adminListProducts);
router.get('/products/new', requireAdmin, productController.adminShowProductForm);
router.get('/products/:id/edit', requireAdmin, productController.adminShowProductForm);
router.get('/products/:id', requireAdmin, productController.adminViewProduct);
router.post(
  '/products',
  requireAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 6 }
  ]),
  csrfValidationAfterMulter,
  productController.adminCreateProduct
);
router.post(
  '/products/:id',
  requireAdmin,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'gallery', maxCount: 6 }
  ]),
  csrfValidationAfterMulter,
  productController.adminUpdateProduct
);
router.post('/products/:id/delete', requireAdmin, productController.adminDeleteProduct);

// Order routes
router.get('/orders', requireAdmin, orderController.adminListOrders);
router.post('/orders/:id/status', requireAdmin, orderController.adminUpdateOrderStatus);

// Corporate leads (GiftHouse)
router.get('/leads', requireAdmin, adminController.corporateLeadsList);
router.post('/leads/:id/status', requireAdmin, csrfMiddleware, adminController.corporateLeadUpdateStatus);

// Category routes
router.get('/categories', requireAdmin, categoryController.adminListCategories);
router.get('/categories/new', requireAdmin, categoryController.adminShowCategoryForm);
router.get('/categories/:id/edit', requireAdmin, categoryController.adminShowCategoryForm);
router.post('/categories', requireAdmin, csrfMiddleware, categoryController.adminCreateCategory);
router.post('/categories/:id', requireAdmin, csrfMiddleware, categoryController.adminUpdateCategory);
router.post('/categories/:id/delete', requireAdmin, csrfMiddleware, categoryController.adminDeleteCategory);

// Occasion routes
router.get('/occasions', requireAdmin, occasionController.adminListOccasions);
router.get('/occasions/new', requireAdmin, occasionController.adminShowOccasionForm);
router.get('/occasions/:id/edit', requireAdmin, occasionController.adminShowOccasionForm);
router.post('/occasions', requireAdmin, csrfMiddleware, occasionController.adminCreateOccasion);
router.post('/occasions/:id', requireAdmin, csrfMiddleware, occasionController.adminUpdateOccasion);
router.post('/occasions/:id/delete', requireAdmin, csrfMiddleware, occasionController.adminDeleteOccasion);

module.exports = router;

