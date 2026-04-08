// server/routes/admin.js
const express = require('express');
const router  = express.Router();
const { verifyToken, adminOnly } = require('../middleware/auth');
const {
  getAllUsers, toggleBlockUser, deleteUser,
  getAllProducts, deleteProduct,
  getReports, updateReport,
  getStats
} = require('../controllers/adminController');

// All admin routes require login + admin role
router.use(verifyToken, adminOnly);

router.get('/stats',              getStats);
router.get('/users',              getAllUsers);
router.post('/users/:id/block',   toggleBlockUser);
router.delete('/users/:id',       deleteUser);
router.get('/products',           getAllProducts);
router.delete('/products/:id',    deleteProduct);
router.get('/reports',            getReports);
router.put('/reports/:id',        updateReport);

module.exports = router;