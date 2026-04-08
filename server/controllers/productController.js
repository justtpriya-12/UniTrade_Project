// server/controllers/productController.js
// Get all, get one, create, update, delete products

const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');

// Import notification checker (loaded lazily to avoid circular deps)
function getNotifier() {
  return require('./requestController').checkAndNotifyRequests;
}

// ── GET ALL PRODUCTS ─────────────────────────────────────────
async function getAllProducts(req, res) {
  try {
    const { search, category, sort, min_price, max_price, condition } = req.query;

    let sql = `
      SELECT
        p.id, p.title, p.price, p.orig_price, p.condition_type,
        p.location, p.status, p.views, p.created_at,
        c.name  AS category_name,
        c.slug  AS category_slug,
        u.id    AS seller_id,
        u.name  AS seller_name,
        (SELECT image_path FROM product_images
          WHERE product_id = p.id AND is_cover = 1 LIMIT 1) AS cover_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN users      u ON p.user_id     = u.id
      WHERE p.status = 'active'
    `;
    const params = [];

    if (search) {
      sql += ' AND (p.title LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      sql += ' AND c.slug = ?';
      params.push(category);
    }
    if (min_price) {
      sql += ' AND p.price >= ?';
      params.push(Number(min_price));
    }
    if (max_price) {
      sql += ' AND p.price <= ?';
      params.push(Number(max_price));
    }
    if (condition) {
      sql += ' AND p.condition_type = ?';
      params.push(condition);
    }

    if (sort === 'price_asc')  sql += ' ORDER BY p.price ASC';
    else if (sort === 'price_desc') sql += ' ORDER BY p.price DESC';
    else if (sort === 'popular')    sql += ' ORDER BY p.views DESC';
    else                            sql += ' ORDER BY p.created_at DESC';

    const [products] = await db.query(sql, params);
    res.json({ products });

  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── GET ONE PRODUCT ──────────────────────────────────────────
async function getProduct(req, res) {
  try {
    const { id } = req.params;

    // Increment view count
    await db.query('UPDATE products SET views = views + 1 WHERE id = ?', [id]);

    const [rows] = await db.query(`
      SELECT
        p.*,
        c.name AS category_name, c.slug AS category_slug,
        u.id   AS seller_id,     u.name AS seller_name,
        u.phone AS seller_phone
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN users      u ON p.user_id     = u.id
      WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Get all images for this product
    const [images] = await db.query(
      'SELECT id, image_path, is_cover, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
      [id]
    );

    res.json({ product: { ...rows[0], images } });

  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── CREATE PRODUCT ───────────────────────────────────────────
async function createProduct(req, res) {
  try {
    const { title, description, price, orig_price, category_id,
            condition_type, location, contact_pref } = req.body;

    if (!title || !price || !category_id) {
      return res.status(400).json({ message: 'Title, price and category are required.' });
    }

    // Insert product
    const [result] = await db.query(
      `INSERT INTO products
        (user_id, category_id, title, description, price, orig_price,
         condition_type, location, contact_pref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        category_id,
        title.trim(),
        description || '',
        Number(price),
        orig_price ? Number(orig_price) : null,
        condition_type || 'good',
        location || '',
        contact_pref || 'chat'
      ]
    );

    const productId = result.insertId;

    // Save uploaded images
    if (req.files && req.files.length > 0) {
      const imageRows = req.files.map((file, index) => [
        productId,
        `/uploads/${file.filename}`,
        index === 0 ? 1 : 0, // first image is cover
        index
      ]);
      await db.query(
        'INSERT INTO product_images (product_id, image_path, is_cover, sort_order) VALUES ?',
        [imageRows]
      );
    }

    res.status(201).json({
      message: 'Listing created successfully.',
      productId
    });

    // ── Fire notifications in background (don't await — don't slow response)
    getNotifier()({
      id:          productId,
      user_id:     req.user.id,
      title:       title.trim(),
      price:       Number(price),
      category_id: Number(category_id)
    }).catch(err => console.error('Notify error:', err));

  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── UPDATE PRODUCT ───────────────────────────────────────────
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { title, description, price, orig_price,
            condition_type, location, status } = req.body;

    // Check product belongs to this user
    const [rows] = await db.query(
      'SELECT user_id FROM products WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only edit your own listings.' });
    }

    await db.query(
      `UPDATE products
       SET title = ?, description = ?, price = ?, orig_price = ?,
           condition_type = ?, location = ?, status = ?
       WHERE id = ?`,
      [
        title, description,
        Number(price),
        orig_price ? Number(orig_price) : null,
        condition_type, location,
        status || 'active',
        id
      ]
    );

    res.json({ message: 'Listing updated successfully.' });

  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ── DELETE PRODUCT ───────────────────────────────────────────
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    // Check ownership
    const [rows] = await db.query(
      'SELECT user_id FROM products WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own listings.' });
    }

    // Delete images from disk
    const [images] = await db.query(
      'SELECT image_path FROM product_images WHERE product_id = ?', [id]
    );
    images.forEach(img => {
      const fullPath = path.join(__dirname, '../public', img.image_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    // Delete from database (CASCADE handles images, wishlist, messages, reports)
    await db.query('DELETE FROM products WHERE id = ?', [id]);

    res.json({ message: 'Listing deleted successfully.' });

  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getAllProducts, getProduct, createProduct, updateProduct, deleteProduct };