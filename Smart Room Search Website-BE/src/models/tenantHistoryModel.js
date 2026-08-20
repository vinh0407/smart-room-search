import { pool, isMockMode, isReady, isWorkers } from '../config/db.js';
import { isDataService, tidb } from '../config/tidbDataService.js';
import { readJsonFile, writeJsonFile } from '../config/jsonDb.js';

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

const getHistory = () => readJsonFile('tenant_history_db.json', []);
const saveHistory = (records) => writeJsonFile('tenant_history_db.json', records);

const mapHistoryRow = (row) => ({
  id: row.id,
  tenant_id: row.tenant_id,
  room_id: row.room_id,
  room_title: row.room_title || `Phòng #${row.room_id}`,
  full_name: row.full_name || '',
  phone: row.phone || '',
  cccd: row.cccd || '',
  deposit_amount: Number(row.deposit_amount || 0),
  rent_price: Number(row.rent_price || 0),
  move_in_date: row.move_in_date || null,
  start_date: row.start_date || null,
  end_date: row.end_date || null,
  delete_reason: row.delete_reason || '',
  deleted_at: row.deleted_at,
});

export const getAllTenantHistory = async () => {
  if (isDataService()) {
    const { rows } = await tidb('/tenant_history', { method: 'GET' });
    return rows.map(mapHistoryRow);
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    return getHistory()
      .map(mapHistoryRow)
      .sort((a, b) => new Date(b.deleted_at || 0).getTime() - new Date(a.deleted_at || 0).getTime());
  }

  const [rows] = await pool.query(
    'SELECT * FROM tenant_history ORDER BY deleted_at DESC'
  );
  return rows.map(mapHistoryRow);
};

export const recordTenantDeletion = async (tenant, roomTitle, reason = '') => {
  const deletedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const payload = {
    tenant_id: tenant.id,
    room_id: tenant.room_id,
    room_title: roomTitle || `Phòng #${tenant.room_id}`,
    full_name: tenant.full_name || '',
    phone: tenant.phone || '',
    cccd: tenant.cccd || '',
    deposit_amount: Number(tenant.deposit_amount || 0),
    rent_price: Number(tenant.rent_price || 0),
    move_in_date: tenant.move_in_date || null,
    start_date: tenant.start_date || null,
    end_date: tenant.end_date || null,
    delete_reason: reason || '',
    deleted_at: deletedAt,
  };

  if (isDataService()) {
    const { insertId } = await tidb('/tenant_history', { method: 'POST', body: payload });
    return { id: insertId, ...payload };
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const history = getHistory();
    const nextId = history.length > 0 ? Math.max(...history.map((h) => h.id)) + 1 : 1;
    const record = { id: nextId, ...payload };
    history.push(record);
    saveHistory(history);
    return record;
  }

  dbUnavailable();
  const [result] = await pool.query(
    `INSERT INTO tenant_history (
      tenant_id, room_id, room_title, full_name, phone, cccd,
      deposit_amount, rent_price, move_in_date, start_date, end_date,
      delete_reason, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.tenant_id,
      payload.room_id,
      payload.room_title,
      payload.full_name,
      payload.phone,
      payload.cccd || null,
      payload.deposit_amount,
      payload.rent_price,
      payload.move_in_date,
      payload.start_date,
      payload.end_date,
      payload.delete_reason,
      payload.deleted_at,
    ]
  );

  return { id: result.insertId, ...payload };
};
