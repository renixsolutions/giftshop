require('dotenv').config();
const key_id_raw = process.env.RAZORPAY_KEY_ID || '';
console.log('RAZORPAY_KEY_ID Length:', key_id_raw.length);
console.log('RAZORPAY_KEY_ID Character Codes:', key_id_raw.split('').map(c => c.charCodeAt(0)));
