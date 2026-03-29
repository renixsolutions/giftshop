const db = require('../../config/database');

/**
 * POST /api/hampers — Add a custom hamper to cart (JSON body)
 * Body: { boxId, items: [{ productId, qty, personalization? }], giftNote?, deliveryDate? }
 */
async function addHamperToCart(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Please sign in to add to cart.' });
  }
  try {
    const { boxId, items = [], giftNote = '', deliveryDate = '' } = req.body;
    if (!boxId || !items.length) {
      return res.status(400).json({ success: false, message: 'Select a box and at least one item.' });
    }
    const box = await db('hamper_boxes').where({ id: boxId }).first();
    if (!box) {
      return res.status(400).json({ success: false, message: 'Invalid box.' });
    }
    let total = Number(box.base_price);
    const lineItems = [];
    for (const it of items) {
      const product = await db('products').where({ id: it.productId }).first();
      if (!product) continue;
      const qty = Math.max(1, parseInt(it.qty, 10) || 1);
      total += Number(product.price) * qty;
      lineItems.push({
        productId: product.id,
        name: product.title,
        price: product.price,
        qty,
        personalization: it.personalization || null
      });
    }
    const hamperData = {
      boxId: box.id,
      boxName: box.name,
      boxPrice: box.base_price,
      items: lineItems,
      giftNote,
      deliveryDate,
      total
    };
    await db('cart').insert({
      user_id: req.session.userId,
      product_id: null,
      quantity: 1,
      item_type: 'hamper',
      hamper_data: JSON.stringify(hamperData)
    });
    return res.json({ success: true, message: 'Hamper added to cart.' });
  } catch (err) {
    console.error('addHamperToCart error:', err);
    return res.status(500).json({ success: false, message: 'Could not add hamper to cart.' });
  }
}

/**
 * GET /build-hamper — Build Your Own Hamper page
 * Loads hamper_boxes and products that are hamper items, grouped by category
 */
async function getBuildPage(req, res) {
  try {
    const boxes = await db('hamper_boxes')
      .where({ is_active: true })
      .orderBy('sort_order')
      .select('id', 'name', 'base_price', 'description', 'icon');

    // Products that can go inside a hamper (is_hamper_item = true)
    const hamperProducts = await db('products')
      .where({ is_hamper_item: true })
      .select('id', 'title', 'price', 'category', 'category_id', 'is_personalized', 'personalization_type', 'image', 'description');

    // Group by category name (use category string or category_id join)
    const byCategory = {};
    for (const p of hamperProducts) {
      const catName = p.category || 'Gift Add-ons';
      if (!byCategory[catName]) byCategory[catName] = [];
      byCategory[catName].push(p);
    }
    const categoriesWithItems = Object.entries(byCategory).map(([name, items]) => ({ name, items }));

    res.render('user/build-hamper', {
      title: 'Build Your Hamper',
      boxes,
      categoriesWithItems,
      currentPage: 'build'
    });
  } catch (err) {
    console.error('getBuildPage error:', err);
    res.status(500).render('user/500', { title: 'Error' });
  }
}

module.exports = {
  getBuildPage,
  addHamperToCart
};
