const db = require('../../config/database');
const { setFlash } = require('../../libs/helpers');

// Helper function to generate slug
const generateSlug = (name) => {
  return name.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Admin: List all categories
const adminListCategories = async (req, res) => {
  try {
    const categories = await db('categories')
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc');
    
    // Get product count for each category
    for (let category of categories) {
      const productCount = await db('products')
        .where('category', category.name)
        .orWhere('category_id', category.id)
        .count('id as count')
        .first();
      category.productCount = productCount.count || 0;
    }
    
    res.render('admin/category-list', {
      title: 'Manage Categories',
      categories
    });
  } catch (error) {
    console.error('Admin list categories error:', error);
    setFlash(req, 'error', 'Error loading categories');
    res.redirect('/admin/dashboard');
  }
};

// Admin: Show category form (create/edit)
const adminShowCategoryForm = async (req, res) => {
  try {
    const { id } = req.params;
    let category = null;
    
    if (id) {
      category = await db('categories').where({ id }).first();
      if (!category) {
        setFlash(req, 'error', 'Category not found');
        return res.redirect('/admin/categories');
      }
    }
    
    res.render('admin/category-form', {
      title: id ? 'Edit Category' : 'Add Category',
      category
    });
  } catch (error) {
    console.error('Show category form error:', error);
    setFlash(req, 'error', 'Error loading form');
    res.redirect('/admin/categories');
  }
};

// Admin: Create category
const adminCreateCategory = async (req, res) => {
  try {
    const { name, description, is_active, sort_order } = req.body;
    
    if (!name || name.trim() === '') {
      setFlash(req, 'error', 'Category name is required');
      return res.redirect('/admin/categories/new');
    }
    
    // Check if category with same name exists
    const existing = await db('categories').where({ name: name.trim() }).first();
    if (existing) {
      setFlash(req, 'error', 'Category with this name already exists');
      return res.redirect('/admin/categories/new');
    }
    
    const slug = generateSlug(name);
    
    // Check if slug exists
    const existingSlug = await db('categories').where({ slug }).first();
    if (existingSlug) {
      setFlash(req, 'error', 'Category with similar name already exists');
      return res.redirect('/admin/categories/new');
    }
    
    await db('categories').insert({
      name: name.trim(),
      description: description || null,
      slug,
      is_active: is_active === 'true' || is_active === true,
      sort_order: parseInt(sort_order) || 0
    });
    
    setFlash(req, 'success', 'Category created successfully!');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Create category error:', error);
    setFlash(req, 'error', 'Error creating category');
    res.redirect('/admin/categories/new');
  }
};

// Admin: Update category
const adminUpdateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, sort_order } = req.body;
    
    if (!name || name.trim() === '') {
      setFlash(req, 'error', 'Category name is required');
      return res.redirect(`/admin/categories/${id}/edit`);
    }
    
    const category = await db('categories').where({ id }).first();
    if (!category) {
      setFlash(req, 'error', 'Category not found');
      return res.redirect('/admin/categories');
    }
    
    // Check if another category with same name exists
    const existing = await db('categories')
      .where({ name: name.trim() })
      .where('id', '!=', id)
      .first();
    if (existing) {
      setFlash(req, 'error', 'Category with this name already exists');
      return res.redirect(`/admin/categories/${id}/edit`);
    }
    
    const slug = generateSlug(name);
    
    // Check if another category with same slug exists
    const existingSlug = await db('categories')
      .where({ slug })
      .where('id', '!=', id)
      .first();
    if (existingSlug) {
      setFlash(req, 'error', 'Category with similar name already exists');
      return res.redirect(`/admin/categories/${id}/edit`);
    }
    
    await db('categories').where({ id }).update({
      name: name.trim(),
      description: description || null,
      slug,
      is_active: is_active === 'true' || is_active === true,
      sort_order: parseInt(sort_order) || 0,
      updated_at: new Date()
    });
    
    setFlash(req, 'success', 'Category updated successfully!');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Update category error:', error);
    setFlash(req, 'error', 'Error updating category');
    res.redirect(`/admin/categories/${id}/edit`);
  }
};

// Admin: Delete category
const adminDeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get category first
    const category = await db('categories').where({ id }).first();
    if (!category) {
      setFlash(req, 'error', 'Category not found');
      return res.redirect('/admin/categories');
    }
    
    // Check if category has products
    const productCountByCategoryId = await db('products')
      .where('category_id', id)
      .count('id as count')
      .first();
    
    const productCountByCategoryName = await db('products')
      .where('category', category.name)
      .count('id as count')
      .first();
    
    const totalCount = parseInt(productCountByCategoryId.count || 0) + parseInt(productCountByCategoryName.count || 0);
    
    if (totalCount > 0) {
      setFlash(req, 'error', `Cannot delete category. ${totalCount} product(s) are using this category.`);
      return res.redirect('/admin/categories');
    }
    
    await db('categories').where({ id }).del();
    
    setFlash(req, 'success', 'Category deleted successfully!');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Delete category error:', error);
    setFlash(req, 'error', 'Error deleting category');
    res.redirect('/admin/categories');
  }
};

// Get all active categories (for frontend)
const getActiveCategories = async (req, res) => {
  try {
    const categories = await db('categories')
      .where({ is_active: true })
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc');
    
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: 'Error loading categories' });
  }
};

module.exports = {
  adminListCategories,
  adminShowCategoryForm,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  getActiveCategories
};

