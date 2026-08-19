import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { isWorkers } from '../config/db.js';

const __dirname = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return '/';
  }
})();

// Thư mục chứa ảnh tải lên: <BE>/uploads
export const uploadDir = path.join(__dirname, '..', '..', 'uploads');

// Trên Workers ảnh dùng Cloudinary (worker.js), thư mục uploads chỉ cho chạy Node local.
if (!isWorkers && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const name = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB/ảnh
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF, AVIF'));
    }
  },
});

// Xóa file ảnh đã upload (an toàn: chỉ xóa file nằm trong thư mục uploads)
export const deleteUploadFile = (filename) => {
  if (!filename) return false;
  const base = path.basename(String(filename));
  if (base !== String(filename)) return false; // chặn path traversal
  const full = path.join(uploadDir, base);
  if (!full.startsWith(uploadDir)) return false;
  if (!fs.existsSync(full)) return false;
  fs.unlinkSync(full);
  return true;
};
