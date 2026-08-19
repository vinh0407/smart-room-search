import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { ADMIN_USERNAME, ADMIN_PASSWORD, getInitialRooms, getInitialUsers, getInitialTenants } from '../src/config/seed.js';
import { applySchema, getSchemaSql, isTiDB } from '../src/config/schemaLoader.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../data');

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL, DB_SSL_REJECT_UNAUTHORIZED } = process.env;

if (!DB_HOST || !DB_USER || DB_PASSWORD === undefined) {
  console.error('Missing DB configuration. Check your .env file (DB_HOST, DB_USER, DB_PASSWORD).');
  process.exit(1);
}

const useSsl = DB_SSL === 'true' || DB_SSL === '1';

const readDataFile = (fileName, fallback) => {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.warn(`[migrate] Could not read ${fileName}: ${error.message}`);
    return fallback;
  }
};

const insertRooms = async (connection, rooms) => {
  if (rooms.length === 0) return 0;
  let inserted = 0;
  for (const r of rooms) {
    const [check] = await connection.query('SELECT id FROM rooms WHERE id = ?', [r.id]);
    if (check.length > 0) continue;
    await connection.query(
      `INSERT INTO rooms (
        id, title, description, address, price, area, images, status,
        electricity, water, internet, service_fee, max_people, district, city, lat, lng,
        amenities, phone, zalo_link, views, contacts, is_featured, is_new, is_cheap, rating
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id, r.title, r.description || '', r.address, Number(r.price || 0), Number(r.area || 0),
        JSON.stringify(r.images || []), r.status || 'available',
        Number(r.electricity ?? 3500), Number(r.water ?? 150000), Number(r.internet ?? 100000),
        Number(r.serviceFee ?? 200000), Number(r.maxPeople ?? 2), r.district || 'Quận 1', r.city || 'TP.HCM',
        Number(r.lat ?? 10.7731), Number(r.lng ?? 106.6952),
        JSON.stringify(r.amenities || []), r.phone || '0901234567', r.zaloLink || `https://zalo.me/${r.phone || '0901234567'}`,
        Number(r.views || 0), Number(r.contacts || 0), r.isFeatured ? 1 : 0, r.isNew ? 1 : 0, r.isCheap ? 1 : 0,
        Number(r.rating ?? 4.5),
      ]
    );
    inserted += 1;
  }
  return inserted;
};

const insertUsers = async (connection, users) => {
  let inserted = 0;
  for (const u of users) {
    const [check] = await connection.query('SELECT id FROM users WHERE username = ?', [u.username]);
    if (check.length > 0) continue;
    await connection.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [u.username, u.password_hash, u.role || 'admin']
    );
    inserted += 1;
  }

  // Make sure the admin account exists with the correct credentials (admin / 123)
  const [adminRows] = await connection.query('SELECT password_hash FROM users WHERE username = ?', [ADMIN_USERNAME]);
  if (adminRows.length === 0) {
    await connection.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [ADMIN_USERNAME, bcrypt.hashSync(ADMIN_PASSWORD, 10), 'admin']
    );
    inserted += 1;
  } else if (!bcrypt.compareSync(ADMIN_PASSWORD, adminRows[0].password_hash)) {
    await connection.query('UPDATE users SET password_hash = ? WHERE username = ?', [
      bcrypt.hashSync(ADMIN_PASSWORD, 10),
      ADMIN_USERNAME,
    ]);
    console.log('[migrate] Reset admin password hash to admin / 123.');
  }

  return inserted;
};

const insertTenants = async (connection, tenants) => {
  if (tenants.length === 0) return 0;
  let inserted = 0;
  const [roomRows] = await connection.query('SELECT id FROM rooms');
  const roomIds = new Set(roomRows.map((r) => r.id));
  for (const t of tenants) {
    if (!roomIds.has(t.room_id)) {
      console.warn(`[migrate] Skipped tenant for unknown room ${t.room_id}.`);
      continue;
    }
    const [check] = await connection.query('SELECT id FROM tenants WHERE id = ?', [t.id]);
    if (check.length > 0) continue;
    await connection.query(
      `INSERT INTO tenants (
        id, room_id, full_name, phone, cccd,
        deposit_amount, amount_given, amount_remaining, rent_price,
        contract_signed_date, move_in_date, start_date, end_date,
        people_count, contract_months, owner_name, owner_phone,
        payment_status, note, is_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id, t.room_id, t.full_name || '', t.phone || '', t.cccd || null,
        Number(t.deposit_amount || 0), Number(t.amount_given || 0), Number(t.amount_remaining || 0), Number(t.rent_price || 0),
        t.contract_signed_date || null, t.move_in_date || null, t.start_date || null, t.end_date || null,
        Number(t.people_count || 1), Number(t.contract_months || 0), t.owner_name || '', t.owner_phone || '',
        t.payment_status || '', t.note || '', t.is_complete ? 1 : 0,
      ]
    );
    inserted += 1;
  }
  return inserted;
};

const run = async () => {
  console.log(`[migrate] Connecting to MySQL${useSsl ? ' (SSL)' : ''}...`);
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
    ...(useSsl
      ? { ssl: { rejectUnauthorized: DB_SSL_REJECT_UNAUTHORIZED !== 'false' } }
      : {}),
  });

  try {
    const [[{ version }]] = await connection.query('SELECT VERSION() AS version');
    const tiDB = isTiDB(version);
    console.log(`[migrate] Server version: ${version}${tiDB ? ' (TiDB — bỏ FULLTEXT index)' : ''}`);

    const dbName = (DB_NAME || 'smart_room_db').replace(/[^A-Za-z0-9_]/g, '');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.changeUser({ database: dbName });

    await applySchema(connection, getSchemaSql(tiDB), 'migrate');
    console.log('[migrate] Schema is up to date.');

    const rooms = readDataFile('rooms_db.json', getInitialRooms());
    const users = readDataFile('users_db.json', getInitialUsers());
    const tenants = readDataFile('tenants_db.json', getInitialTenants());

    console.log(`[migrate] JSON data: ${rooms.length} rooms, ${users.length} users, ${tenants.length} tenants.`);

    await connection.beginTransaction();
    const insertedRooms = await insertRooms(connection, rooms);
    const insertedUsers = await insertUsers(connection, users);
    const insertedTenants = await insertTenants(connection, tenants);
    await connection.commit();

    console.log(`[migrate] Done. Inserted ${insertedRooms} rooms, ${insertedUsers} users, ${insertedTenants} tenants.`);
    console.log(`[migrate] The backend will now read and update data from MySQL (${dbName}).`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
};

run().then(() => process.exit(0)).catch((error) => {
  console.error('[migrate] Failed:', error.message);
  process.exit(1);
});