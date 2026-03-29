const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: (process.env.RAZORPAY_KEY_ID || '').replace(/\s+/g, '').trim(),
  key_secret: (process.env.RAZORPAY_KEY_SECRET || '').replace(/\s+/g, '').trim(),
});

module.exports = razorpay;
