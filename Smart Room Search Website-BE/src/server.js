import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import dotenv from 'dotenv';

import { login, register, me } from './controllers/authController.js';
import { authenticate, optionalAuthenticate, requireAdmin } from './middleware/auth.js';
import { loginRateLimit, demandRateLimit, trackingRateLimit } from './middleware/rateLimit.js';

import {
  validateRoomPayload,
  validateRoomStatus,
  validateTenantPayload,
} from './middleware/validate.js';

import {
  listRooms,
  getRoom,
  addRoom,
  editRoom,
  removeRoom,
  bulkRemoveRooms,
  changeRoomStatus,
  stats,
  getRoomsVersion,
  trackView,
  trackContact,
} from './controllers/roomController.js';

import {
  listTenants,
  addTenant,
  editTenant,
  removeTenant,
  listTenantHistory,
} from './controllers/tenantController.js';

import { generateRoomDescription } from './controllers/aiController.js';
import { geocodeAddress } from './controllers/geocodeController.js';
import { parseRooms } from './controllers/roomParseController.js';

import {
  listDemands,
  addDemand,
  getDemand,
  parseDemand,
  editDemand,
  removeDemand,
} from './controllers/demandController.js';

import { roomEvents, ROOMS_CHANGED } from './utils/events.js';
import { roomsLastModified } from './models/roomModel.js';
import { pool, isMockMode, isReady, isWorkers, isVercel } from './config/db.js';
import { isDataService, tidb } from './config/tidbDataService.js';
import {
  upload,
  uploadDir,
  deleteUploadFile,
} from './controllers/uploadController.js';

if (!isWorkers && !isVercel) dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

/* =========================
   SECURITY
========================= */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

/* =========================
   CORS
========================= */

const corsOrigin = process.env.CORS_ORIGIN;

app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          credentials: true,
        }
      : undefined
  )
);

/* =========================
   BODY PARSER
========================= */

app.use(express.json({ limit: '1mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
  })
);

/* =========================
   ROOT ROUTE
========================= */

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Smart Room Search Backend is running',
    status: 'ok',
    dbMode: isMockMode ? 'json' : isDataService() ? 'tidb-data-service' : 'mysql',
  });
});

/* =========================
   HEALTH CHECK
========================= */

app.get(['/api', '/api/'], (req, res) => {
  res.status(200).json({
    service: 'smart-room-api',
    status: 'ok',
    message: 'Smart Room Search API is running',
    health: '/api/health',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    dbMode: isMockMode ? 'json' : isDataService() ? 'tidb-data-service' : 'mysql',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'smart-room-api' });
});

// Kiểm tra kết nối database thật (SELECT 1 / endpoint rẻ nhất)
app.get('/api/health/db', async (req, res) => {
  try {
    if (isDataService()) {
      await tidb('/rooms/{id}', { method: 'GET', params: { id: 0 } });
    } else if (pool) {
      await pool.query('SELECT 1');
    } else {
      return res.status(500).json({
        status: 'error',
        database: 'unavailable',
        message: 'No database connection configured',
      });
    }
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('[health/db]', error.message);
    return res.status(504).json({
      status: 'error',
      database: 'unavailable',
      message: 'Database không khả dụng',
    });
  }
});

/* =========================
   SERVER-SENT EVENTS
========================= */

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write('retry: 5000\n\n');

  const send = () => {
    res.write(
      `event: ${ROOMS_CHANGED}\ndata: ${JSON.stringify({
        lastModified: roomsLastModified,
      })}\n\n`
    );
  };

  roomEvents.on(ROOMS_CHANGED, send);

  req.on('close', () => {
    roomEvents.off(ROOMS_CHANGED, send);
  });
});

/* =========================
   AUTHENTICATION
========================= */

app.post('/api/login', loginRateLimit, login);

app.post('/api/register', authenticate, requireAdmin, register);

app.get('/api/me', authenticate, me);

/* =========================
   UPLOADS (ảnh phòng từ máy)
========================= */

// Phục vụ ảnh đã upload: http://localhost:4000/uploads/room_xxx.jpg
app.use(
  '/uploads',
  express.static(uploadDir, {
    maxAge: '7d',
    fallthrough: true,
    dotfiles: 'deny',
  })
);

app.post(
  '/api/upload',
  authenticate,
  requireAdmin,
  upload.array('images', 12),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Chưa có file ảnh nào được chọn' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = req.files.map(
      (f) => `${baseUrl}/uploads/${encodeURIComponent(f.filename)}`
    );
    return res.status(201).json({ urls });
  }
);

app.delete(
  '/api/upload/:filename',
  authenticate,
  requireAdmin,
  (req, res) => {
    const ok = deleteUploadFile(req.params.filename);
    if (!ok) {
      return res.status(404).json({ message: 'Không tìm thấy ảnh' });
    }
    return res.status(200).json({ message: 'Đã xóa ảnh' });
  }
);

// Xử lý lỗi từ multer (file quá lớn / sai định dạng)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'Upload Error',
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'Ảnh vượt quá giới hạn 10MB mỗi file'
        : `Lỗi upload: ${err.message}`,
    });
  }
  if (err && err.message && err.message.startsWith('Chỉ chấp nhận')) {
    return res.status(400).json({ error: 'Upload Error', message: err.message });
  }
  next(err);
});

/* =========================
   ROOM ROUTES
========================= */

// Version phải đặt trước /api/rooms/:id
app.get('/api/rooms/version', getRoomsVersion);

app.get('/api/rooms/stats', authenticate, requireAdmin, stats);

app.get('/api/rooms', listRooms);

app.get('/api/rooms/:id', getRoom);

app.post(
  '/api/rooms',
  authenticate, requireAdmin,
  validateRoomPayload,
  addRoom
);

app.put(
  '/api/rooms/:id',
  authenticate,
  requireAdmin,
  validateRoomPayload,
  editRoom
);

app.delete(
  '/api/rooms/:id',
  authenticate,
  requireAdmin,
  removeRoom
);

app.post(
  '/api/rooms/bulk-delete',
  authenticate,
  requireAdmin,
  bulkRemoveRooms
);

app.delete(
  '/api/rooms',
  authenticate,
  requireAdmin,
  bulkRemoveRooms
);

app.put(
  '/api/rooms/:id/status',
  authenticate,
  requireAdmin,
  validateRoomStatus,
  changeRoomStatus
);

app.post(
  '/api/rooms/:id/view',
  trackingRateLimit,
  trackView
);

app.post(
  '/api/rooms/:id/contact',
  trackingRateLimit,
  trackContact
);

/* =========================
   TENANT ROUTES
========================= */

app.get(
  '/api/tenants',
  authenticate,
  requireAdmin,
  listTenants
);

app.post(
  '/api/tenants',
  authenticate,
  requireAdmin,
  validateTenantPayload,
  addTenant
);

app.put(
  '/api/tenants/:id',
  authenticate,
  requireAdmin,
  editTenant
);

app.delete(
  '/api/tenants/:id',
  authenticate,
  requireAdmin,
  removeTenant
);

app.get(
  '/api/tenant-history',
  authenticate,
  requireAdmin,
  listTenantHistory
);

/* =========================
   AI & GEOCODE
========================= */

app.post(
  '/api/ai/room-description',
  authenticate,
  requireAdmin,
  generateRoomDescription
);

app.post(
  '/api/rooms/parse',
  authenticate,
  requireAdmin,
  parseRooms
);

app.get(
  '/api/geocode',
  authenticate,
  requireAdmin,
  geocodeAddress
);

/* =========================
   ROOM DEMANDS
========================= */

// Public
app.get('/api/demands', optionalAuthenticate, listDemands);
app.get('/api/demands/:id', authenticate, requireAdmin, getDemand);
app.post('/api/demands/parse', demandRateLimit, parseDemand);

app.post('/api/demands', demandRateLimit, addDemand);

// Admin
app.put(
  '/api/demands/:id',
  authenticate,
  requireAdmin,
  editDemand
);

app.delete(
  '/api/demands/:id',
  authenticate,
  requireAdmin,
  removeDemand
);

/* =========================
   404 HANDLER
========================= */

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
});

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error('[server error]', err);

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err.message,
  });
});

/* =========================
   START SERVER
========================= */

// Trên Cloudflare Workers và Vercel không gọi app.listen — serverless function.
// Vercel dùng @vercel/node để nối Express vào handler.
if (!isWorkers && !isVercel) {
  app.listen(PORT, HOST, () => {
    console.log(
      `Backend running on http://${HOST}:${PORT}`
    );

    console.log(
      `[db] Mode: ${isMockMode ? 'JSON / Mock' : isDataService() ? 'TiDB Data Service' : 'MySQL / TiDB'}`
    );
  });
}

export default app;
