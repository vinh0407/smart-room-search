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

const getDemands = () => readJsonFile('demands_db.json', []);
const saveDemands = (data) => writeJsonFile('demands_db.json', data);

export const getAllDemands = async () => {
  if (isDataService()) {
    const { rows } = await tidb('/demands', { method: 'GET' });
    return rows;
  }
  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    return getDemands().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }
  const [rows] = await pool.query('SELECT * FROM room_demands ORDER BY created_at DESC');
  return rows;
};

export const createDemand = async (data) => {
  if (isDataService()) {
    const body = {
      full_name: data.full_name || '',
      phone: data.phone || '',
      gender: data.gender || null,
      district: data.district || null,
      max_price: Number(data.max_price || 0),
      people_count: Number(data.people_count || 1),
      note: data.note || '',
    };
    const { insertId } = await tidb('/demands', { method: 'POST', body });
    return { id: insertId, ...data };
  }
  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const demands = getDemands();
    const nextId = demands.length > 0 ? Math.max(...demands.map((d) => d.id)) + 1 : 1;
    const newDemand = {
      id: nextId,
      full_name: data.full_name || '',
      phone: data.phone || '',
      gender: data.gender || null,
      district: data.district || null,
      max_price: Number(data.max_price || 0),
      people_count: Number(data.people_count || 1),
      note: data.note || '',
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    demands.push(newDemand);
    saveDemands(demands);
    return newDemand;
  }

  const [result] = await pool.query(
    `INSERT INTO room_demands (full_name, phone, gender, district, max_price, people_count, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.full_name, data.phone, data.gender, data.district, Number(data.max_price || 0), Number(data.people_count || 1), data.note || '']
  );
  return { id: result.insertId, ...data };
};

export const updateDemand = async (id, data) => {
  const demandId = Number(id);
  if (isDataService()) {
    const body = {
      full_name: data.full_name || '',
      phone: data.phone || '',
      gender: data.gender || null,
      district: data.district || null,
      max_price: Number(data.max_price || 0),
      people_count: Number(data.people_count || 1),
      note: data.note || '',
    };
    const { affectedRows } = await tidb('/demands/{id}', { method: 'PUT', params: { id: demandId }, body });
    if (affectedRows === 0) return null;
    const { rows } = await tidb('/demands/{id}', { method: 'GET', params: { id: demandId } });
    return rows[0] || null;
  }
  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const demands = getDemands();
    const idx = demands.findIndex((d) => d.id === demandId);
    if (idx === -1) return null;
    demands[idx] = {
      ...demands[idx],
      full_name: data.full_name ?? demands[idx].full_name,
      phone: data.phone ?? demands[idx].phone,
      gender: data.gender ?? demands[idx].gender,
      district: data.district ?? demands[idx].district,
      max_price:
        data.max_price !== undefined
          ? Number(data.max_price || 0)
          : demands[idx].max_price,
      people_count:
        data.people_count !== undefined
          ? Number(data.people_count || 1)
          : demands[idx].people_count,
      note: data.note ?? demands[idx].note,
    };
    saveDemands(demands);
    return demands[idx];
  }

  dbUnavailable();
  const [result] = await pool.query(
    `UPDATE room_demands
     SET full_name = ?, phone = ?, gender = ?, district = ?, max_price = ?, people_count = ?, note = ?
     WHERE id = ?`,
    [
      data.full_name || '',
      data.phone || '',
      data.gender || null,
      data.district || null,
      Number(data.max_price || 0),
      Number(data.people_count || 1),
      data.note || '',
      demandId,
    ]
  );
  if (result.affectedRows === 0) return null;
  const [rows] = await pool.query('SELECT * FROM room_demands WHERE id = ?', [demandId]);
  return rows[0] || null;
};

export const deleteDemand = async (id) => {
  const demandId = Number(id);
  if (isDataService()) {
    const { affectedRows } = await tidb('/demands/{id}', { method: 'DELETE', params: { id: demandId } });
    return affectedRows > 0 ? { id: demandId } : null;
  }
  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const demands = getDemands();
    const idx = demands.findIndex((d) => d.id === demandId);
    if (idx === -1) return null;
    const removed = demands.splice(idx, 1)[0];
    saveDemands(demands);
    return removed;
  }
  dbUnavailable();
  const [result] = await pool.query('DELETE FROM room_demands WHERE id = ?', [demandId]);
  return result.affectedRows > 0 ? { id: demandId } : null;
};
