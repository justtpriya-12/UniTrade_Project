// server/server.js

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── CORS CONFIG (FIXED) ───────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://localhost:3000',
    'http://127.0.0.1:5500',

    // ✅ YOUR FRONTEND (IMPORTANT)
    'https://unitrade-project-1.onrender.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── BODY PARSER ───────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── STATIC FILES ──────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/payment', require('./routes/payment'));

// ── TEST ROUTE ────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '✅ UniTrade API is running' });
});

// ── 404 HANDLER ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found.` });
});

// ── ERROR HANDLER ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// ── START SERVER ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});