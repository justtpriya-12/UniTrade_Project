// server/config/db.js
// MySQL connection pool — used by every route file

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'maglev.proxy.rlwy.net',
  port:     process.env.DB_PORT     || 22237,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'LZOYfGLRRNmctryIIcOlMDDyMaNEWihK',
  database: process.env.DB_NAME     || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the connection when server starts
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;