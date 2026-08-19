import mysql from 'mysql2/promise';
import { applySchema, getSchemaSql, isTiDB, schemaPath } from './schemaLoader.js';
import fs from 'node:fs';

// Cloudflare Workers (nodejs_compat) detection
export const isWorkers =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

if (!isWorkers) {
  const { default: dotenv } = await import('dotenv');
  dotenv.config();
}

let pool = null;
let isMockMode = false;
let isReady = false;

const createPool = async () => {
  // Workers: CẤM tuyệt đối mysql2 pool — DB chỉ truy cập qua TiDB Data Service.
  // Nếu có DB_* env trên Workers thì chúng bị bỏ qua hoàn toàn (không tạo kết nối TCP).
  if (isWorkers) {
    console.error('[db] MySQL pool disabled on Cloudflare Workers — use TiDB Data Service');
    return null;
  }

  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD) {
    isMockMode = true;
    console.warn('[db] MySQL config is incomplete. Falling back to in-memory mode.');
    return null;
  }

  const useSsl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

  pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME || 'smart_room_db',
    waitForConnections: true,
    connectionLimit: isWorkers ? 5 : 10,
    queueLimit: 0,
    multipleStatements: true,
    // workerd cấm "code generation from strings" — dùng static parser (không new Function)
    disableEval: isWorkers,
    ...(useSsl
      ? isWorkers
        ? // workerd chưa hỗ trợ option rejectUnauthorized — dùng SSL mặc định
          { ssl: {} }
        : {
            ssl: {
              rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
            },
          }
      : {}),
  });

  if (isWorkers) {
    // Cold start tối thiểu: tạo pool là đủ (mysql2 kết nối khi có query đầu tiên).
    // Schema/seed chạy 1 lần qua DB_APPLY_SCHEMA hoặc scripts/migrate-to-mysql.js.
    isReady = true;
    return pool;
  }

  try {
    const connection = await pool.getConnection();
    connection.release();

    // Bỏ CREATE DATABASE / USE — DB cloud thường đã chọn sẵn database
    // và bỏ FULLTEXT nếu là TiDB (không hỗ trợ)
    let schemaSql = fs.readFileSync(schemaPath, 'utf8')
      .replace(/CREATE\s+DATABASE[\s\S]*?;/gi, '')
      .replace(/USE\s+[`"]?\w+[`"]?\s*;/gi, '');
    const [[{ version }]] = await pool.query('SELECT VERSION() AS version');
    if (isTiDB(version)) {
      schemaSql = getSchemaSql(true)
        .replace(/CREATE\s+DATABASE[\s\S]*?;/gi, '')
        .replace(/USE\s+[`"]?\w+[`"]?\s*;/gi, '');
      console.log('[db] TiDB detected — FULLTEXT index skipped.');
    }
    await applySchema(pool, schemaSql, 'db');

    // Seed initial users if table is empty
    const [userRows] = await pool.query('SELECT COUNT(*) AS count FROM users');
    const { getInitialUsers, ADMIN_USERNAME, ADMIN_PASSWORD } = await import('./seed.js');
    if (userRows[0].count === 0) {
      for (const u of getInitialUsers()) {
        await pool.query(
          'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
          [u.username, u.password_hash, u.role]
        );
      }
      console.log('[db] Seeded initial admin user.');
    } else {
      // Keep the admin account in sync with the required credentials (admin / 123)
      // without re-writing the hash on every boot when it already matches.
      const [adminRows] = await pool.query(
        'SELECT password_hash FROM users WHERE username = ?',
        [ADMIN_USERNAME]
      );
      if (adminRows.length > 0) {
        const { default: bcrypt } = await import('bcryptjs');
        const matches = bcrypt.compareSync(ADMIN_PASSWORD, adminRows[0].password_hash);
        if (!matches) {
          await pool.query('UPDATE users SET password_hash = ? WHERE username = ?', [
            bcrypt.hashSync(ADMIN_PASSWORD, 10),
            ADMIN_USERNAME,
          ]);
          console.log('[db] Reset admin password hash to match seed configuration.');
        }
      } else {
        await pool.query(
          'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
          [ADMIN_USERNAME, bcrypt.hashSync(ADMIN_PASSWORD, 10), 'admin']
        );
        console.log('[db] Recreated missing admin user.');
      }
    }

    // Seed initial tenants if table is empty
    const [tenantRows] = await pool.query('SELECT COUNT(*) AS count FROM tenants');
    if (tenantRows[0].count === 0) {
      const [existingRooms] = await pool.query('SELECT id FROM rooms');
      const roomIds = new Set(existingRooms.map((r) => r.id));
      const { getInitialTenants } = await import('./seed.js');
      for (const t of getInitialTenants()) {
        if (!roomIds.has(t.room_id)) continue;
        await pool.query(
          'INSERT INTO tenants (room_id, full_name, phone, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
          [t.room_id, t.full_name, t.phone, t.start_date, t.end_date]
        );
      }
      console.log('[db] Seeded initial tenants.');
    }

    // Seed initial rooms if table is empty
    const [roomRows] = await pool.query('SELECT COUNT(*) AS count FROM rooms');
    if (roomRows[0].count === 0) {
      const { getInitialRooms } = await import('./seed.js');
      for (const r of getInitialRooms()) {
        await pool.query(
          `INSERT INTO rooms (
            id, title, description, address, price, area, images, status,
            electricity, water, internet, service_fee, max_people, district, city, lat, lng,
            amenities, phone, zalo_link, views, contacts, is_featured, is_new, is_cheap, rating
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id, r.title, r.description, r.address, r.price, r.area, JSON.stringify(r.images), r.status,
            r.electricity, r.water, r.internet, r.serviceFee, r.maxPeople, r.district, r.city, r.lat, r.lng,
            JSON.stringify(r.amenities), r.phone, r.zaloLink, r.views, r.contacts, r.isFeatured ? 1 : 0, r.isNew ? 1 : 0, r.isCheap ? 1 : 0, r.rating
          ]
        );
      }
      console.log('[db] Seeded initial rooms.');
    }

    isReady = true;
    console.log('[db] Connected to MySQL successfully.');
    return pool;
  } catch (error) {
    isMockMode = true;
    console.warn('[db] MySQL is unavailable, using in-memory mode:', error.message);
    return null;
  }
};

// Trên Workers: schema được áp dụng 1 lần qua scripts/migrate-to-mysql.js
// (chạy từ máy local, không cần bundle schema.sql vào Worker).
// Đặt DB_APPLY_SCHEMA=true + thêm loader .sql trong wrangler nếu muốn chạy tại chỗ.

await createPool();

export { pool, isMockMode, isReady };