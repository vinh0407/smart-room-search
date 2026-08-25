let database = null;

export const setDemandDatabase = (env) => {
  database = env?.DEMANDS_DB || null;
};

export const hasDemandDatabase = () => Boolean(database);

const db = () => {
  if (!database) throw new Error('Cloudflare D1 cho nhu cầu tìm phòng chưa được cấu hình');
  return database;
};

const fields = 'id, full_name, phone, gender, district, max_price, people_count, note, created_at';

export const listD1Demands = async () => {
  const { results = [] } = await db()
    .prepare(`SELECT ${fields} FROM room_demands ORDER BY datetime(created_at) DESC, id DESC`)
    .all();
  return results;
};

export const getD1Demand = async (id) =>
  db().prepare(`SELECT ${fields} FROM room_demands WHERE id = ?`).bind(id).first();

export const createD1Demand = async (data) => {
  const result = await db()
    .prepare(
      `INSERT INTO room_demands (full_name, phone, gender, district, max_price, people_count, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(data.full_name || '', data.phone || '', data.gender || null, data.district || null, Number(data.max_price || 0), Number(data.people_count || 1), data.note || '')
    .run();
  return getD1Demand(Number(result.meta.last_row_id));
};

export const updateD1Demand = async (id, data) => {
  const result = await db()
    .prepare(
      `UPDATE room_demands
       SET full_name = ?, phone = ?, gender = ?, district = ?, max_price = ?, people_count = ?, note = ?
       WHERE id = ?`
    )
    .bind(data.full_name || '', data.phone || '', data.gender || null, data.district || null, Number(data.max_price || 0), Number(data.people_count || 1), data.note || '', id)
    .run();
  return result.meta.changes > 0 ? getD1Demand(id) : null;
};

export const deleteD1Demand = async (id) => {
  const result = await db().prepare('DELETE FROM room_demands WHERE id = ?').bind(id).run();
  return result.meta.changes > 0 ? { id } : null;
};
