import { pool, isMockMode, isReady, isWorkers } from '../config/db.js';
import { isDataService, tidb } from '../config/tidbDataService.js';
import { getInitialRooms } from '../config/seed.js';
import { readJsonFile, writeJsonFile } from '../config/jsonDb.js';
import { broadcastRoomsChange } from '../utils/events.js';
import { recordTenantDeletion } from './tenantHistoryModel.js';
import { isPlaceholderCoords, resolveRoomCoordinates } from '../utils/geocodeService.js';

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

const getRooms = () => readJsonFile('rooms_db.json', getInitialRooms());
const saveRooms = (rooms) => writeJsonFile('rooms_db.json', rooms);

export let roomsLastModified = Date.now();

export const updateRoomsLastModified = () => {
  roomsLastModified = Date.now();
  broadcastRoomsChange();
};

const parseJson = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const mapRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  address: row.address,
  price: Number(row.price),
  area: Number(row.area),
  images: parseJson(row.images),
  status: row.status,
  electricity: Number(row.electricity ?? 3500),
  water: Number(row.water ?? 150000),
  internet: Number(row.internet ?? 100000),
  serviceFee: Number(row.service_fee ?? 200000),
  maxPeople: Number(row.max_people ?? 2),
  district: row.district || 'Quận 1',
  city: row.city || 'TP.HCM',
  lat: Number(row.lat ?? 10.7731),
  lng: Number(row.lng ?? 106.6952),
  amenities: parseJson(row.amenities),
  phone: row.phone || '0901234567',
  zaloLink: row.zalo_link || 'https://zalo.me/0901234567',
  views: Number(row.views || 0),
  contacts: Number(row.contacts || 0),
  isFeatured: Boolean(row.is_featured),
  isNew: Boolean(row.is_new),
  isCheap: Boolean(row.is_cheap),
  rating: Number(row.rating ?? 4.5),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const normalize = (room) => ({
  ...room,
  images: Array.isArray(room.images) ? room.images : [],
  amenities: Array.isArray(room.amenities) ? room.amenities : [],
});

const persistMockRoomCoords = (rawRoom, lat, lng) => {
  const rooms = getRooms();
  const index = rooms.findIndex((r) => r.id === rawRoom.id);
  if (index === -1) return;
  rooms[index] = { ...rooms[index], lat, lng };
  saveRooms(rooms);
};

const syncMockRoomsCoordinates = async (rawRooms) => {
  let changed = false;
  const mapped = [];

  for (const raw of rawRooms) {
    const room = mapRow(raw);
    const { room: fixed, changed: fixedChanged } = await resolveRoomCoordinates(room);
    if (fixedChanged) {
      persistMockRoomCoords(raw, fixed.lat, fixed.lng);
      changed = true;
    }
    mapped.push(fixed);
  }

  if (changed) updateRoomsLastModified();
  return mapped;
};

const syncRoomCoords = async (row) => {
  const room = mapRow(row);
  const { room: fixed, changed } = await resolveRoomCoordinates(room);
  if (changed) {
    if (isDataService()) {
      await tidb('/rooms/{id}', { method: 'PUT', params: { id: fixed.id }, body: { lat: fixed.lat, lng: fixed.lng } });
    } else if (pool) {
      await pool.query('UPDATE rooms SET lat = ?, lng = ? WHERE id = ?', [fixed.lat, fixed.lng, fixed.id]);
    }
    updateRoomsLastModified();
  }
  return fixed;
};

export const getAllRooms = async (filters = {}) => {
  if (isDataService()) {
    const params = {};
    if (filters.status && filters.status !== 'all') params.status = filters.status;
    if (filters.district && filters.district !== 'Tất cả') params.district = filters.district;
    if (filters.priceMin !== undefined && filters.priceMin !== '') params.priceMin = Number(filters.priceMin);
    if (filters.priceMax !== undefined && filters.priceMax !== '' && Number(filters.priceMax) < 15000000) params.priceMax = Number(filters.priceMax);
    if (filters.areaMin !== undefined && filters.areaMin !== '') params.areaMin = Number(filters.areaMin);
    if (filters.areaMax !== undefined && filters.areaMax !== '' && Number(filters.areaMax) < 100) params.areaMax = Number(filters.areaMax);
    if (filters.search) params.search = filters.search;
    const { rows } = await tidb('/rooms', { method: 'GET', params });
    return Promise.all(rows.map((row) => syncRoomCoords(row)));
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    let result = await syncMockRoomsCoordinates(getRooms());

    if (filters.status && filters.status !== 'all') {
      result = result.filter((r) => r.status === filters.status);
    }
    if (filters.district && filters.district !== 'Tất cả') {
      result = result.filter((r) => r.district === filters.district);
    }
    if (filters.priceMin !== undefined && filters.priceMin !== '') {
      result = result.filter((r) => r.price >= Number(filters.priceMin));
    }
    if (filters.priceMax !== undefined && filters.priceMax !== '' && Number(filters.priceMax) < 15000000) {
      result = result.filter((r) => r.price <= Number(filters.priceMax));
    }
    if (filters.areaMin !== undefined && filters.areaMin !== '') {
      result = result.filter((r) => r.area >= Number(filters.areaMin));
    }
    if (filters.areaMax !== undefined && filters.areaMax !== '' && Number(filters.areaMax) < 100) {
      result = result.filter((r) => r.area <= Number(filters.areaMax));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }

  let query = 'SELECT * FROM rooms';
  const conditions = [];
  const values = [];

  if (filters.status && filters.status !== 'all') {
    conditions.push('status = ?');
    values.push(filters.status);
  }
  if (filters.district && filters.district !== 'Tất cả') {
    conditions.push('district = ?');
    values.push(filters.district);
  }
  if (filters.priceMin !== undefined && filters.priceMin !== '') {
    conditions.push('price >= ?');
    values.push(Number(filters.priceMin));
  }
  if (filters.priceMax !== undefined && filters.priceMax !== '' && Number(filters.priceMax) < 15000000) {
    conditions.push('price <= ?');
    values.push(Number(filters.priceMax));
  }
  if (filters.areaMin !== undefined && filters.areaMin !== '') {
    conditions.push('area >= ?');
    values.push(Number(filters.areaMin));
  }
  if (filters.areaMax !== undefined && filters.areaMax !== '' && Number(filters.areaMax) < 100) {
    conditions.push('area <= ?');
    values.push(Number(filters.areaMax));
  }
  if (filters.search) {
    conditions.push('(title LIKE ? OR address LIKE ? OR district LIKE ? OR description LIKE ?)');
    const likeVal = `%${filters.search}%`;
    values.push(likeVal, likeVal, likeVal, likeVal);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC';

  dbUnavailable();
  const [rows] = await pool.query(query, values);
  return Promise.all(rows.map((row) => syncRoomCoords(row)));
};

export const getRoomById = async (id) => {
  if (isDataService()) {
    const { rows } = await tidb('/rooms/{id}', { method: 'GET', params: { id } });
    if (!rows[0]) return null;
    return syncRoomCoords(rows[0]);
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const raw = getRooms().find((room) => room.id === Number(id));
    if (!raw) return null;
    const { room: fixed, changed } = await resolveRoomCoordinates(mapRow(raw));
    if (changed) persistMockRoomCoords(raw, fixed.lat, fixed.lng);
    return fixed;
  }

  dbUnavailable();
  const [rows] = await pool.query('SELECT * FROM rooms WHERE id = ?', [id]);
  if (!rows[0]) return null;
  return syncRoomCoords(rows[0]);
};

export const createRoom = async (roomData) => {
  const rooms = getRooms();
  const nextId = rooms.length > 0 ? Math.max(...rooms.map((r) => r.id)) + 1 : 1;

  const room = normalize({
    id: nextId,
    title: roomData.title,
    description: roomData.description || '',
    address: roomData.address,
    price: Number(roomData.price || 0),
    area: Number(roomData.area || 0),
    images: roomData.images || [],
    status: roomData.status || 'available',
    electricity: Number(roomData.electricity ?? 3500),
    water: Number(roomData.water ?? 150000),
    internet: Number(roomData.internet ?? 100000),
    serviceFee: Number(roomData.serviceFee ?? 200000),
    maxPeople: Number(roomData.maxPeople ?? 2),
    district: roomData.district || 'Quận 1',
    city: roomData.city || 'TP.HCM',
    lat: roomData.lat != null && roomData.lat !== '' ? Number(roomData.lat) : null,
    lng: roomData.lng != null && roomData.lng !== '' ? Number(roomData.lng) : null,
    amenities: roomData.amenities || [],
    phone: roomData.phone || '0901234567',
    zaloLink: roomData.zaloLink || 'https://zalo.me/0901234567',
    views: Number(roomData.views ?? 0),
    contacts: Number(roomData.contacts ?? 0),
    isFeatured: roomData.isFeatured ? 1 : 0,
    isNew: roomData.isNew ? 1 : 0,
    isCheap: roomData.isCheap ? 1 : 0,
    rating: Number(roomData.rating ?? 4.5),
    created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  });

  const { room: geocoded } = await resolveRoomCoordinates(mapRow(room));
  const finalRoom = normalize({
    ...room,
    lat: geocoded.lat,
    lng: geocoded.lng,
  });

  if (isDataService()) {
    const insert = {
      title: room.title,
      description: room.description,
      address: room.address,
      price: room.price,
      area: room.area,
      images: JSON.stringify(room.images),
      status: room.status,
      electricity: room.electricity,
      water: room.water,
      internet: room.internet,
      serviceFee: room.serviceFee,
      maxPeople: room.maxPeople,
      district: room.district,
      city: room.city,
      lat: finalRoom.lat,
      lng: finalRoom.lng,
      amenities: JSON.stringify(room.amenities),
      phone: room.phone,
      zaloLink: room.zaloLink,
      views: room.views,
      contacts: room.contacts,
      isFeatured: room.isFeatured ? 1 : 0,
      isNew: room.isNew ? 1 : 0,
      isCheap: room.isCheap ? 1 : 0,
      rating: room.rating,
    };
    const { insertId } = await tidb('/rooms', { method: 'POST', body: insert });
    updateRoomsLastModified();
    return { ...finalRoom, id: insertId };
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    rooms.push(finalRoom);
    saveRooms(rooms);
    updateRoomsLastModified();
    return mapRow(finalRoom);
  }

  dbUnavailable();
  const [result] = await pool.query(
    `INSERT INTO rooms (
      title, description, address, price, area, images, status,
      electricity, water, internet, service_fee, max_people, district, city, lat, lng,
      amenities, phone, zalo_link, views, contacts, is_featured, is_new, is_cheap, rating
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      room.title,
      room.description,
      room.address,
      room.price,
      room.area,
      JSON.stringify(room.images),
      room.status,
      room.electricity,
      room.water,
      room.internet,
      room.serviceFee,
      room.maxPeople,
      room.district,
      room.city,
      finalRoom.lat,
      finalRoom.lng,
      JSON.stringify(room.amenities),
      room.phone,
      room.zaloLink,
      room.views,
      room.contacts,
      room.isFeatured,
      room.isNew,
      room.isCheap,
      room.rating,
    ]
  );

  updateRoomsLastModified();
  return { ...finalRoom, id: result.insertId };
};

export const updateRoom = async (id, roomData) => {
  const roomId = Number(id);

  if (isDataService()) {
    const fields = [
      'title', 'description', 'address', 'price', 'area', 'status',
      'images', 'electricity', 'water', 'internet', 'serviceFee', 'maxPeople',
      'district', 'city', 'lat', 'lng', 'amenities', 'phone', 'zaloLink',
      'views', 'contacts', 'isFeatured', 'isNew', 'isCheap', 'rating',
    ];
    const body = {};
    for (const key of fields) {
      const value = roomData[key];
      if (value === undefined) {
        body[key] = null;
      } else if (key === 'images' || key === 'amenities') {
        body[key] = JSON.stringify(Array.isArray(value) ? value : []);
      } else if (key === 'isFeatured' || key === 'isNew' || key === 'isCheap') {
        body[key] = value ? 1 : 0;
      } else {
        body[key] = value;
      }
    }
    if (!fields.some((k) => roomData[k] !== undefined)) return null;
    await tidb('/rooms/{id}', { method: 'PUT', params: { id: roomId }, body });
    updateRoomsLastModified();
    return getRoomById(roomId);
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const rooms = getRooms();
    const index = rooms.findIndex((room) => room.id === roomId);
    if (index === -1) return null;

    rooms[index] = {
      ...rooms[index],
      ...roomData,
      images: roomData.images || rooms[index].images,
      amenities: roomData.amenities || rooms[index].amenities,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    const addressChanged =
      roomData.address !== undefined ||
      roomData.district !== undefined ||
      roomData.city !== undefined;
    const needsGeocode =
      addressChanged ||
      isPlaceholderCoords(rooms[index].lat, rooms[index].lng);

    if (needsGeocode) {
      const { room: fixed } = await resolveRoomCoordinates(mapRow(rooms[index]));
      rooms[index].lat = fixed.lat;
      rooms[index].lng = fixed.lng;
    }

    saveRooms(rooms);
    updateRoomsLastModified();
    return mapRow(rooms[index]);
  }

  const updates = [];
  const values = [];

  const mappings = {
    title: 'title',
    description: 'description',
    address: 'address',
    price: 'price',
    area: 'area',
    status: 'status',
    images: 'images',
    electricity: 'electricity',
    water: 'water',
    internet: 'internet',
    serviceFee: 'service_fee',
    maxPeople: 'max_people',
    district: 'district',
    city: 'city',
    lat: 'lat',
    lng: 'lng',
    amenities: 'amenities',
    phone: 'phone',
    zaloLink: 'zalo_link',
    views: 'views',
    contacts: 'contacts',
    isFeatured: 'is_featured',
    isNew: 'is_new',
    isCheap: 'is_cheap',
    rating: 'rating',
  };

  for (const [key, value] of Object.entries(roomData)) {
    const dbColumn = mappings[key];
    if (!dbColumn || value === undefined) continue;

    updates.push(`${dbColumn} = ?`);
    if (key === 'images' || key === 'amenities') {
      values.push(JSON.stringify(value));
    } else if (
      key === 'price' ||
      key === 'area' ||
      key === 'electricity' ||
      key === 'water' ||
      key === 'internet' ||
      key === 'serviceFee' ||
      key === 'maxPeople' ||
      key === 'lat' ||
      key === 'lng' ||
      key === 'views' ||
      key === 'contacts' ||
      key === 'rating'
    ) {
      values.push(Number(value));
    } else if (key === 'isFeatured' || key === 'isNew' || key === 'isCheap') {
      values.push(value ? 1 : 0);
    } else {
      values.push(value);
    }
  }

  if (updates.length === 0) return null;

  dbUnavailable();
  values.push(roomId);
  await pool.query(`UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`, values);
  updateRoomsLastModified();
  return getRoomById(roomId);
};

export const deleteRoom = async (id) => {
  const roomId = Number(id);

  if (isDataService()) {
    const { rows: roomRows } = await tidb('/rooms/{id}', { method: 'GET', params: { id: roomId } });
    if (!roomRows[0]) return false;
    const roomTitle = roomRows[0].title;

    const { rows: tenantRows } = await tidb('/tenants', { method: 'GET', params: { roomId } });
    for (const tenant of tenantRows) {
      await recordTenantDeletion(tenant, roomTitle, 'Xóa phòng');
    }

    const { affectedRows } = await tidb('/rooms/{id}', { method: 'DELETE', params: { id: roomId } });
    const deleted = affectedRows > 0;
    if (deleted) updateRoomsLastModified();
    return deleted;
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const rooms = getRooms();
    const index = rooms.findIndex((room) => room.id === roomId);
    if (index === -1) return null;
    const roomTitle = rooms[index].title;
    rooms.splice(index, 1);
    saveRooms(rooms);
    try {
      const tenants = readJsonFile('tenants_db.json', []);
      const roomTenants = tenants.filter((t) => Number(t.room_id) === roomId);
      for (const tenant of roomTenants) {
        await recordTenantDeletion(tenant, roomTitle, 'Xóa phòng');
      }
      const filtered = tenants.filter((t) => Number(t.room_id) !== roomId);
      if (filtered.length !== tenants.length) writeJsonFile('tenants_db.json', filtered);
    } catch (_) {}
    updateRoomsLastModified();
    return true;
  }

  const [roomRows] = await pool.query('SELECT title FROM rooms WHERE id = ?', [roomId]);
  if (roomRows.length === 0) return false;
  const roomTitle = roomRows[0].title;

  const [tenantRows] = await pool.query('SELECT * FROM tenants WHERE room_id = ?', [roomId]);
  for (const tenant of tenantRows) {
    await recordTenantDeletion(tenant, roomTitle, 'Xóa phòng');
  }

  dbUnavailable();
  const [result] = await pool.query('DELETE FROM rooms WHERE id = ?', [roomId]);
  const deleted = result.affectedRows > 0;
  if (deleted) {
    updateRoomsLastModified();
  }
  return deleted;
};

export const updateRoomStatus = async (id, status) => {
  const roomId = Number(id);

  if (isDataService()) {
    await tidb('/rooms/{id}/status', { method: 'PUT', params: { id: roomId }, body: { status } });
    updateRoomsLastModified();
    return getRoomById(roomId);
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const rooms = getRooms();
    const index = rooms.findIndex((room) => room.id === roomId);
    if (index === -1) return null;
    rooms[index] = {
      ...rooms[index],
      status,
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    saveRooms(rooms);
    updateRoomsLastModified();
    return mapRow(rooms[index]);
  }

  await pool.query('UPDATE rooms SET status = ? WHERE id = ?', [status, roomId]);
  updateRoomsLastModified();
  return getRoomById(roomId);
};

const incrementCounter = async (id, column) => {
  const roomId = Number(id);

  if (isDataService()) {
    const path = column === 'views' ? '/rooms/{id}/view' : '/rooms/{id}/contact';
    await tidb(path, { method: 'PUT', params: { id: roomId } });
    return true;
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const rooms = getRooms();
    const index = rooms.findIndex((room) => room.id === roomId);
    if (index === -1) return false;
    rooms[index][column] = Number(rooms[index][column] || 0) + 1;
    saveRooms(rooms);
    return true;
  }

  dbUnavailable();
  const [result] = await pool.query(
    `UPDATE rooms SET ${column} = ${column} + 1 WHERE id = ?`,
    [roomId]
  );
  return result.affectedRows > 0;
};

export const incrementRoomViews = async (id) => incrementCounter(id, 'views');

export const incrementRoomContacts = async (id) => incrementCounter(id, 'contacts');

export const getRoomStats = async () => {
  if (isDataService()) {
    const { rows } = await tidb('/rooms/stats', { method: 'GET' });
    const stats = rows[0] || {};
    return {
      total: Number(stats.total || 0),
      available: Number(stats.available || 0),
      rented: Number(stats.rented || 0),
      revenue: Number(stats.revenue || 0),
    };
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const rooms = getRooms();
    const total = rooms.length;
    const available = rooms.filter((room) => room.status === 'available').length;
    const rented = rooms.filter((room) => room.status === 'rented').length;
    const revenue = rooms.reduce((sum, room) => sum + (room.status === 'rented' ? Number(room.price) : 0), 0);

    return { total, available, rented, revenue };
  }

  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total, SUM(status = "available") AS available, SUM(status = "rented") AS rented, SUM(CASE WHEN status = "rented" THEN price ELSE 0 END) AS revenue FROM rooms'
  );
  const [stats] = rows;
  return {
    total: Number(stats.total || 0),
    available: Number(stats.available || 0),
    rented: Number(stats.rented || 0),
    revenue: Number(stats.revenue || 0),
  };
};
