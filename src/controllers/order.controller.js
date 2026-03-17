const db = require('../../config/database');
const { setFlash } = require('../../libs/helpers');

// Show checkout page (cart items include products and hampers)
const showCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;
    const rows = await db('cart').where({ user_id: userId }).select('*');
    const cartItems = [];
    let totalAmount = 0;
    for (const row of rows) {
      if (row.item_type === 'hamper' && row.hamper_data) {
        const data = typeof row.hamper_data === 'string' ? JSON.parse(row.hamper_data) : row.hamper_data;
        cartItems.push({
          id: row.id,
          quantity: row.quantity,
          item_type: 'hamper',
          product_id: null,
          title: 'Your Built Hamper',
          price: data.total,
          image: null,
          stock: 999
        });
        totalAmount += Number(data.total) * (row.quantity || 1);
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
          totalAmount += parseFloat(product.price) * row.quantity;
        }
      }
    }
    if (cartItems.length === 0) {
      setFlash(req, 'error', 'Your cart is empty');
      return res.redirect('/cart');
    }
    const user = await db('users').where({ id: userId }).first();
    res.render('user/checkout', {
      title: 'Checkout',
      cartItems,
      totalAmount,
      userName: user ? user.name : '',
      userId
    });
  } catch (error) {
    console.error('Show checkout error:', error);
    setFlash(req, 'error', 'Error loading checkout');
    res.redirect('/cart');
  }
};

// Create order (checkout)
const createOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { customer_name, customer_phone, shipping_address, city, state, pincode, delivery_date, gift_note, payment_mode } = req.body;
    
    // Validate required fields
    if (!customer_name || !customer_phone || !shipping_address || !city || !state || !pincode) {
      setFlash(req, 'error', 'Please fill in all required address fields');
      return res.redirect('/orders/checkout');
    }
    
    // Validate phone number (10 digits)
    const cleanPhone = customer_phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setFlash(req, 'error', 'Phone number must be exactly 10 digits');
      return res.redirect('/orders/checkout');
    }
    
    // Validate pincode (6 digits)
    const cleanPincode = pincode.replace(/\D/g, '');
    if (cleanPincode.length !== 6) {
      setFlash(req, 'error', 'Pincode must be exactly 6 digits');
      return res.redirect('/orders/checkout');
    }
    
    const cartRows = await db('cart').where({ user_id: userId }).select('*');
    const cartItems = [];
    let totalAmount = 0;
    for (const row of cartRows) {
      if (row.item_type === 'hamper' && row.hamper_data) {
        const data = typeof row.hamper_data === 'string' ? JSON.parse(row.hamper_data) : row.hamper_data;
        cartItems.push({ ...row, item_type: 'hamper', price: data.total, title: 'Your Built Hamper', product_id: null, stock: 999 });
        totalAmount += Number(data.total) * (row.quantity || 1);
      } else if (row.product_id) {
        const product = await db('products').where({ id: row.product_id }).first();
        if (product) {
          cartItems.push({ ...row, item_type: 'product', price: product.price, title: product.title, stock: product.stock });
          totalAmount += parseFloat(product.price) * row.quantity;
        }
      }
    }
    if (cartItems.length === 0) {
      setFlash(req, 'error', 'Your cart is empty');
      return res.redirect('/orders/checkout');
    }
    for (const item of cartItems) {
      if (item.item_type === 'product' && item.stock < item.quantity) {
        setFlash(req, 'error', `${item.title} has insufficient stock`);
        return res.redirect('/orders/checkout');
      }
    }
    const payMode = payment_mode || 'cod';
    const advancedPaid = payMode === 'partial_cod' ? Math.round(totalAmount * 0.5 * 100) / 100 : 0;
    const [order] = await db('orders').insert({
      user_id: userId,
      total_amount: totalAmount,
      status: 'processing',
      customer_name: customer_name.trim(),
      customer_phone: `+91${cleanPhone}`,
      shipping_address: shipping_address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: cleanPincode,
      delivery_date: delivery_date || null,
      gift_note: gift_note ? gift_note.trim() : null,
      payment_mode: payMode,
      advanced_paid_amount: advancedPaid
    }).returning('*');
    for (const item of cartItems) {
      if (item.item_type === 'hamper') {
        const data = typeof item.hamper_data === 'string' ? JSON.parse(item.hamper_data) : item.hamper_data;
        await db('order_items').insert({
          order_id: order.id,
          product_id: null,
          quantity: item.quantity || 1,
          unit_price: data.total,
          item_type: 'hamper',
          hamper_data: item.hamper_data
        });
      } else {
        await db('order_items').insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          item_type: 'product'
        });
        await db('products').where({ id: item.product_id }).decrement('stock', item.quantity);
      }
    }
    
    // Clear cart
    await db('cart').where({ user_id: userId }).del();
    
    setFlash(req, 'success', 'Order placed successfully!');
    res.redirect(`/orders/${order.id}`);
  } catch (error) {
    console.error('Create order error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    let errorMessage = 'Error placing order. Please try again.';
    if (error.message.includes('violates foreign key constraint')) {
      errorMessage = 'Invalid product or user. Please refresh and try again.';
    } else if (error.message.includes('null value')) {
      errorMessage = 'Please fill in all required fields.';
    } else if (error.message.includes('duplicate key')) {
      errorMessage = 'An error occurred. Please try again.';
    }
    
    setFlash(req, 'error', errorMessage);
    res.redirect('/orders/checkout');
  }
};

// Get order details
const getOrderDetails = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;
    
    const order = await db('orders').where({ id, user_id: userId }).first();
    if (!order) {
      setFlash(req, 'error', 'Order not found');
      return res.redirect('/orders');
    }
    
    const orderItems = await db('order_items')
      .where({ order_id: id })
      .join('products', 'order_items.product_id', 'products.id')
      .select(
        'order_items.*',
        'products.title',
        'products.image',
        'products.id as product_id'
      );
    
    // Get existing reviews for products in this order
    const productIds = orderItems.map(item => item.product_id);
    const existingReviews = await db('reviews')
      .whereIn('product_id', productIds)
      .where({ user_id: userId })
      .select('product_id', 'rating', 'message', 'created_at');
    
    // Create a map of product_id to review for easy lookup
    const reviewMap = {};
    existingReviews.forEach(review => {
      reviewMap[review.product_id] = review;
    });
    
    // Add review status to each order item
    orderItems.forEach(item => {
      item.hasReview = !!reviewMap[item.product_id];
      item.review = reviewMap[item.product_id] || null;
    });
    
    res.render('user/order-details', {
      title: 'Order Details',
      order,
      orderItems,
      userId
    });
  } catch (error) {
    console.error('Get order details error:', error);
    setFlash(req, 'error', 'Error loading order');
    res.redirect('/orders');
  }
};

// Get user orders
const getUserOrders = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    const orders = await db('orders')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    
    res.render('user/orders', {
      title: 'My Orders',
      orders
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    setFlash(req, 'error', 'Error loading orders');
    res.redirect('/');
  }
};

// Admin: List all orders
const adminListOrders = async (req, res) => {
  try {
    const status = req.query.status;
    let orders;
    
    if (status && status !== 'all') {
      orders = await db('orders')
        .join('users', 'orders.user_id', 'users.id')
        .select('orders.*', 'users.name as user_name', 'users.email as user_email')
        .where('orders.status', status)
        .orderBy('orders.created_at', 'desc');
    } else {
      orders = await db('orders')
        .join('users', 'orders.user_id', 'users.id')
        .select('orders.*', 'users.name as user_name', 'users.email as user_email')
        .orderBy('orders.created_at', 'desc');
    }
    
    res.render('admin/order-list', {
      title: 'Manage Orders',
      orders,
      req: req
    });
  } catch (error) {
    console.error('Admin list orders error:', error);
    setFlash(req, 'error', 'Error loading orders');
    res.redirect('/admin/dashboard');
  }
};

// Admin: Update order status
const adminUpdateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      setFlash(req, 'error', 'Invalid status');
      return res.redirect('/admin/orders');
    }
    
    await db('orders').where({ id }).update({ status });
    
    setFlash(req, 'success', 'Order status updated!');
    res.redirect('/admin/orders');
  } catch (error) {
    console.error('Update order status error:', error);
    setFlash(req, 'error', 'Error updating order status');
    res.redirect('/admin/orders');
  }
};

// Add review
const addReview = async (req, res) => {
  try {
    const userId = req.session.userId;
    const productId = req.params.id || req.body.productId; // Get from URL params or body
    const { rating, message, orderId } = req.body;
    
    if (!productId || !rating || rating < 1 || rating > 5) {
      setFlash(req, 'error', 'Invalid review data');
      return res.redirect('back');
    }
    
    // Check if user already reviewed this product
    const existingReview = await db('reviews')
      .where({ user_id: userId, product_id: productId })
      .first();
    
    if (existingReview) {
      // Update existing review
      await db('reviews')
        .where({ id: existingReview.id })
        .update({
          rating: parseInt(rating),
          message: message || null,
          updated_at: new Date()
        });
      
      setFlash(req, 'success', 'Review updated successfully!');
    } else {
      // Create new review
      await db('reviews').insert({
        user_id: userId,
        product_id: productId,
        rating: parseInt(rating),
        message: message || null
      });
      
      setFlash(req, 'success', 'Review added successfully!');
    }
    
    // Redirect back to order page if coming from order, otherwise to product page
    if (orderId) {
      res.redirect(`/orders/${orderId}`);
    } else {
      res.redirect(`/products/${productId}`);
    }
  } catch (error) {
    console.error('Add review error:', error);
    setFlash(req, 'error', 'Error adding review');
    res.redirect('back');
  }
};

module.exports = {
  showCheckout,
  createOrder,
  getOrderDetails,
  getUserOrders,
  adminListOrders,
  adminUpdateOrderStatus,
  addReview
};

