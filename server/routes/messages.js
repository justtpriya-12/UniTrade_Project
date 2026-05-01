// server/routes/messages.js
const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getConversations, getMessages, sendMessage } = require('../controllers/messageController');

router.get('/',                                  verifyToken, getConversations);
router.get('/:product_id/:other_user_id',        verifyToken, getMessages);
router.post('/',                                 verifyToken, sendMessage);

module.exports = router;