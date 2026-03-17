const bcrypt = require('bcryptjs');
const db = require('../../config/database');
const { setFlash } = require('../../libs/helpers');

// Admin Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      setFlash(req, 'error', 'Email and password are required');
      return res.redirect('/admin/login');
    }
    
    // Find admin
    const admin = await db('admins').where({ email }).first();
    if (!admin) {
      setFlash(req, 'error', 'Invalid email or password');
      return res.redirect('/admin/login');
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      setFlash(req, 'error', 'Invalid email or password');
      return res.redirect('/admin/login');
    }
    
    // Set session
    req.session.adminId = admin.id;
    req.session.adminName = admin.name;
    
    setFlash(req, 'success', 'Admin login successful!');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    setFlash(req, 'error', 'Login failed. Please try again.');
    res.redirect('/admin/login');
  }
};

// Admin Logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin/login');
  });
};

// Dashboard
const dashboard = async (req, res) => {
  try {
    const productCount = await db('products').count('id as count').first();
    const pendingOrdersCount = await db('orders').where({ status: 'pending' }).count('id as count').first();
    const totalOrdersCount = await db('orders').count('id as count').first();
    
    // Get orders by status for pie chart
    const ordersByStatusRaw = await db('orders')
      .select('status')
      .count('id as count')
      .groupBy('status');
    
    const ordersByStatus = ordersByStatusRaw.map(row => ({
      status: row.status,
      count: typeof row.count === 'string' ? parseInt(row.count) : (row.count || 0)
    }));
    
    // Get products by category for pie chart
    // Try to get from categories table first, fallback to products.category
    let productsByCategory = [];
    try {
      const categoriesWithProducts = await db('categories')
        .leftJoin('products', function() {
          this.on('categories.id', '=', 'products.category_id')
            .orOn('categories.name', '=', 'products.category');
        })
        .select('categories.name as category')
        .count('products.id as count')
        .groupBy('categories.id', 'categories.name')
        .where('categories.is_active', true);
      
      productsByCategory = categoriesWithProducts.map(cat => ({
        category: cat.category || 'Uncategorized',
        count: parseInt(cat.count) || 0
      }));
      
      // If no categories found, try old method
      if (productsByCategory.length === 0) {
        const oldCategories = await db('products')
          .select('category')
          .count('id as count')
          .whereNotNull('category')
          .groupBy('category');
        productsByCategory = oldCategories;
      }
    } catch (err) {
      // Fallback to old method if categories table doesn't exist
      productsByCategory = await db('products')
        .select('category')
        .count('id as count')
        .whereNotNull('category')
        .groupBy('category');
    }
    
    // Get orders by month for bar chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const ordersByMonthRaw = await db('orders')
      .select(db.raw("TO_CHAR(created_at, 'YYYY-MM') as month"))
      .count('id as count')
      .where('created_at', '>=', sixMonthsAgo)
      .groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
      .orderBy('month', 'asc');
    
    const ordersByMonth = ordersByMonthRaw.map(row => ({
      month: row.month,
      count: typeof row.count === 'string' ? parseInt(row.count) : (row.count || 0)
    }));
    
    // Get revenue by month for bar chart
    const revenueByMonthRaw = await db('orders')
      .select(db.raw("TO_CHAR(created_at, 'YYYY-MM') as month"))
      .sum('total_amount as revenue')
      .where('created_at', '>=', sixMonthsAgo)
      .where('status', '!=', 'cancelled')
      .groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
      .orderBy('month', 'asc');
    
    const revenueByMonth = revenueByMonthRaw.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue || 0)
    }));
    
    // Calculate total revenue
    const totalRevenue = await db('orders')
      .where('status', '!=', 'cancelled')
      .sum('total_amount as total')
      .first();
    
    // Get top selling products (by quantity ordered)
    const topProducts = await db('order_items')
      .join('products', 'order_items.product_id', 'products.id')
      .select('products.title', 'products.id')
      .sum('order_items.quantity as total_quantity')
      .groupBy('products.id', 'products.title')
      .orderBy('total_quantity', 'desc')
      .limit(5);
    
    // Parse count values (PostgreSQL returns as string)
    const parseCount = (count) => {
      if (!count) return 0;
      return typeof count === 'string' ? parseInt(count) : (count || 0);
    };
    
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      productCount: parseCount(productCount?.count),
      pendingOrdersCount: parseCount(pendingOrdersCount?.count),
      totalOrdersCount: parseCount(totalOrdersCount?.count),
      totalRevenue: parseFloat(totalRevenue?.total || 0),
      ordersByStatus: ordersByStatus || [],
      productsByCategory: productsByCategory || [],
      ordersByMonth: ordersByMonth || [],
      revenueByMonth: revenueByMonth || [],
      topProducts: topProducts || []
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    setFlash(req, 'error', 'Error loading dashboard');
    res.redirect('/admin/dashboard');
  }
};

// Show login form
const showLogin = (req, res) => {
  res.render('admin/login', { title: 'Admin Login' });
};

// Corporate leads list (GiftHouse)
const corporateLeadsList = async (req, res) => {
  try {
    const leads = await db('corporate_leads').orderBy('created_at', 'desc').select('*');
    res.render('admin/corporate-leads', { title: 'Corporate Leads', leads });
  } catch (e) {
    console.error(e);
    setFlash(req, 'error', 'Error loading leads');
    res.redirect('/admin/dashboard');
  }
};

// Update corporate lead status
const corporateLeadUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    await db('corporate_leads').where({ id }).update({
      status: status || 'new',
      admin_notes: admin_notes || null,
      updated_at: new Date()
    });
    setFlash(req, 'success', 'Lead updated');
  } catch (e) {
    setFlash(req, 'error', 'Update failed');
  }
  res.redirect('/admin/leads');
};

module.exports = {
  login,
  logout,
  dashboard,
  showLogin,
  corporateLeadsList,
  corporateLeadUpdateStatus
};

