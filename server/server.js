// server/server.js
// Main entry point — run: node server.js

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── MIDDLEWARE ────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    /\.netlify\.app$/,
    'https://unitrade-project.netlify.app',

    // ✅ IMPORTANT: Your frontend on Render
    'https://unitrade-project-1.onrender.com'
  ],
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── SERVE UPLOADED IMAGES ─────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ── ROUTES ────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/requests', require('./routes/requests'));

// ── ROOT HEALTH CHECK ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '✅ UniTrade API is running', version: '1.0.0' });
});

// ── 404 HANDLER ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found.` });
});

// ── ERROR HANDLER ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error.' });
});

// ── START SERVER ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 UniTrade server running at http://localhost:${PORT}`);
});