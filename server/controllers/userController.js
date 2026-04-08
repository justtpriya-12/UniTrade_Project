// server/controllers/userController.js

const db     = require('../config/db');
const bcrypt = require('bcryptjs');

// ── GET MY PROFILE ───────────────────────────────────────────
async function getMe(req, res) {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, phone, location, bio, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── UPDATE MY PROFILE ────────────────────────────────────────
async function updateMe(req, res) {
  try {
    const { name, phone, location, bio } = req.body;
    await db.query(
      'UPDATE users SET name = ?, phone = ?, location = ?, bio = ? WHERE id = ?',
      [name, phone || null, location || null, bio || null, req.user.id]
    );
    res.json({ message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update me error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── GET MY LISTINGS ──────────────────────────────────────────
async function getMyProducts(req, res) {
  try {
    const [products] = await db.query(`
      SELECT
        p.id, p.title, p.price, p.status, p.views, p.created_at,
        c.name AS category_name,
        (SELECT image_path FROM product_images
          WHERE product_id = p.id AND is_cover = 1 LIMIT 1) AS cover_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    res.json({ products });
  } catch (err) {
    console.error('Get my products error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── GET MY WISHLIST ──────────────────────────────────────────
async function getMyWishlist(req, res) {
  try {
    const [products] = await db.query(`
      SELECT
        p.id, p.title, p.price, p.status,
        c.name AS category_name,
        (SELECT image_path FROM product_images
          WHERE product_id = p.id AND is_cover = 1 LIMIT 1) AS cover_image
      FROM wishlist w
      JOIN products   p ON w.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `, [req.user.id]);

    res.json({ products });
  } catch (err) {
    console.error('Get wishlist error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── ADD / REMOVE FROM WISHLIST ───────────────────────────────
async function toggleWishlist(req, res) {
  try {
    const { product_id } = req.body;
    const [existing] = await db.query(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );
    if (existing.length > 0) {
      await db.query(
        'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
        [req.user.id, product_id]
      );
      return res.json({ message: 'Removed from wishlist.', wishlisted: false });
    } else {
      await db.query(
        'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
        [req.user.id, product_id]
      );
      return res.json({ message: 'Added to wishlist.', wishlisted: true });
    }
  } catch (err) {
    console.error('Toggle wishlist error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getMe, updateMe, getMyProducts, getMyWishlist, toggleWishlist };