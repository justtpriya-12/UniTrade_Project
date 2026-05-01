-- ============================================================
--  UniTrade Database Schema
--  Run this file in MySQL Workbench or phpMyAdmin
--  Command: source /path/to/schema.sql
-- ============================================================

-- Create and select the database
CREATE DATABASE IF NOT EXISTS unitrade
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE unitrade;

-- ============================================================
--  TABLE 1: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           INT           NOT NULL AUTO_INCREMENT,
  name         VARCHAR(100)  NOT NULL,
  email        VARCHAR(150)  NOT NULL UNIQUE,
  password     VARCHAR(255)  NOT NULL,
  phone        VARCHAR(20)   DEFAULT NULL,
  location     VARCHAR(150)  DEFAULT NULL,
  bio          VARCHAR(300)  DEFAULT NULL,
  avatar       VARCHAR(255)  DEFAULT NULL,
  role         ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_blocked   TINYINT(1)    NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email (email),
  INDEX idx_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  TABLE 2: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80)  NOT NULL UNIQUE,
  slug       VARCHAR(80)  NOT NULL UNIQUE,
  icon       VARCHAR(10)  DEFAULT '📦',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default categories
INSERT INTO categories (name, slug, icon) VALUES
  ('Books',       'books',       '📗'),
  ('Electronics', 'electronics', '💻'),
  ('Furniture',   'furniture',   '🛋️'),
  ('Accessories', 'accessories', '🎒'),
  ('Stationery',  'stationery',  '✏️'),
  ('Clothing',    'clothing',    '👕');


-- ============================================================
--  TABLE 3: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id             INT            NOT NULL AUTO_INCREMENT,
  user_id        INT            NOT NULL,
  category_id    INT            NOT NULL,
  title          VARCHAR(100)   NOT NULL,
  description    TEXT           DEFAULT NULL,
  price          DECIMAL(10,2)  NOT NULL,
  orig_price     DECIMAL(10,2)  DEFAULT NULL,
  condition_type ENUM('new','good','fair') NOT NULL DEFAULT 'good',
  location       VARCHAR(150)   DEFAULT NULL,
  contact_pref   ENUM('chat','phone','whatsapp') NOT NULL DEFAULT 'chat',
  status         ENUM('active','sold','pending','removed') NOT NULL DEFAULT 'active',
  views          INT            NOT NULL DEFAULT 0,
  created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_user_id     (user_id),
  INDEX idx_category_id (category_id),
  INDEX idx_status      (status),
  INDEX idx_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  TABLE 4: product_images
-- ============================================================
CREATE TABLE IF NOT EXISTS product_images (
  id          INT          NOT NULL AUTO_INCREMENT,
  product_id  INT          NOT NULL,
  image_path  VARCHAR(255) NOT NULL,
  is_cover    TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  TABLE 5: wishlist
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist (
  id          INT      NOT NULL AUTO_INCREMENT,
  user_id     INT      NOT NULL,
  product_id  INT      NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_product (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_user_id    (user_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  TABLE 6: messages
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id           INT          NOT NULL AUTO_INCREMENT,
  sender_id    INT          NOT NULL,
  receiver_id  INT          NOT NULL,
  product_id   INT          NOT NULL,
  body         TEXT         NOT NULL,
  is_read      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (sender_id)   REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_sender_id   (sender_id),
  INDEX idx_receiver_id (receiver_id),
  INDEX idx_product_id  (product_id),
  INDEX idx_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  TABLE 7: reports
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id           INT          NOT NULL AUTO_INCREMENT,
  reporter_id  INT          NOT NULL,
  product_id   INT          NOT NULL,
  reason       TEXT         NOT NULL,
  status       ENUM('pending','resolved','dismissed') NOT NULL DEFAULT 'pending',
  resolved_by  INT          DEFAULT NULL,
  resolved_at  DATETIME     DEFAULT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (reporter_id) REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (resolved_by) REFERENCES users(id)    ON DELETE SET NULL,
  INDEX idx_reporter_id (reporter_id),
  INDEX idx_product_id  (product_id),
  INDEX idx_status      (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  TABLE 8: sessions  (optional — server-side logout support)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id          INT          NOT NULL AUTO_INCREMENT,
  user_id     INT          NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  DATETIME     NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id    (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
--  SEED: default admin account
--  Email    : admin@college.ac.in
--  Password : admin123
--  Generate your own hash:
--    node -e "const b=require('bcryptjs');console.log(b.hashSync('yourpassword',10))"
-- ============================================================
INSERT INTO users (name, email, password, role) VALUES (
  'Admin',
  'admin@college.ac.in',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'admin'
);


-- ============================================================
--  VERIFY: run these after setup to confirm everything worked
-- ============================================================
-- SHOW TABLES;
-- SELECT id, name, email, role FROM users;
-- SELECT * FROM categories;