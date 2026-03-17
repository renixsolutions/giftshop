const db = require('../../config/database');
const { setFlash } = require('../../libs/helpers');

const generateSlug = (name) => {
  return name.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Admin: list occasions
const adminListOccasions = async (req, res) => {
  try {
    const occasions = await db('occasions')
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc');

    for (let occ of occasions) {
      const productCount = await db('products')
        .where('occasion_id', occ.id)
        .orWhere('occasion', occ.name)
        .count('id as count')
        .first();
      occ.productCount = productCount.count || 0;
    }

    res.render('admin/occasion-list', {
      title: 'Manage Occasions',
      occasions
    });
  } catch (err) {
    console.error('Admin list occasions error:', err);
    setFlash(req, 'error', 'Error loading occasions');
    res.redirect('/admin/dashboard');
  }
};

// Admin: show form
const adminShowOccasionForm = async (req, res) => {
  try {
    const { id } = req.params;
    let occasion = null;

    if (id) {
      occasion = await db('occasions').where({ id }).first();
      if (!occasion) {
        setFlash(req, 'error', 'Occasion not found');
        return res.redirect('/admin/occasions');
      }
    }

    res.render('admin/occasion-form', {
      title: id ? 'Edit Occasion' : 'Add Occasion',
      occasion
    });
  } catch (err) {
    console.error('Show occasion form error:', err);
    setFlash(req, 'error', 'Error loading form');
    res.redirect('/admin/occasions');
  }
};

// Admin: create
const adminCreateOccasion = async (req, res) => {
  try {
    const { name, description, is_active, sort_order } = req.body;

    if (!name || !name.trim()) {
      setFlash(req, 'error', 'Occasion name is required');
      return res.redirect('/admin/occasions/new');
    }

    const existing = await db('occasions').where({ name: name.trim() }).first();
    if (existing) {
      setFlash(req, 'error', 'Occasion with this name already exists');
      return res.redirect('/admin/occasions/new');
    }

    const slug = generateSlug(name);
    const existingSlug = await db('occasions').where({ slug }).first();
    if (existingSlug) {
      setFlash(req, 'error', 'Occasion with similar name already exists');
      return res.redirect('/admin/occasions/new');
    }

    await db('occasions').insert({
      name: name.trim(),
      description: description || null,
      slug,
      is_active: is_active === 'true' || is_active === true,
      sort_order: parseInt(sort_order) || 0
    });

    setFlash(req, 'success', 'Occasion created successfully!');
    res.redirect('/admin/occasions');
  } catch (err) {
    console.error('Create occasion error:', err);
    setFlash(req, 'error', 'Error creating occasion');
    res.redirect('/admin/occasions/new');
  }
};

// Admin: update
const adminUpdateOccasion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, sort_order } = req.body;

    if (!name || !name.trim()) {
      setFlash(req, 'error', 'Occasion name is required');
      return res.redirect(`/admin/occasions/${id}/edit`);
    }

    const occasion = await db('occasions').where({ id }).first();
    if (!occasion) {
      setFlash(req, 'error', 'Occasion not found');
      return res.redirect('/admin/occasions');
    }

    const existing = await db('occasions')
      .where({ name: name.trim() })
      .where('id', '!=', id)
      .first();
    if (existing) {
      setFlash(req, 'error', 'Occasion with this name already exists');
      return res.redirect(`/admin/occasions/${id}/edit`);
    }

    const slug = generateSlug(name);
    const existingSlug = await db('occasions')
      .where({ slug })
      .where('id', '!=', id)
      .first();
    if (existingSlug) {
      setFlash(req, 'error', 'Occasion with similar name already exists');
      return res.redirect(`/admin/occasions/${id}/edit`);
    }

    await db('occasions').where({ id }).update({
      name: name.trim(),
      description: description || null,
      slug,
      is_active: is_active === 'true' || is_active === true,
      sort_order: parseInt(sort_order) || 0,
      updated_at: new Date()
    });

    setFlash(req, 'success', 'Occasion updated successfully!');
    res.redirect('/admin/occasions');
  } catch (err) {
    console.error('Update occasion error:', err);
    setFlash(req, 'error', 'Error updating occasion');
    res.redirect(`/admin/occasions/${id}/edit`);
  }
};

// Admin: delete
const adminDeleteOccasion = async (req, res) => {
  try {
    const { id } = req.params;
    const occasion = await db('occasions').where({ id }).first();
    if (!occasion) {
      setFlash(req, 'error', 'Occasion not found');
      return res.redirect('/admin/occasions');
    }

    const productCountById = await db('products')
      .where('occasion_id', id)
      .count('id as count')
      .first();
    const productCountByName = await db('products')
      .where('occasion', occasion.name)
      .count('id as count')
      .first();
    const total = parseInt(productCountById.count || 0) + parseInt(productCountByName.count || 0);

    if (total > 0) {
      setFlash(req, 'error', `Cannot delete occasion. ${total} product(s) are using this occasion.`);
      return res.redirect('/admin/occasions');
    }

    await db('occasions').where({ id }).del();
    setFlash(req, 'success', 'Occasion deleted successfully!');
    res.redirect('/admin/occasions');
  } catch (err) {
    console.error('Delete occasion error:', err);
    setFlash(req, 'error', 'Error deleting occasion');
    res.redirect('/admin/occasions');
  }
};

module.exports = {
  adminListOccasions,
  adminShowOccasionForm,
  adminCreateOccasion,
  adminUpdateOccasion,
  adminDeleteOccasion
};

