// server/routes/products.js
const express  = require('express');
const router   = express.Router();
const upload   = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');
const {
  getAllProducts, getProduct,
  createProduct, updateProduct, deleteProduct
} = require('../controllers/productController');

router.get('/',     getAllProducts);
router.get('/:id',  getProduct);
router.post('/',    verifyToken, upload.array('images', 5), createProduct);
router.put('/:id',  verifyToken, updateProduct);
router.delete('/:id', verifyToken, deleteProduct);

module.exports = router;