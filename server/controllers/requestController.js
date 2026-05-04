// server/controllers/requestController.js

const db = require('../config/db');
const { notifyRequestMatch } = require('../services/notify');

/* ─────────────────────────────────────────────────────────────
   HELPER — create a notification for a user
───────────────────────────────────────────────────────────── */
async function createNotification({ user_id, type, title, body, link, product_id, request_id }) {
  await db.query(
    `INSERT INTO notifications (user_id, type, title, body, link, product_id, request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_id, type || 'general', title, body, link || null, product_id || null, request_id || null]
  );
}

/* ─────────────────────────────────────────────────────────────
   POST /api/requests — Create a new item request
───────────────────────────────────────────────────────────── */
async function createRequest(req, res) {
  try {
    const { title, description, category_id, max_price } = req.body;

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ message: 'Please enter what you are looking for (at least 3 characters).' });
    }

    const [result] = await db.query(
      `INSERT INTO requests (user_id, title, description, category_id, max_price)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title.trim(),
        description?.trim() || null,
        category_id || null,
        max_price ? Number(max_price) : null
      ]
    );

    // Create a confirmation notification for the requester
    await createNotification({
      user_id:    req.user.id,
      type:       'request_created',
      title:      '📋 Request submitted!',
      body:       `Your request for "${title.trim()}" is now live. We will notify you when a matching item is listed.`,
      request_id: result.insertId
    });

    res.status(201).json({
      message:   'Request submitted successfully.',
      requestId: result.insertId
    });

  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

/* ─────────────────────────────────────────────────────────────
   GET /api/requests/my — Get logged-in user's requests
───────────────────────────────────────────────────────────── */
async function getMyRequests(req, res) {
  try {
    const [requests] = await db.query(
      `SELECT r.*, c.name AS category_name, c.slug AS category_slug
       FROM requests r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ requests });
  } catch (err) {
    console.error('Get my requests error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

/* ─────────────────────────────────────────────────────────────
   GET /api/requests — Get all open requests (public)
───────────────────────────────────────────────────────────── */
async function getAllRequests(req, res) {
  try {
    const [requests] = await db.query(
      `SELECT r.id, r.title, r.description, r.max_price, r.status, r.created_at,
              c.name AS category_name,
              u.name AS requester_name
       FROM requests r
       LEFT JOIN categories c ON r.category_id = c.id
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'open'
       ORDER BY r.created_at DESC`
    );
    res.json({ requests });
  } catch (err) {
    console.error('Get all requests error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

/* ─────────────────────────────────────────────────────────────
   DELETE /api/requests/:id — Cancel a request
───────────────────────────────────────────────────────────── */
async function cancelRequest(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT user_id FROM requests WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Request not found.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ message: 'Not your request.' });

    await db.query("UPDATE requests SET status = 'cancelled' WHERE id = ?", [id]);
    res.json({ message: 'Request cancelled.' });
  } catch (err) {
    console.error('Cancel request error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

/* ─────────────────────────────────────────────────────────────
   GET /api/notifications — Get user's notifications
───────────────────────────────────────────────────────────── */
async function getNotifications(req, res) {
  try {
    const [notifications] = await db.query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unread = notifications.filter(n => !n.is_read).length;
    res.json({ notifications, unread });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

/* ─────────────────────────────────────────────────────────────
   PUT /api/notifications/read — Mark all as read
───────────────────────────────────────────────────────────── */
async function markAllRead(req, res) {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

/* ─────────────────────────────────────────────────────────────
   PUT /api/notifications/:id/read — Mark one as read
───────────────────────────────────────────────────────────── */
async function markOneRead(req, res) {
  try {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

/* ─────────────────────────────────────────────────────────────
   INTERNAL — checkAndNotifyRequests
   Called by productController when a new product is created
   Checks if the new product matches any open requests
   If match found → sends in-app + WhatsApp + SMS notification
───────────────────────────────────────────────────────────── */
async function checkAndNotifyRequests(product) {
  try {
    // Find all open requests that match — also fetch phone number
    const [openRequests] = await db.query(
      `SELECT r.*, u.name AS user_name, u.phone AS phone
       FROM requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'open'
         AND r.user_id != ?
         AND (
           r.category_id = ?
           OR LOWER(?) LIKE CONCAT('%', LOWER(r.title), '%')
           OR LOWER(r.title) LIKE CONCAT('%', LOWER(?), '%')
         )`,
      [product.user_id, product.category_id, product.title, product.title]
    );

    // Get seller name for WhatsApp message
    const [[seller]] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [product.user_id]
    );
    const sellerName = seller ? seller.name : 'A student';

    for (const request of openRequests) {
      // Skip if product is over budget
      if (request.max_price && Number(product.price) > Number(request.max_price)) {
        continue;
      }

      const productLink = `https://unitrade-project-1.onrender.com/product/index.html?id=${product.id}`;

      // 1. Save in-app notification to database
      await createNotification({
        user_id:    request.user_id,
        type:       'request_match',
        title:      '🎉 Item available — matches your request!',
        body:       `"${product.title}" was just listed for ₹${Number(product.price).toLocaleString('en-IN')}. This matches your request for "${request.title}". Check it out!`,
        link:       productLink,
        product_id: product.id,
        request_id: request.id
      });

      console.log(`✅ In-app notification sent to user ${request.user_id} for request "${request.title}"`);

      // 2. Send WhatsApp + SMS notification if phone exists
      if (request.phone) {
        notifyRequestMatch({
          phone:         request.phone,
          requesterName: request.user_name || 'Student',
          requestTitle:  request.title,
          productTitle:  product.title,
          sellerName,
          price:         product.price,
          productId:     product.id
        }).catch(e => console.error('Request match WhatsApp error:', e));
      }
    }
  } catch (err) {
    console.error('checkAndNotifyRequests error:', err);
    // Don't throw — background task, never break product creation
  }
}

module.exports = {
  createRequest,
  getMyRequests,
  getAllRequests,
  cancelRequest,
  getNotifications,
  markAllRead,
  markOneRead,
  checkAndNotifyRequests
};