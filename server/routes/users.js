// server/routes/users.js
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getMe, updateMe, getMyProducts, getMyWishlist, toggleWishlist
} = require('../controllers/userController');

router.get('/me',           verifyToken, getMe);
router.put('/me',           verifyToken, updateMe);
router.get('/me/products',  verifyToken, getMyProducts);
router.get('/me/wishlist',  verifyToken, getMyWishlist);
router.post('/me/wishlist', verifyToken, toggleWishlist);

module.exports = router;