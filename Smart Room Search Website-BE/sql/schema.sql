CREATE DATABASE IF NOT EXISTS smart_room_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_room_db;

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  address VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  area DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  images JSON DEFAULT (JSON_ARRAY()),
  status ENUM('available', 'rented', 'maintenance') NOT NULL DEFAULT 'available',
  electricity INT NOT NULL DEFAULT 3500,
  water INT NOT NULL DEFAULT 150000,
  internet INT NOT NULL DEFAULT 100000,
  service_fee INT NOT NULL DEFAULT 200000,
  max_people INT NOT NULL DEFAULT 2,
  district VARCHAR(100) NOT NULL DEFAULT 'Quận 1',
  city VARCHAR(100) NOT NULL DEFAULT 'TP.HCM',
  lat DECIMAL(10, 8) NOT NULL DEFAULT 10.7731,
  lng DECIMAL(11, 8) NOT NULL DEFAULT 106.6952,
  amenities JSON DEFAULT (JSON_ARRAY()),
  phone VARCHAR(50) NOT NULL DEFAULT '0901234567',
  zalo_link VARCHAR(255) NOT NULL DEFAULT 'https://zalo.me/0901234567',
  views INT NOT NULL DEFAULT 0,
  contacts INT NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_new BOOLEAN NOT NULL DEFAULT FALSE,
  is_cheap BOOLEAN NOT NULL DEFAULT FALSE,
  rating DECIMAL(3, 2) NOT NULL DEFAULT 4.5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  cccd VARCHAR(20) NULL,
  deposit_amount DECIMAL(12,0) NULL DEFAULT 0,
  amount_given DECIMAL(12,0) NULL DEFAULT 0,
  amount_remaining DECIMAL(12,0) NULL DEFAULT 0,
  rent_price DECIMAL(12,0) NULL DEFAULT 0,
  contract_signed_date DATE NULL,
  move_in_date DATE NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  people_count INT NULL DEFAULT 1,
  contract_months INT NULL DEFAULT 0,
  owner_name VARCHAR(255) NULL,
  owner_phone VARCHAR(50) NULL,
  payment_status VARCHAR(100) NULL,
  note TEXT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tenant_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  room_id INT NOT NULL,
  room_title VARCHAR(255) NOT NULL DEFAULT '',
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(50) NOT NULL DEFAULT '',
  cccd VARCHAR(20) NULL,
  deposit_amount DECIMAL(12,0) NULL DEFAULT 0,
  rent_price DECIMAL(12,0) NULL DEFAULT 0,
  move_in_date DATE NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  delete_reason TEXT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenant_history_deleted_at ON tenant_history(deleted_at DESC);
CREATE INDEX idx_tenant_history_room_id ON tenant_history(room_id);

CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_price ON rooms(price);
CREATE INDEX idx_rooms_area ON rooms(area);
CREATE INDEX idx_rooms_district ON rooms(district);
CREATE INDEX idx_rooms_created_at ON rooms(created_at DESC);
CREATE INDEX idx_rooms_updated_at ON rooms(updated_at DESC);
CREATE INDEX idx_rooms_flags ON rooms(is_featured, is_new, is_cheap);
CREATE FULLTEXT INDEX idx_rooms_search ON rooms(title, address, description);

-- Room demands (nhu cầu tìm phòng)
CREATE TABLE IF NOT EXISTS room_demands (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  gender VARCHAR(20) NULL,
  district VARCHAR(100) NULL,
  max_price DECIMAL(12,0) NULL DEFAULT 0,
  people_count INT NULL DEFAULT 1,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
