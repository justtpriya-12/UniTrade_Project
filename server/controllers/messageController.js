// server/controllers/messageController.js

const db = require('../config/db');
const { notifySellerNewMessage } = require('../services/notify');

// ── GET MY CONVERSATIONS ─────────────────────────────────────
async function getConversations(req, res) {
  try {
    const [convs] = await db.query(`
      SELECT
        m.product_id,
        p.title AS product_title,
        CASE
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END AS other_user_id,
        u.name AS other_user_name,
        m.body AS last_message,
        m.created_at AS last_message_time,
        SUM(CASE WHEN m.receiver_id = ? AND m.is_read = 0 THEN 1 ELSE 0 END) AS unread_count
      FROM messages m
      JOIN products p ON m.product_id = p.id
      JOIN users    u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY m.product_id, other_user_id
      ORDER BY last_message_time DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);

    res.json({ conversations: convs });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── GET MESSAGES FOR ONE CONVERSATION ────────────────────────
async function getMessages(req, res) {
  try {
    const { product_id, other_user_id } = req.params;

    const [messages] = await db.query(`
      SELECT m.id, m.sender_id, m.body, m.is_read, m.created_at,
             u.name AS sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.product_id = ?
        AND (
          (m.sender_id = ? AND m.receiver_id = ?) OR
          (m.sender_id = ? AND m.receiver_id = ?)
        )
      ORDER BY m.created_at ASC
    `, [product_id, req.user.id, other_user_id, other_user_id, req.user.id]);

    // Mark as read
    await db.query(
      'UPDATE messages SET is_read = 1 WHERE product_id = ? AND receiver_id = ? AND is_read = 0',
      [product_id, req.user.id]
    );

    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── SEND A MESSAGE ───────────────────────────────────────────
async function sendMessage(req, res) {
  try {
    const { receiver_id, product_id, body } = req.body;

    if (!receiver_id || !product_id || !body) {
      return res.status(400).json({ message: 'receiver_id, product_id and body are required.' });
    }
    if (receiver_id === req.user.id) {
      return res.status(400).json({ message: 'You cannot message yourself.' });
    }

    const [result] = await db.query(
      'INSERT INTO messages (sender_id, receiver_id, product_id, body) VALUES (?, ?, ?, ?)',
      [req.user.id, receiver_id, product_id, body.trim()]
    );

    // Send response immediately
    res.status(201).json({
      message:   'Message sent.',
      messageId: result.insertId
    });

    // Notify seller via WhatsApp + SMS in background
    // Fires AFTER response — never slows down the chat
    ;(async () => {
      try {
        // Get seller phone number
        const [[seller]] = await db.query(
          'SELECT name, phone FROM users WHERE id = ?',
          [receiver_id]
        );

        // Get buyer name
        const [[buyer]] = await db.query(
          'SELECT name FROM users WHERE id = ?',
          [req.user.id]
        );

        // Get product title
        const [[product]] = await db.query(
          'SELECT title FROM products WHERE id = ?',
          [product_id]
        );

        // Only send if seller has a phone number
        if (seller && seller.phone) {
          await notifySellerNewMessage({
            phone:        seller.phone,
            sellerName:   seller.name,
            buyerName:    buyer  ? buyer.name    : 'A student',
            productTitle: product ? product.title : 'your listing',
            productId:    product_id
          });
        }
      } catch (e) {
        console.error('Message notify error:', e);
      }
    })();

  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getConversations, getMessages, sendMessage };