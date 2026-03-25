const db = require('../../config/database');
const { setFlash } = require('../../libs/helpers');
const { validateProduct } = require('../../utils/validators');
const path = require('path');
const fs = require('fs');
const {
  uploadBufferToS3,
  parseDataUrl,
  extensionFromContentType
} = require('../../config/s3');

// Generate unique QR code number
const generateQRCodeNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `SHC${timestamp}${random}`.substring(0, 20);
};

// Extract QR code number from stored path
const extractQRCodeNumber = (qrCodePath) => {
  if (!qrCodePath) return null;
  // If it's already just a number, return it
  if (qrCodePath.startsWith('SHC')) {
    return qrCodePath;
  }
  // Extract from URL path like http://domain/products/qrcode/VSC123
  const match = qrCodePath.match(/\/qrcode\/([^\/\s]+)/);
  return match ? match[1] : qrCodePath;
};

// Generate full QR scanner path/URL and QR code image
const generateQRCodePath = (req) => {
  const qrCodeNumber = generateQRCodeNumber();
  // Use production URL or environment variable, fallback to localhost for development
  const baseUrl = process.env.BASE_URL || process.env.PRODUCTION_URL || 'https://shubhamgarments.onrender.com';
  const qrCodePath = `${baseUrl}/products/qrcode/${qrCodeNumber}`;
  
  // Generate QR code image URL using QR Server API
  const encodedUrl = encodeURIComponent(qrCodePath);
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
  
  return {
    qrCodeNumber: qrCodeNumber,
    qrCodePath: qrCodePath,
    qrCodeImageUrl: qrCodeImageUrl
  };
};

// Get home page
const getHomePage = async (req, res) => {
  try {
    // Get featured/new products for home page
    let products = await db('products')
      .orderBy('created_at', 'desc')
      .limit(8);
    
    // Get ratings for each product
    for (let product of products) {
      const reviews = await db('reviews').where({ product_id: product.id });
      const totalRatings = reviews.length;
      const avgRating = totalRatings > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings
        : 0;
      product.avgRating = parseFloat(avgRating.toFixed(1));
      product.totalRatings = totalRatings;
    }
    
    // Get categories (only those that actually have products)
    let categories = [];
    try {
      const catRows = await db('categories')
        .where({ is_active: true })
        .orderBy('sort_order')
        .select('id', 'name', 'slug');
      for (const c of catRows) {
        // Count products linked by category_id OR, as a fallback, by matching category name string
        const countRow = await db('products')
          .where(function () {
            this.where({ category_id: c.id })
              .orWhere('category', c.name);
          })
          .count('id as c')
          .first();
        const productCount = parseInt(countRow?.c || 0, 10);
        if (productCount > 0) {
          categories.push({ ...c, product_count: productCount });
        }
      }
    } catch (e) {
      const fallback = await db('products')
        .select('category')
        .count('id as product_count')
        .groupBy('category');
      categories = fallback
        .map(c => ({
          name: c.category,
          slug: (c.category || '').toLowerCase().replace(/\s+/g, '-'),
          product_count: parseInt(c.product_count, 10)
        }))
        .filter(c => c.product_count > 0);
    }
    
    // Get active occasions for homepage strip
    let occasions = [];
    try {
      occasions = await db('occasions')
        .where({ is_active: true })
        .orderBy('sort_order', 'asc')
        .orderBy('name', 'asc');
    } catch (e) {
      occasions = [];
    }
    
    res.render('user/home-gift', {
      title: 'GiftHouse — Curated Gift Boxes & Hampers',
      products,
      categories,
      occasions,
      selectedCategory: 'all',
      currentPage: 'home'
    });
  } catch (error) {
    console.error('Get home page error:', error);
    setFlash(req, 'error', 'Error loading page');
    res.redirect('/');
  }
};

// Get collections page
// Helper function to get products with pagination and ratings
const getProductsWithRatings = async (query, limit = 20, offset = 0) => {
  const products = await query.clone().limit(limit).offset(offset);
  
  // Get ratings for each product
  for (let product of products) {
    const reviews = await db('reviews').where({ product_id: product.id });
    const totalRatings = reviews.length;
    const avgRating = totalRatings > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;
    product.avgRating = parseFloat(avgRating.toFixed(1));
    product.totalRatings = totalRatings;
  }
  
  return products;
};

const getCollectionsPage = async (req, res) => {
  try {
    // Support both single category (backward compatibility) and multiple categories
    const queryCategories = req.query.categories ? (Array.isArray(req.query.categories) ? req.query.categories : [req.query.categories]) : null;
    const category = req.query.category; // For backward compatibility
    const search = req.query.search;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'desc';
    const limit = 20; // Initial load limit
    const offset = 0;
    
    let query = db('products');
    
    if (search) {
      query = query.where(function() {
        this.where('title', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`)
            .orWhere('category', 'ilike', `%${search}%`);
      });
    }
    
    // Handle multiple categories or single category
    if (queryCategories && queryCategories.length > 0) {
      query = query.whereIn('category', queryCategories);
    } else if (category && category !== 'all') {
      query = query.where({ category });
    }
    
    // Price range filter
    if (minPrice !== null && !isNaN(minPrice)) {
      query = query.where('price', '>=', minPrice);
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      query = query.where('price', '<=', maxPrice);
    }
    
    // Get total count for pagination
    const totalCount = await query.clone().count('* as count').first();
    const total = parseInt(totalCount.count);
    
    // Sorting
    const validSortFields = ['title', 'price', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'desc' ? 'desc' : 'asc';
    
    // Get initial products with pagination
    const products = await getProductsWithRatings(
      query.orderBy(sortField, order),
      limit,
      offset
    );
    
    // Get categories that have at least 1 product
    let categories = [];
    try {
      // First try to get from categories table and check if they have products
      const dbCategories = await db('categories')
        .where({ is_active: true })
        .orderBy('sort_order', 'asc')
        .orderBy('name', 'asc');
      
      // Check which categories have products
      const categoriesWithProducts = await db('products')
        .select('category')
        .count('id as product_count')
        .groupBy('category')
        .having(db.raw('count(id)'), '>', 0);
      
      const categoriesWithProductsSet = new Set(categoriesWithProducts.map(cat => cat.category));
      categories = dbCategories
        .map(cat => cat.name)
        .filter(catName => categoriesWithProductsSet.has(catName));
    } catch (err) {
      // Fallback to product categories if categories table doesn't exist
      const categoriesWithProducts = await db('products')
        .select('category')
        .count('id as product_count')
        .groupBy('category')
        .having(db.raw('count(id)'), '>', 0);
      categories = categoriesWithProducts.map(cat => cat.category);
    }
    
    // Get price range for filter
    const priceRange = await db('products')
      .min('price as min')
      .max('price as max')
      .first();
    
    // Determine selected categories for view
    const selectedCategories = queryCategories && queryCategories.length > 0 ? queryCategories : (category && category !== 'all' ? [category] : []);
    
    res.render('user/collections', {
      title: 'Collections - Shubham Garments',
      products,
      categories,
      selectedCategory: selectedCategories.length > 0 ? selectedCategories : 'all',
      selectedCategories: selectedCategories,
      req: req, // Pass req for URL parsing in view
      searchQuery: search || '',
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      sortBy,
      sortOrder,
      priceRange: {
        min: priceRange?.min || 0,
        max: priceRange?.max || 10000
      },
      currentPage: 'collections',
      hasMore: total > limit,
      totalProducts: total
    });
  } catch (error) {
    console.error('Get collections error:', error);
    setFlash(req, 'error', 'Error loading collections');
    res.redirect('/');
  }
};

// Get catalog page
const getCatalogPage = async (req, res) => {
  try {
    // Support both single category (backward compatibility) and multiple categories
    const queryCategories = req.query.categories ? (Array.isArray(req.query.categories) ? req.query.categories : [req.query.categories]) : null;
    const category = req.query.category; // For backward compatibility
    const search = req.query.search;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const sortBy = req.query.sortBy || 'title';
    const sortOrder = req.query.sortOrder || 'asc';
    const limit = 20; // Initial load limit
    const offset = 0;
    
    let query = db('products');
    
    if (search) {
      query = query.where(function() {
        this.where('title', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`)
            .orWhere('category', 'ilike', `%${search}%`);
      });
    }
    
    // Handle multiple categories or single category
    if (queryCategories && queryCategories.length > 0) {
      query = query.whereIn('category', queryCategories);
    } else if (category && category !== 'all') {
      query = query.where({ category });
    }
    
    // Price range filter
    if (minPrice !== null && !isNaN(minPrice)) {
      query = query.where('price', '>=', minPrice);
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      query = query.where('price', '<=', maxPrice);
    }
    
    // Get total count for pagination
    const totalCount = await query.clone().count('* as count').first();
    const total = parseInt(totalCount.count);
    
    // Sorting
    const validSortFields = ['title', 'price', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'title';
    const order = sortOrder === 'desc' ? 'desc' : 'asc';
    
    // Get initial products with pagination
    const products = await getProductsWithRatings(
      query.orderBy(sortField, order),
      limit,
      offset
    );
    
    // Get categories that have at least 1 product
    let categories = [];
    try {
      // First try to get from categories table and check if they have products
      const dbCategories = await db('categories')
        .where({ is_active: true })
        .orderBy('sort_order', 'asc')
        .orderBy('name', 'asc');
      
      // Check which categories have products
      const categoriesWithProducts = await db('products')
        .select('category')
        .count('id as product_count')
        .groupBy('category')
        .having(db.raw('count(id)'), '>', 0);
      
      const categoriesWithProductsSet = new Set(categoriesWithProducts.map(cat => cat.category));
      categories = dbCategories
        .map(cat => cat.name)
        .filter(catName => categoriesWithProductsSet.has(catName));
    } catch (err) {
      // Fallback to product categories if categories table doesn't exist
      const categoriesWithProducts = await db('products')
        .select('category')
        .count('id as product_count')
        .groupBy('category')
        .having(db.raw('count(id)'), '>', 0);
      categories = categoriesWithProducts.map(cat => cat.category);
    }
    
    // Get price range for filter
    const priceRange = await db('products')
      .min('price as min')
      .max('price as max')
      .first();
    
    // Determine selected categories for view
    const selectedCategories = queryCategories && queryCategories.length > 0 ? queryCategories : (category && category !== 'all' ? [category] : []);
    
    res.render('user/catalog', {
      title: 'Shop Gifts',
      products,
      categories,
      selectedCategory: selectedCategories.length > 0 ? selectedCategories : 'all',
      selectedCategories: selectedCategories,
      req: req, // Pass req for URL parsing in view
      searchQuery: search || '',
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      sortBy,
      sortOrder,
      priceRange: {
        min: priceRange?.min || 0,
        max: priceRange?.max || 10000
      },
      currentPage: 'catalog',
      hasMore: total > limit,
      totalProducts: total
    });
  } catch (error) {
    console.error('Get catalog error:', error);
    setFlash(req, 'error', 'Error loading catalog');
    res.redirect('/');
  }
};

// Occasions page (simple listing with occasion pills + products)
const getOccasionsPage = async (req, res) => {
  try {
    const selectedSlug = req.query.occ || null;
    
    // Load all active occasions for tabs
    let occasions = [];
    try {
      occasions = await db('occasions')
        .where({ is_active: true })
        .orderBy('sort_order', 'asc')
        .orderBy('name', 'asc');
    } catch (e) {
      occasions = [];
    }

    let query = db('products');
    let selectedOccasion = null;
    
    if (selectedSlug && occasions.length) {
      selectedOccasion = occasions.find(o => o.slug === selectedSlug);
      if (selectedOccasion) {
        // Use many-to-many link table if present, with a fallback to legacy fields
        try {
          query = db('products')
            .join('product_occasions', 'products.id', 'product_occasions.product_id')
            .where('product_occasions.occasion_id', selectedOccasion.id)
            .distinct('products.*');
        } catch (e) {
          // Fallback: older schema where products had a single occasion / occasion_id
          query = db('products').where(function () {
            this.where('occasion_id', selectedOccasion.id)
              .orWhere('occasion', selectedOccasion.name);
          });
        }
      }
    }

    const products = await getProductsWithRatings(
      query.orderBy('created_at', 'desc'),
      12,
      0
    );

    res.render('user/occasions', {
      title: 'Shop by Occasion',
      products,
      occasions,
      selectedOccasion,
      currentPage: 'occasions'
    });
  } catch (error) {
    console.error('Get occasions page error:', error);
    setFlash(req, 'error', 'Error loading occasions');
    res.redirect('/');
  }
};

// API: Get more products for collections (infinite scroll)
const getMoreCollections = async (req, res) => {
  try {
    // Support both single category (backward compatibility) and multiple categories
    const queryCategories = req.query.categories ? (Array.isArray(req.query.categories) ? req.query.categories : [req.query.categories]) : null;
    const category = req.query.category; // For backward compatibility
    const search = req.query.search;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'desc';
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    let query = db('products');
    
    if (search) {
      query = query.where(function() {
        this.where('title', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`)
            .orWhere('category', 'ilike', `%${search}%`);
      });
    }
    
    // Handle multiple categories or single category
    if (queryCategories && queryCategories.length > 0) {
      query = query.whereIn('category', queryCategories);
    } else if (category && category !== 'all') {
      query = query.where({ category });
    }
    
    // Price range filter
    if (minPrice !== null && !isNaN(minPrice)) {
      query = query.where('price', '>=', minPrice);
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      query = query.where('price', '<=', maxPrice);
    }
    
    // Get total count
    const totalCount = await query.clone().count('* as count').first();
    const total = parseInt(totalCount.count);
    
    // Sorting
    const validSortFields = ['title', 'price', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'desc' ? 'desc' : 'asc';
    
    // Get products with pagination
    const products = await getProductsWithRatings(
      query.orderBy(sortField, order),
      limit,
      offset
    );
    
    res.json({
      success: true,
      products,
      hasMore: (offset + limit) < total,
      total,
      offset: offset + products.length
    });
  } catch (error) {
    console.error('Get more collections error:', error);
    res.status(500).json({ success: false, error: 'Error loading products' });
  }
};

// API: Get more products for catalog (infinite scroll)
const getMoreCatalog = async (req, res) => {
  try {
    // Support both single category (backward compatibility) and multiple categories
    const queryCategories = req.query.categories ? (Array.isArray(req.query.categories) ? req.query.categories : [req.query.categories]) : null;
    const category = req.query.category; // For backward compatibility
    const search = req.query.search;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const sortBy = req.query.sortBy || 'title';
    const sortOrder = req.query.sortOrder || 'asc';
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    let query = db('products');
    
    if (search) {
      query = query.where(function() {
        this.where('title', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`)
            .orWhere('category', 'ilike', `%${search}%`);
      });
    }
    
    // Handle multiple categories or single category
    if (queryCategories && queryCategories.length > 0) {
      query = query.whereIn('category', queryCategories);
    } else if (category && category !== 'all') {
      query = query.where({ category });
    }
    
    // Price range filter
    if (minPrice !== null && !isNaN(minPrice)) {
      query = query.where('price', '>=', minPrice);
    }
    if (maxPrice !== null && !isNaN(maxPrice)) {
      query = query.where('price', '<=', maxPrice);
    }
    
    // Get total count
    const totalCount = await query.clone().count('* as count').first();
    const total = parseInt(totalCount.count);
    
    // Sorting
    const validSortFields = ['title', 'price', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'title';
    const order = sortOrder === 'desc' ? 'desc' : 'asc';
    
    // Get products with pagination
    const products = await getProductsWithRatings(
      query.orderBy(sortField, order),
      limit,
      offset
    );
    
    res.json({
      success: true,
      products,
      hasMore: (offset + limit) < total,
      total,
      offset: offset + products.length
    });
  } catch (error) {
    console.error('Get more catalog error:', error);
    res.status(500).json({ success: false, error: 'Error loading products' });
  }
};

// Get all products (legacy - for product routes)
const getAllProducts = async (req, res) => {
  try {
    const category = req.query.category;
    const search = req.query.search;
    let products;
    
    let query = db('products');
    
    if (search) {
      query = query.where(function() {
        this.where('title', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`)
            .orWhere('category', 'ilike', `%${search}%`);
      });
    }
    
    if (category && category !== 'all') {
      query = query.where({ category });
    }
    
    products = await query.orderBy('created_at', 'desc');
    
    // Get categories that have at least 1 product
    const categoriesWithProducts = await db('products')
      .select('category')
      .count('id as product_count')
      .groupBy('category')
      .having(db.raw('count(id)'), '>', 0);
    const categories = categoriesWithProducts.map(cat => cat.category);
    
    res.render('user/collections', {
      title: 'Products - Shubham Garments',
      products,
      categories,
      selectedCategory: category || 'all',
      searchQuery: search || '',
      currentPage: 'collections'
    });
  } catch (error) {
    console.error('Get products error:', error);
    setFlash(req, 'error', 'Error loading products');
    res.redirect('/');
  }
};

// Get product details
const getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Product ID from params:', id);
    
    if (!id || isNaN(id)) {
      setFlash(req, 'error', 'Invalid product ID');
      return res.redirect('/');
    }
    
    const product = await db('products').where({ id: parseInt(id) }).first();
    if (!product) {
      setFlash(req, 'error', 'Product not found');
      return res.redirect('/');
    }
    
    // Get reviews for this product
    const reviews = await db('reviews')
      .where({ product_id: id })
      .join('users', 'reviews.user_id', 'users.id')
      .select('reviews.*', 'users.name as user_name')
      .orderBy('reviews.created_at', 'desc');
    
    // Calculate average rating
    const totalRatings = reviews.length;
    const avgRating = totalRatings > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    // Only users who purchased this product can review it
    const userId = req.session && req.session.userId ? req.session.userId : null;
    let canReview = false;
    if (userId) {
      const purchasedRow = await db('order_items')
        .join('orders', 'order_items.order_id', 'orders.id')
        .where('orders.user_id', userId)
        .where('order_items.item_type', 'product')
        .where('order_items.product_id', product.id)
        .whereIn('orders.status', ['processing', 'shipped', 'delivered'])
        .first();

      if (purchasedRow) {
        const existingUserReview = await db('reviews')
          .where({ product_id: product.id, user_id: userId })
          .first();
        canReview = !existingUserReview;
      }
    }
    
    // Fetch additional images for gallery
    const galleryImages = await db('product_images')
      .where({ product_id: product.id })
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'asc');

    // Fetch occasions linked to this product (many-to-many), with graceful fallback
    let productOccasions = [];
    try {
      productOccasions = await db('product_occasions')
        .join('occasions', 'product_occasions.occasion_id', 'occasions.id')
        .where('product_occasions.product_id', product.id)
        .select('occasions.id', 'occasions.name', 'occasions.slug')
        .orderBy('occasions.sort_order', 'asc')
        .orderBy('occasions.name', 'asc');
    } catch (e) {
      productOccasions = [];
    }
    
    res.render('user/product-details', {
      title: product.title,
      product,
      galleryImages,
      reviews,
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalRatings,
      canReview,
      productOccasions,
      currentPage: 'collections'
    });
  } catch (error) {
    console.error('Get product details error:', error);
    setFlash(req, 'error', 'Error loading product details');
    res.redirect('/');
  }
};

// Admin: List all products
const adminListProducts = async (req, res) => {
  try {
    const products = await db('products').orderBy('created_at', 'desc');
    res.render('admin/product-list', {
      title: 'Manage Products',
      products
    });
  } catch (error) {
    console.error('Admin list products error:', error);
    setFlash(req, 'error', 'Error loading products');
    res.redirect('/admin/dashboard');
  }
};

// Admin: View product details
const adminViewProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db('products').where({ id }).first();
    
    if (!product) {
      setFlash(req, 'error', 'Product not found');
      return res.redirect('/admin/products');
    }
    
    // Extract QR code number for display
    if (product.qr_code) {
      product.qrCodeNumber = extractQRCodeNumber(product.qr_code);
    }
    
    // Get reviews/ratings for the product
    const reviews = await db('reviews').where({ product_id: product.id });
    const totalRatings = reviews.length;
    const avgRating = totalRatings > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;
    
    res.render('admin/product-view', {
      title: `View Product - ${product.title}`,
      product: {
        ...product,
        avgRating: parseFloat(avgRating.toFixed(1)),
        totalRatings
      }
    });
  } catch (error) {
    console.error('Admin view product error:', error);
    setFlash(req, 'error', 'Error loading product');
    res.redirect('/admin/products');
  }
};

// Admin: Show product form (create/edit)
const adminShowProductForm = async (req, res) => {
  try {
    const { id } = req.params;
    let product = null;
    let galleryImages = [];
    
    let productOccasionIds = [];
    if (id) {
      product = await db('products').where({ id }).first();
      if (!product) {
        setFlash(req, 'error', 'Product not found');
        return res.redirect('/admin/products');
      }
      // Load gallery images
      galleryImages = await db('product_images')
        .where({ product_id: id })
        .orderBy('sort_order', 'asc')
        .orderBy('id', 'asc');

      // Load existing occasions for this product
      try {
        const poRows = await db('product_occasions')
          .where({ product_id: id })
          .select('occasion_id');
        productOccasionIds = poRows.map(r => r.occasion_id);
      } catch (e) {
        productOccasionIds = [];
      }
    }
    
    // Get all active categories
    const categories = await db('categories')
      .where({ is_active: true })
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc');
    
    // Get all active occasions
    let occasions = [];
    try {
      occasions = await db('occasions')
        .where({ is_active: true })
        .orderBy('sort_order', 'asc')
        .orderBy('name', 'asc');
    } catch (e) {
      occasions = [];
    }
    
    res.render('admin/product-form', {
      title: id ? 'Edit Product' : 'Add Product',
      product,
      productOccasionIds,
      categories,
      occasions,
      galleryImages
    });
  } catch (error) {
    console.error('Show product form error:', error);
    setFlash(req, 'error', 'Error loading form');
    res.redirect('/admin/products');
  }
};

// Admin: Create product
const adminCreateProduct = async (req, res) => {
  try {
    const { title, description, price, original_price, discount_percentage, image, stock, category, croppedImage, is_personalized, personalization_type, is_hamper_item, hamper_gender, galleryExistingOrder, occasion_ids } = req.body;
    
    const errors = validateProduct({ title, description, price, stock, category });
    if (errors.length > 0) {
      setFlash(req, 'error', errors[0]);
      return res.redirect('/admin/products/new');
    }
    
    let imageUrl = image || 'https://via.placeholder.com/400x600?text=Product+Image';
    let videoUrl = null;

    // Gallery count cap (5 images total => 1 primary + up to 4 gallery)
    const uploadedGallery = req.files && req.files.gallery ? req.files.gallery : [];
    const croppedGalleryImagesRaw = req.body.croppedGalleryImages;
    const croppedGalleryImages = Array.isArray(croppedGalleryImagesRaw)
      ? croppedGalleryImagesRaw
      : (croppedGalleryImagesRaw ? [croppedGalleryImagesRaw] : []);

    const incomingGalleryCount = croppedGalleryImages.length + uploadedGallery.length;
    if (incomingGalleryCount > 4) {
      setFlash(req, 'error', 'You can upload up to 4 gallery images (total 5 images).');
      return res.redirect('/admin/products/new');
    }

    // Handle primary image file upload (optional; when cropper is used, croppedImage is sent instead)
    if (req.files && req.files.image && req.files.image.length > 0) {
      const file = req.files.image[0];
      const ext = extensionFromContentType(file.mimetype);
      const key = `products/images/product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      imageUrl = await uploadBufferToS3({
        buffer: file.buffer,
        key,
        contentType: file.mimetype
      });
    }

    // Handle cropped image (base64) -> upload to S3
    if (croppedImage && String(croppedImage).startsWith('data:image')) {
      try {
        const parsed = parseDataUrl(croppedImage);
        if (parsed) {
          const buffer = Buffer.from(parsed.base64, 'base64');
          const ext = extensionFromContentType(parsed.contentType);
          const key = `products/images/product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          imageUrl = await uploadBufferToS3({
            buffer,
            key,
            contentType: parsed.contentType
          });
        }
      } catch (err) {
        console.error('Error uploading cropped image to S3:', err);
      }
    }

    // Handle optional product video upload
    if (req.files && req.files.video && req.files.video.length > 0) {
      const file = req.files.video[0];
      const ext = extensionFromContentType(file.mimetype);
      const key = `products/videos/product-video-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      videoUrl = await uploadBufferToS3({
        buffer: file.buffer,
        key,
        contentType: file.mimetype
      });
    }
    
    // Calculate discount percentage if original price is provided
    let finalDiscount = 0;
    const originalPrice = original_price ? parseFloat(original_price) : null;
    const sellingPrice = parseFloat(price);
    
    if (originalPrice && originalPrice > sellingPrice) {
      finalDiscount = Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
    } else if (discount_percentage) {
      finalDiscount = parseInt(discount_percentage);
    }
    
    // Always generate QR code automatically with full path and QR code image
    let qrCodeData = generateQRCodePath(req);
    let qrCodePath = qrCodeData.qrCodePath;
    let qrCodeNumber = qrCodeData.qrCodeNumber;
    let qrCodeImageUrl = qrCodeData.qrCodeImageUrl;
    
    // Ensure QR code is unique (check by QR code number)
    let existingQRCode = await db('products').where('qr_code', 'like', `%${qrCodeNumber}%`).first();
    while (existingQRCode) {
      qrCodeData = generateQRCodePath(req);
      qrCodePath = qrCodeData.qrCodePath;
      qrCodeNumber = qrCodeData.qrCodeNumber;
      qrCodeImageUrl = qrCodeData.qrCodeImageUrl;
      existingQRCode = await db('products').where('qr_code', 'like', `%${qrCodeNumber}%`).first();
    }
    
    const giftFields = {
      is_personalized: !!is_personalized,
      personalization_type: is_personalized ? (personalization_type || 'text') : null,
      is_hamper_item: !!is_hamper_item,
      hamper_gender: is_hamper_item ? (hamper_gender || null) : null
    };
    let newProductId;
    try {
      const inserted = await db('products').insert({
        title,
        description,
        price: sellingPrice,
        original_price: originalPrice,
        discount_percentage: finalDiscount,
        image: imageUrl,
        video_url: videoUrl,
        stock: parseInt(stock),
        category,
        qr_code: qrCodePath, // Store full path
        qr_code_image: qrCodeImageUrl, // Store QR code image URL
        ...giftFields
      }).returning('id');
      newProductId = Array.isArray(inserted) ? (inserted[0].id || inserted[0]) : inserted;
    } catch (insertError) {
      // Handle sequence out of sync error
      if (insertError.code === '23505' && insertError.constraint === 'products_pkey') {
        console.log('Fixing products sequence...');
        // Get the max ID from the table
        const maxIdResult = await db('products').max('id as max_id').first();
        const maxId = maxIdResult?.max_id || 0;
        // Reset the sequence to max ID + 1
        await db.raw(`SELECT setval('products_id_seq', ${maxId + 1}, false)`);
        // Retry the insert
        const insertedRetry = await db('products').insert({
          title,
          description,
          price: sellingPrice,
          original_price: originalPrice,
          discount_percentage: finalDiscount,
          image: imageUrl,
          stock: parseInt(stock),
          category,
          qr_code: qrCodePath,
          qr_code_image: qrCodeImageUrl,
          ...giftFields
        }).returning('id');
        newProductId = Array.isArray(insertedRetry) ? (insertedRetry[0].id || insertedRetry[0]) : insertedRetry;
      } else {
        throw insertError;
      }
    }
    
    // Save selected occasions (many-to-many)
    if (newProductId && occasion_ids) {
      const idsArray = Array.isArray(occasion_ids)
        ? occasion_ids
        : [occasion_ids];
      const cleanIds = idsArray
        .map(v => parseInt(v, 10))
        .filter(v => !isNaN(v));
      if (cleanIds.length > 0) {
        const occasionRows = cleanIds.map((occId, index) => ({
          product_id: newProductId,
          occasion_id: occId,
          sort_order: index
        }));
        await db('product_occasions').insert(occasionRows);
      }
    }
    // Save additional gallery images (cropped base64 preferred)
    if (newProductId) {
      // 1) Cropped gallery images from the cropper popup
      if (croppedGalleryImages.length > 0) {
        const galleryRows = [];
        for (let index = 0; index < croppedGalleryImages.length; index++) {
          const dataUrl = croppedGalleryImages[index];
          const parsed = parseDataUrl(dataUrl);
          if (!parsed) continue;

          const buffer = Buffer.from(parsed.base64, 'base64');
          const ext = extensionFromContentType(parsed.contentType);
          const key = `products/images/product-gallery-${Date.now()}-${index}-${Math.round(Math.random() * 1e9)}${ext}`;
          const url = await uploadBufferToS3({
            buffer,
            key,
            contentType: parsed.contentType
          });
          galleryRows.push({
            product_id: newProductId,
            image_url: url,
            sort_order: index
          });
        }
        if (galleryRows.length) {
          await db('product_images').insert(galleryRows);
        }
      } else if (req.files && req.files.gallery && req.files.gallery.length > 0) {
        // 2) Fallback: raw uploaded gallery files (old behavior)
        const galleryRows = [];
        for (let index = 0; index < req.files.gallery.length; index++) {
          const file = req.files.gallery[index];
          const ext = extensionFromContentType(file.mimetype);
          const key = `products/images/product-gallery-${Date.now()}-${index}-${Math.round(Math.random() * 1e9)}${ext}`;
          const url = await uploadBufferToS3({
            buffer: file.buffer,
            key,
            contentType: file.mimetype
          });
          galleryRows.push({
            product_id: newProductId,
            image_url: url,
            sort_order: index
          });
        }
        if (galleryRows.length) {
          await db('product_images').insert(galleryRows);
        }
      }
    }
    
    setFlash(req, 'success', 'Product created successfully!');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Create product error:', error);
    setFlash(req, 'error', 'Error creating product');
    res.redirect('/admin/products/new');
  }
};

// Admin: Update product
const adminUpdateProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const { title, description, price, original_price, discount_percentage, image, stock, category, croppedImage, is_personalized, personalization_type, is_hamper_item, hamper_gender, occasion_ids } = req.body;
    
    const errors = validateProduct({ title, description, price, stock, category });
    if (errors.length > 0) {
      setFlash(req, 'error', errors[0]);
      return res.redirect(`/admin/products/${id}/edit`);
    }
    
    // Get existing product to preserve image if not changed
    const existingProduct = await db('products').where({ id }).first();
    let imageUrl = existingProduct?.image || 'https://via.placeholder.com/400x600?text=Product+Image';
    let videoUrl = existingProduct?.video_url || null;

    const uploadedGallery = req.files && req.files.gallery ? req.files.gallery : [];
    const croppedGalleryImagesRaw = req.body.croppedGalleryImages;
    const croppedGalleryImages = Array.isArray(croppedGalleryImagesRaw)
      ? croppedGalleryImagesRaw
      : (croppedGalleryImagesRaw ? [croppedGalleryImagesRaw] : []);
    const uploadedPrimary = req.files && req.files.image ? req.files.image : [];
    const uploadedVideo = req.files && req.files.video ? req.files.video : [];

    // Enforce "5 images total": 1 primary + up to 4 gallery images
    const incomingGalleryCount = croppedGalleryImages.length + uploadedGallery.length;
    if (incomingGalleryCount > 0) {
      const existingGalleryCountRow = await db('product_images')
        .where({ product_id: id })
        .count('id as count')
        .first();
      const existingGalleryCount = parseInt(existingGalleryCountRow?.count || 0, 10);
      const existingPrimaryCount = existingProduct?.image ? 1 : 0;
      const currentTotalImages = existingPrimaryCount + existingGalleryCount;
      const maxAdditionalImages = 5 - currentTotalImages;

      if (maxAdditionalImages <= 0 || incomingGalleryCount > maxAdditionalImages) {
        setFlash(req, 'error', `You can only have up to 5 images per product (1 primary + 4 gallery).`);
        return res.redirect(`/admin/products/${id}/edit`);
      }
    }
    
    // Handle uploaded file
    if (uploadedPrimary.length > 0) {
      // Delete old image if it's a local file
      if (existingProduct?.image && existingProduct.image.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, '../..', existingProduct.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      const file = uploadedPrimary[0];
      const ext = extensionFromContentType(file.mimetype);
      const key = `products/images/product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      imageUrl = await uploadBufferToS3({
        buffer: file.buffer,
        key,
        contentType: file.mimetype
      });
    }
    
    // Handle cropped image (base64)
    if (croppedImage && String(croppedImage).startsWith('data:image')) {
      try {
        // Delete old image if it's a local file
        if (existingProduct?.image && existingProduct.image.startsWith('/uploads/')) {
          const oldImagePath = path.join(__dirname, '../..', existingProduct.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }

        const parsed = parseDataUrl(croppedImage);
        if (parsed) {
          const buffer = Buffer.from(parsed.base64, 'base64');
          const ext = extensionFromContentType(parsed.contentType);
          const key = `products/images/product-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          imageUrl = await uploadBufferToS3({
            buffer,
            key,
            contentType: parsed.contentType
          });
        }
      } catch (err) {
        console.error('Error uploading cropped image to S3:', err);
      }
    } else if (image && image.startsWith('http')) {
      // Use provided URL
      imageUrl = image;
    }

    // Handle optional video upload replacement
    if (uploadedVideo.length > 0) {
      const file = uploadedVideo[0];
      const ext = extensionFromContentType(file.mimetype);
      const key = `products/videos/product-video-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      videoUrl = await uploadBufferToS3({
        buffer: file.buffer,
        key,
        contentType: file.mimetype
      });
    }
    
    // Calculate discount percentage if original price is provided
    let finalDiscount = 0;
    const originalPrice = original_price ? parseFloat(original_price) : null;
    const sellingPrice = parseFloat(price);
    
    if (originalPrice && originalPrice > sellingPrice) {
      finalDiscount = Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
    } else if (discount_percentage) {
      finalDiscount = parseInt(discount_percentage);
    }
    
    // Always ensure QR code exists - preserve existing or generate new one
    let qrCode = existingProduct?.qr_code;
    let qrCodeImage = existingProduct?.qr_code_image;
    
    // If no QR code exists, generate one with full path and QR code image
    if (!qrCode) {
      let qrCodeData = generateQRCodePath(req);
      qrCode = qrCodeData.qrCodePath;
      qrCodeImage = qrCodeData.qrCodeImageUrl;
      let qrCodeNumber = qrCodeData.qrCodeNumber;
      
      // Ensure QR code is unique (check by QR code number)
      let existingQRCode = await db('products').where('qr_code', 'like', `%${qrCodeNumber}%`).where('id', '!=', id).first();
      while (existingQRCode) {
        qrCodeData = generateQRCodePath(req);
        qrCode = qrCodeData.qrCodePath;
        qrCodeImage = qrCodeData.qrCodeImageUrl;
        qrCodeNumber = qrCodeData.qrCodeNumber;
        existingQRCode = await db('products').where('qr_code', 'like', `%${qrCodeNumber}%`).where('id', '!=', id).first();
      }
    }
    
    await db('products').where({ id }).update({
      title,
      description,
      price: sellingPrice,
      original_price: originalPrice,
      discount_percentage: finalDiscount,
      image: imageUrl,
      video_url: videoUrl,
      stock: parseInt(stock),
      category,
      qr_code: qrCode,
      qr_code_image: qrCodeImage,
      is_personalized: !!is_personalized,
      personalization_type: is_personalized ? (personalization_type || 'text') : null,
      is_hamper_item: !!is_hamper_item,
      hamper_gender: is_hamper_item ? (hamper_gender || null) : null,
      updated_at: new Date()
    });

    // Update product occasions (many-to-many)
    await db('product_occasions').where({ product_id: id }).del();
    if (occasion_ids) {
      const idsArray = Array.isArray(occasion_ids)
        ? occasion_ids
        : [occasion_ids];
      const cleanIds = idsArray
        .map(v => parseInt(v, 10))
        .filter(v => !isNaN(v));
      if (cleanIds.length > 0) {
        const occasionRows = cleanIds.map((occId, index) => ({
          product_id: id,
          occasion_id: occId,
          sort_order: index
        }));
        await db('product_occasions').insert(occasionRows);
      }
    }
    
    // Handle newly uploaded gallery images on edit
    if (croppedGalleryImages.length > 0 || (req.files && req.files.gallery && req.files.gallery.length > 0)) {
      // Determine current max sort_order
      const maxSort = await db('product_images')
        .where({ product_id: id })
        .max('sort_order as max_order')
        .first();
      let baseOrder = maxSort && maxSort.max_order != null ? maxSort.max_order + 1 : 0;

      const galleryRows = [];

      if (croppedGalleryImages.length > 0) {
        for (let index = 0; index < croppedGalleryImages.length; index++) {
          const dataUrl = croppedGalleryImages[index];
          const parsed = parseDataUrl(dataUrl);
          if (!parsed) continue;

          const buffer = Buffer.from(parsed.base64, 'base64');
          const ext = extensionFromContentType(parsed.contentType);
          const key = `products/images/product-gallery-${Date.now()}-${index}-${Math.round(Math.random() * 1e9)}${ext}`;
          const url = await uploadBufferToS3({
            buffer,
            key,
            contentType: parsed.contentType
          });

          galleryRows.push({
            product_id: id,
            image_url: url,
            sort_order: baseOrder + index
          });
        }
      } else {
        // Fallback: raw uploaded gallery files (old behavior)
        for (let index = 0; index < req.files.gallery.length; index++) {
          const file = req.files.gallery[index];
          const ext = extensionFromContentType(file.mimetype);
          const key = `products/images/product-gallery-${Date.now()}-${index}-${Math.round(Math.random() * 1e9)}${ext}`;
          const url = await uploadBufferToS3({
            buffer: file.buffer,
            key,
            contentType: file.mimetype
          });

          galleryRows.push({
            product_id: id,
            image_url: url,
            sort_order: baseOrder + index
          });
        }
      }

      if (galleryRows.length) {
        await db('product_images').insert(galleryRows);
      }
    }
    
    setFlash(req, 'success', 'Product updated successfully!');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Update product error:', error);
    setFlash(req, 'error', 'Error updating product');
    res.redirect(`/admin/products/${id}/edit`);
  }
};

// Admin: Delete product
const adminDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete gallery images (files will be left on disk for simplicity)
    await db('product_images').where({ product_id: id }).del();
    
    await db('products').where({ id }).del();
    
    setFlash(req, 'success', 'Product deleted successfully!');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Delete product error:', error);
    setFlash(req, 'error', 'Error deleting product');
    res.redirect('/admin/products');
  }
};

// Get product by QR code
const getProductByQRCode = async (req, res) => {
  try {
    const { qrcode } = req.params; // This is the QR code number from URL
    
    // Search for product where qr_code field contains this QR code number
    // (since we store full path like http://domain/products/qrcode/VSC123)
    const product = await db('products')
      .where('qr_code', 'like', `%${qrcode}%`)
      .first();
    
    if (!product) {
      setFlash(req, 'error', 'Product not found');
      return res.redirect('/');
    }
    
    // Get reviews for this product
    const reviews = await db('reviews')
      .where({ product_id: product.id })
      .join('users', 'reviews.user_id', 'users.id')
      .select('reviews.*', 'users.name as user_name')
      .orderBy('reviews.created_at', 'desc');
    
    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    
    // Extract QR code number for display
    if (product.qr_code) {
      product.qrCodeNumber = extractQRCodeNumber(product.qr_code);
    }
    
    res.render('user/product-qrcode', {
      title: product.title,
      product,
      reviews,
      avgRating: avgRating.toFixed(1),
      currentPage: 'collections'
    });
  } catch (error) {
    console.error('Get product by QR code error:', error);
    setFlash(req, 'error', 'Error loading product');
    res.redirect('/');
  }
};

module.exports = {
  getHomePage,
  getCollectionsPage,
  getCatalogPage,
  getOccasionsPage,
  getMoreCollections,
  getMoreCatalog,
  getAllProducts,
  getProductDetails,
  getProductByQRCode,
  adminListProducts,
  adminViewProduct,
  adminShowProductForm,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  // lightweight search for header typeahead
  async searchProducts(req, res) {
    try {
      const q = (req.query.q || '').trim();
      if (!q) {
        return res.json({ success: true, products: [] });
      }
      const limit = 10;
      const products = await db('products')
        .where(function () {
          this.where('title', 'ilike', `%${q}%`)
            .orWhere('description', 'ilike', `%${q}%`)
            .orWhere('category', 'ilike', `%${q}%`);
        })
        .orderBy('created_at', 'desc')
        .limit(limit)
        .select('id', 'title', 'price', 'image', 'category');
      return res.json({ success: true, products });
    } catch (err) {
      console.error('searchProducts error:', err);
      return res.status(500).json({ success: false, products: [] });
    }
  }
};

