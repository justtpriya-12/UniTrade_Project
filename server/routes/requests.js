// server/routes/requests.js
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  createRequest,
  getMyRequests,
  getAllRequests,
  cancelRequest,
  getNotifications,
  markAllRead,
  markOneRead
} = require('../controllers/requestController');
 
// Requests
router.post('/',          verifyToken, createRequest);
router.get('/my',         verifyToken, getMyRequests);
router.get('/',           getAllRequests);  // public — sellers can see open requests
router.delete('/:id',     verifyToken, cancelRequest);
 
// Notifications
router.get('/notifications',              verifyToken, getNotifications);
router.put('/notifications/read',         verifyToken, markAllRead);
router.put('/notifications/:id/read',     verifyToken, markOneRead);
 
module.exports = router;