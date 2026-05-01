// server/middleware/upload.js
// Handles image uploads from the sell page

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Make sure uploads folder exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Where to save and what to name each file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const unique   = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `product-${unique}${ext}`);
  }
});

// Only allow image files
function fileFilter(req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG and WEBP images are allowed.'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max per file
});

module.exports = upload;