// server/controllers/authController.js
// All logic for register and login

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const { notifyRegistration } = require('../services/notify');
const { emailWelcome }        = require('../services/emailService');

// ── REGISTER ────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { name, email, password, phone } = req.body;

    // 1. Check all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    // 2. Check password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // 3. Check if email already exists
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // 4. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Save user to database (with phone)
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashedPassword, phone || null]
    );

    // 6. Create JWT token
    const token = jwt.sign(
      { id: result.insertId, email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 7. Send back token + user info
    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id:    result.insertId,
        name:  name.trim(),
        email: email.toLowerCase().trim(),
        role:  'user'
      }
    });

    // 8. Fire WhatsApp + SMS + Email welcome notifications in background
    // Does NOT block the response — fires after res.json()
    if (phone) {
      notifyRegistration({ name: name.trim(), phone })
        .catch(err => console.error('Notify registration error:', err));
    }
    // Send welcome email regardless of phone
    emailWelcome({ name: name.trim(), email: email.toLowerCase().trim() })
      .catch(err => console.error('Welcome email error:', err));

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
}

// ── LOGIN ────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // 1. Check fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // 2. Find user by email
    const [rows] = await db.query(
      'SELECT id, name, email, password, role, is_blocked FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];

    // 3. Check if blocked
    if (user.is_blocked) {
      return res.status(403).json({ message: 'Your account has been blocked. Contact admin.' });
    }

    // 4. Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 5. Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 6. Send back token + user info (never send password)
    res.json({
      message: 'Login successful.',
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
}

module.exports = { register, login };