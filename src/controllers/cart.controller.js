const db = require('../../config/database');
const { setFlash } = require('../../libs/helpers');

// Get cart (includes product items and hamper items)
const getCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const rows = await db('cart').where({ user_id: userId }).select('*');
    const cartItems = [];
    let total = 0;
    for (const row of rows) {
      if (row.item_type === 'hamper' && row.hamper_data) {
        const data = typeof row.hamper_data === 'string' ? JSON.parse(row.hamper_data) : row.hamper_data;
        cartItems.push({
          id: row.id,
          quantity: row.quantity,
          item_type: 'hamper',
          title: 'Your Built Hamper',
          price: data.total,
          image: null,
          stock: 999,
          hamper_data: data
        });
        total += Number(data.total) * (row.quantity || 1);
      } else if (row.product_id) {
        const product = await db('products').where({ id: row.product_id }).first();
        if (product) {
          cartItems.push({
            id: row.id,
            quantity: row.quantity,
            product_id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            stock: product.stock,
            item_type: 'product'
          });
          total += parseFloat(product.price) * row.quantity;
        }
      }
    }
    res.render('user/cart', {
      title: 'Shopping Cart',
      cartItems,
      total
    });
  } catch (error) {
    console.error('Get cart error:', error);
    setFlash(req, 'error', 'Error loading cart');
    res.redirect('/');
  }
};

// Add to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { productId, quantity } = req.body;
    
    if (!productId || !quantity || quantity < 1) {
      setFlash(req, 'error', 'Invalid quantity');
      return res.redirect('back');
    }
    
    // Check if product exists and has stock
    const product = await db('products').where({ id: productId }).first();
    if (!product) {
      setFlash(req, 'error', 'Product not found');
      return res.redirect('back');
    }
    
    if (product.stock < quantity) {
      setFlash(req, 'error', 'Insufficient stock');
      return res.redirect('back');
    }
    
    // Check if item already in cart
    const existingItem = await db('cart')
      .where({ user_id: userId, product_id: productId })
      .first();
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + parseInt(quantity);
      if (newQuantity > product.stock) {
        setFlash(req, 'error', 'Insufficient stock');
        return res.redirect('back');
      }
      await db('cart')
        .where({ id: existingItem.id })
        .update({ quantity: newQuantity });
    } else {
      await db('cart').insert({
        user_id: userId,
        product_id: productId,
        quantity: parseInt(quantity)
      });
    }
    
    setFlash(req, 'success', 'Item added to cart!');
    res.redirect('/cart');
  } catch (error) {
    console.error('Add to cart error:', error);
    setFlash(req, 'error', 'Error adding to cart');
    res.redirect('back');
  }
};

// Update cart item
const updateCartItem = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      setFlash(req, 'error', 'Invalid quantity');
      return res.redirect('/cart');
    }
    
    const cartItem = await db('cart').where({ id, user_id: userId }).first();
    if (!cartItem) {
      setFlash(req, 'error', 'Cart item not found');
      return res.redirect('/cart');
    }
    if (cartItem.item_type === 'hamper') {
      await db('cart').where({ id }).update({ quantity: 1 });
      setFlash(req, 'success', 'Cart updated!');
      return res.redirect('/cart');
    }
    const product = await db('products').where({ id: cartItem.product_id }).first();
    if (product.stock < quantity) {
      setFlash(req, 'error', 'Insufficient stock');
      return res.redirect('/cart');
    }
    await db('cart').where({ id }).update({ quantity: parseInt(quantity) });
    
    setFlash(req, 'success', 'Cart updated!');
    res.redirect('/cart');
  } catch (error) {
    console.error('Update cart error:', error);
    setFlash(req, 'error', 'Error updating cart');
    res.redirect('/cart');
  }
};

// Remove from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    
    await db('cart').where({ id, user_id: userId }).del();
    
    setFlash(req, 'success', 'Item removed from cart!');
    res.redirect('/cart');
  } catch (error) {
    console.error('Remove from cart error:', error);
    setFlash(req, 'error', 'Error removing item');
    res.redirect('/cart');
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart
};

