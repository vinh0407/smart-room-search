import { pool, isMockMode, isReady, isWorkers } from '../config/db.js';
import { isDataService, tidb } from '../config/tidbDataService.js';
import { getInitialTenants } from '../config/seed.js';
import { readJsonFile, writeJsonFile } from '../config/jsonDb.js';
import { updateRoomStatus } from './roomModel.js';
import { recordTenantDeletion } from './tenantHistoryModel.js';

const dbUnavailable = () => {
  if (isWorkers && !pool) {
    throw Object.assign(
      new Error(
        'Database không khả dụng trên Cloudflare Workers — cần cấu hình TiDB Data Service (TIDB_DATA_SERVICE_URL / TIDB_DATA_PUBLIC_KEY / TIDB_DATA_PRIVATE_KEY)'
      ),
      { statusCode: 500 }
    );
  }
};

const getTenants = () => readJsonFile('tenants_db.json', getInitialTenants());
const saveTenants = (tenants) => writeJsonFile('tenants_db.json', tenants);

const TENANT_FIELDS = [
  'room_id', 'full_name', 'phone', 'cccd',
  'deposit_amount', 'amount_given', 'amount_remaining', 'rent_price',
  'contract_signed_date', 'move_in_date', 'start_date', 'end_date',
  'people_count', 'contract_months',
  'owner_name', 'owner_phone',
  'payment_status', 'note', 'is_complete',
];

const checkComplete = (t) =>
  Boolean(t.cccd && t.phone && t.move_in_date && (t.rent_price || t.deposit_amount));

const mapTenantRow = (t, roomTitle) => ({
  id: t.id,
  room_id: t.room_id,
  room_title: roomTitle || `Phòng #${t.room_id}`,
  full_name: t.full_name || '',
  phone: t.phone || '',
  cccd: t.cccd || '',
  deposit_amount: Number(t.deposit_amount || 0),
  amount_given: Number(t.amount_given || 0),
  amount_remaining: Number(t.amount_remaining || 0),
  rent_price: Number(t.rent_price || 0),
  contract_signed_date: t.contract_signed_date || null,
  move_in_date: t.move_in_date || null,
  start_date: t.start_date || null,
  end_date: t.end_date || null,
  people_count: Number(t.people_count || 1),
  contract_months: Number(t.contract_months || 0),
  owner_name: t.owner_name || '',
  owner_phone: t.owner_phone || '',
  payment_status: t.payment_status || '',
  note: t.note || '',
  is_complete: Number(t.is_complete) === 1,
  created_at: t.created_at,
});

export const getAllTenants = async () => {
  if (isDataService()) {
    const { rows } = await tidb('/tenants', { method: 'GET' });
    return rows.map((row) => mapTenantRow(row, row.room_title));
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const tenants = getTenants();
    const rooms = readJsonFile('rooms_db.json', []);

    return tenants.map((t) => {
      const room = rooms.find((r) => r.id === t.room_id);
      return mapTenantRow(t, room ? room.title : null);
    }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }

  const [rows] = await pool.query(
    `SELECT t.*, r.title AS room_title
     FROM tenants t
     JOIN rooms r ON t.room_id = r.id
     ORDER BY t.created_at DESC`
  );
  return rows.map((row) => mapTenantRow(row, row.room_title));
};

export const createTenant = async (tenantData) => {
  const roomId = Number(tenantData.room_id);
  const isComplete = checkComplete(tenantData);

  if (isDataService()) {
    const { rows: roomRows } = await tidb('/rooms/{id}', { method: 'GET', params: { id: roomId } });
    if (!roomRows[0]) {
      throw Object.assign(new Error('Không tìm thấy phòng'), { statusCode: 404 });
    }
    const insert = {
      room_id: roomId,
      full_name: tenantData.full_name || '',
      phone: tenantData.phone || '',
      cccd: tenantData.cccd || null,
      deposit_amount: Number(tenantData.deposit_amount || 0),
      amount_given: Number(tenantData.amount_given || 0),
      amount_remaining: Number(tenantData.amount_remaining || 0),
      rent_price: Number(tenantData.rent_price || 0),
      contract_signed_date: tenantData.contract_signed_date || null,
      move_in_date: tenantData.move_in_date || null,
      start_date: tenantData.start_date || null,
      end_date: tenantData.end_date || null,
      people_count: Number(tenantData.people_count || 1),
      contract_months: Number(tenantData.contract_months || 0),
      owner_name: tenantData.owner_name || '',
      owner_phone: tenantData.owner_phone || '',
      payment_status: tenantData.payment_status || '',
      note: tenantData.note || '',
      is_complete: isComplete,
    };
    const { insertId } = await tidb('/tenants', { method: 'POST', body: insert });
    await updateRoomStatus(roomId, 'rented');
    return {
      id: insertId,
      room_id: roomId,
      full_name: tenantData.full_name || '',
      phone: tenantData.phone || '',
      is_complete: isComplete,
    };
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const room = await updateRoomStatus(roomId, 'rented');
    if (!room) {
      throw Object.assign(new Error('Không tìm thấy phòng'), { statusCode: 404 });
    }
    const tenants = getTenants();
    const nextId = tenants.length > 0 ? Math.max(...tenants.map((t) => t.id)) + 1 : 1;
    const newTenant = {
      id: nextId,
      room_id: roomId,
      full_name: tenantData.full_name || '',
      phone: tenantData.phone || '',
      cccd: tenantData.cccd || null,
      deposit_amount: Number(tenantData.deposit_amount || 0),
      amount_given: Number(tenantData.amount_given || 0),
      amount_remaining: Number(tenantData.amount_remaining || 0),
      rent_price: Number(tenantData.rent_price || 0),
      contract_signed_date: tenantData.contract_signed_date || null,
      move_in_date: tenantData.move_in_date || null,
      start_date: tenantData.start_date || null,
      end_date: tenantData.end_date || null,
      people_count: Number(tenantData.people_count || 1),
      contract_months: Number(tenantData.contract_months || 0),
      owner_name: tenantData.owner_name || '',
      owner_phone: tenantData.owner_phone || '',
      payment_status: tenantData.payment_status || '',
      note: tenantData.note || '',
      is_complete: isComplete,
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    tenants.push(newTenant);
    saveTenants(tenants);
    return newTenant;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [roomRows] = await connection.query('SELECT id FROM rooms WHERE id = ? FOR UPDATE', [roomId]);
    if (roomRows.length === 0) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const [result] = await connection.query(
      `INSERT INTO tenants (room_id, full_name, phone, cccd,
        deposit_amount, amount_given, amount_remaining, rent_price,
        contract_signed_date, move_in_date, start_date, end_date,
        people_count, contract_months, owner_name, owner_phone,
        payment_status, note, is_complete)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        roomId,
        tenantData.full_name || '',
        tenantData.phone || '',
        tenantData.cccd || null,
        Number(tenantData.deposit_amount || 0),
        Number(tenantData.amount_given || 0),
        Number(tenantData.amount_remaining || 0),
        Number(tenantData.rent_price || 0),
        tenantData.contract_signed_date || null,
        tenantData.move_in_date || null,
        tenantData.start_date || null,
        tenantData.end_date || null,
        Number(tenantData.people_count || 1),
        Number(tenantData.contract_months || 0),
        tenantData.owner_name || '',
        tenantData.owner_phone || '',
        tenantData.payment_status || '',
        tenantData.note || '',
        isComplete,
      ]
    );

    await connection.query('UPDATE rooms SET status = ? WHERE id = ?', ['rented', roomId]);
    await connection.commit();

    return {
      id: result.insertId,
      room_id: roomId,
      full_name: tenantData.full_name || '',
      phone: tenantData.phone || '',
      is_complete: isComplete,
    };
  } catch (error) {
    await connection.rollback();
    if (error.message === 'ROOM_NOT_FOUND') {
      throw Object.assign(new Error('Không tìm thấy phòng'), { statusCode: 404 });
    }
    throw error;
  } finally {
    connection.release();
  }
};

export const updateTenant = async (id, tenantData) => {
  const tenantId = Number(id);
  const isComplete = checkComplete(tenantData);

  if (isDataService()) {
    const body = {};
    for (const key of TENANT_FIELDS) {
      if (key === 'room_id') continue;
      body[key] = tenantData[key] !== undefined ? tenantData[key] : null;
    }
    body.is_complete = isComplete;
    const { affectedRows } = await tidb('/tenants/{id}', { method: 'PUT', params: { id: tenantId }, body });
    if (affectedRows === 0) return null;
    const { rows } = await tidb('/tenants/{id}', { method: 'GET', params: { id: tenantId } });
    return rows[0] || null;
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const tenants = getTenants();
    const index = tenants.findIndex((t) => t.id === tenantId);
    if (index === -1) return null;

    const updated = { ...tenants[index] };
    for (const key of TENANT_FIELDS) {
      if (key === 'room_id') continue;
      if (tenantData[key] !== undefined) {
        updated[key] = tenantData[key];
      }
    }
    updated.is_complete = checkComplete(updated);
    tenants[index] = updated;
    saveTenants(tenants);
    return updated;
  }

  const updates = [];
  const values = [];
  const allowed = TENANT_FIELDS.filter((f) => f !== 'room_id');

  for (const key of allowed) {
    if (tenantData[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(tenantData[key]);
    }
  }

  updates.push('is_complete = ?');
  values.push(isComplete);
  values.push(tenantId);

  if (updates.length === 1) return null;

  const [result] = await pool.query(
    `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  return rows[0] || null;
};

const getRoomTitle = async (roomId, connection = null) => {
  if (isDataService()) {
    const { rows } = await tidb('/rooms/{id}', { method: 'GET', params: { id: roomId } });
    return rows[0]?.title || null;
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const rooms = readJsonFile('rooms_db.json', []);
    const room = rooms.find((r) => Number(r.id) === Number(roomId));
    return room ? room.title : null;
  }

  const db = connection || pool;
  const [rows] = await db.query('SELECT title FROM rooms WHERE id = ?', [roomId]);
  return rows[0]?.title || null;
};

export const deleteTenant = async (id, reason = '') => {
  const tenantId = Number(id);

  if (isDataService()) {
    const { rows } = await tidb('/tenants/{id}', { method: 'GET', params: { id: tenantId } });
    if (!rows[0]) return null;
    const tenant = rows[0];
    const roomTitle = await getRoomTitle(tenant.room_id);

    await recordTenantDeletion(tenant, roomTitle, reason);

    await tidb('/tenants/{id}', { method: 'DELETE', params: { id: tenantId } });

    const { rows: remaining } = await tidb('/tenants', { method: 'GET', params: { roomId: tenant.room_id } });
    if (remaining.length === 0) {
      await updateRoomStatus(tenant.room_id, 'available');
    }
    return tenant;
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const tenants = getTenants();
    const index = tenants.findIndex((t) => Number(t.id) === tenantId);
    if (index === -1) return null;
    const deletedTenant = tenants[index];
    const roomTitle = await getRoomTitle(deletedTenant.room_id);
    await recordTenantDeletion(deletedTenant, roomTitle, reason);
    tenants.splice(index, 1);
    saveTenants(tenants);
    const hasOtherTenants = tenants.some((t) => Number(t.room_id) === Number(deletedTenant.room_id));
    if (!hasOtherTenants) {
      await updateRoomStatus(deletedTenant.room_id, 'available');
    }
    return deletedTenant;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM tenants WHERE id = ? FOR UPDATE', [tenantId]);
    if (rows.length === 0) return null;
    const tenant = rows[0];
    const roomTitle = await getRoomTitle(tenant.room_id, connection);

    await recordTenantDeletion(tenant, roomTitle, reason);

    await connection.query('DELETE FROM tenants WHERE id = ?', [tenantId]);

    const [remainingRows] = await connection.query(
      'SELECT COUNT(*) AS count FROM tenants WHERE room_id = ?',
      [tenant.room_id]
    );
    if (Number(remainingRows[0].count) === 0) {
      await connection.query('UPDATE rooms SET status = ? WHERE id = ?', ['available', tenant.room_id]);
    }

    await connection.commit();
    return tenant;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
