const Razorpay = require('razorpay');
const crypto   = require('crypto');
const db       = require('../config/db');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Step 1: Create order
async function createOrder(req, res) {
  const { amount, product_id } = req.body;
  const options = {
    amount:   amount * 100,  // Razorpay needs paise (₹180 = 18000 paise)
    currency: 'INR',
    receipt:  `order_${product_id}_${Date.now()}`,
  };
  const order = await razorpay.orders.create(options);
  res.json({ orderId: order.id, amount: options.amount });
}

// Step 2: Verify payment after popup closes
async function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, product_id } = req.body;

  // Verify the signature
  const body      = razorpay_order_id + '|' + razorpay_payment_id;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ message: 'Payment verification failed.' });
  }

  // Save to database
  await db.query(
    `INSERT INTO transactions (buyer_id, product_id, payment_id, order_id, amount, status)
     VALUES (?, ?, ?, ?, ?, 'paid')`,
    [req.user.id, product_id, razorpay_payment_id, razorpay_order_id, req.body.amount]
  );

  // Mark listing as sold
  await db.query("UPDATE products SET status = 'sold' WHERE id = ?", [product_id]);

  res.json({ message: 'Payment successful!', payment_id: razorpay_payment_id });
}

module.exports = { createOrder, verifyPayment };