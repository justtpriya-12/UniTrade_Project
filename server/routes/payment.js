const express    = require('express');
const router     = express.Router();
const { verifyToken } = require('../middleware/auth');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

router.post('/create-order', verifyToken, createOrder);
router.post('/verify',       verifyToken, verifyPayment);

module.exports = router;