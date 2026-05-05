// server/controllers/adminController.js

const db = require('../config/db');
const { emailAccountBlocked, emailReportResolved } = require('../services/emailService');

// ── GET ALL USERS ────────────────────────────────────────────
async function getAllUsers(req, res) {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, is_blocked, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── BLOCK / UNBLOCK USER ─────────────────────────────────────
async function toggleBlockUser(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT is_blocked FROM users WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });

    const newStatus = rows[0].is_blocked ? 0 : 1;
    await db.query('UPDATE users SET is_blocked = ? WHERE id = ?', [newStatus, id]);

    res.json({ message: newStatus ? 'User blocked.' : 'User unblocked.', is_blocked: newStatus });

    // Send email if blocking (not unblocking)
    if (newStatus === 1) {
      const [[blockedUser]] = await db.query(
        'SELECT name, email FROM users WHERE id = ?', [id]
      );
      if (blockedUser && blockedUser.email) {
        emailAccountBlocked({ email: blockedUser.email, name: blockedUser.name })
          .catch(e => console.error('Block email error:', e));
      }
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── DELETE USER ──────────────────────────────────────────────
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── GET ALL PRODUCTS (admin) ─────────────────────────────────
async function getAllProducts(req, res) {
  try {
    const [products] = await db.query(`
      SELECT p.id, p.title, p.price, p.status, p.views, p.created_at,
             c.name AS category_name,
             u.name AS seller_name, u.email AS seller_email
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN users      u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── DELETE PRODUCT (admin) ───────────────────────────────────
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Listing removed.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── GET ALL REPORTS ──────────────────────────────────────────
async function getReports(req, res) {
  try {
    const [reports] = await db.query(`
      SELECT r.id, r.reason, r.status, r.created_at,
             p.title AS product_title,
             u.name  AS reporter_name
      FROM reports r
      JOIN products p ON r.product_id = p.id
      JOIN users    u ON r.reporter_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── UPDATE REPORT STATUS ─────────────────────────────────────
async function updateReport(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'resolved' or 'dismissed'

    await db.query(
      'UPDATE reports SET status = ?, resolved_by = ?, resolved_at = NOW() WHERE id = ?',
      [status, req.user.id, id]
    );
    res.json({ message: `Report ${status}.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── GET DASHBOARD STATS ──────────────────────────────────────
async function getStats(req, res) {
  try {
    const [[{ total_users }]]    = await db.query('SELECT COUNT(*) AS total_users FROM users');
    const [[{ total_products }]] = await db.query('SELECT COUNT(*) AS total_products FROM products');
    const [[{ total_active }]]   = await db.query("SELECT COUNT(*) AS total_active FROM products WHERE status='active'");
    const [[{ pending_reports }]]= await db.query("SELECT COUNT(*) AS pending_reports FROM reports WHERE status='pending'");

    res.json({ total_users, total_products, total_active, pending_reports });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = {
  getAllUsers, toggleBlockUser, deleteUser,
  getAllProducts, deleteProduct,
  getReports, updateReport,
  getStats
};