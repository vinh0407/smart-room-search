import bcrypt from 'bcryptjs';
import { pool, isMockMode, isReady, isWorkers } from '../config/db.js';
import { isDataService, tidb } from '../config/tidbDataService.js';
import { getInitialUsers } from '../config/seed.js';
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

const getUsers = () => readJsonFile('users_db.json', getInitialUsers());
const saveUsers = (users) => writeJsonFile('users_db.json', users);

const mapUser = (row) => ({
  id: row.id,
  username: row.username,
  password_hash: row.password_hash,
  role: row.role,
});

export const getUserByUsername = async (username) => {
  if (isDataService()) {
    const { rows } = await tidb('/users/{username}', { method: 'GET', params: { username } });
    return rows[0] ? mapUser(rows[0]) : null;
  }

  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const users = getUsers();
    return users.find((user) => user.username === username) || null;
  }

  dbUnavailable();
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
  return rows[0] ? mapUser(rows[0]) : null;
};

export const createUser = async (userData) => {
  if (isDataService()) {
    const body = {
      username: userData.username,
      password_hash: userData.password_hash,
      role: userData.role || 'admin',
    };
    const { insertId } = await tidb('/users', { method: 'POST', body });
    return { id: insertId, ...body };
  }
  if ((!isReady || isMockMode || !pool) && !isWorkers) {
    const users = getUsers();
    const user = {
      id: users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1,
      username: userData.username,
      password_hash: userData.password_hash,
      role: userData.role || 'admin',
    };
    users.push(user);
    saveUsers(users);
    return user;
  }

  dbUnavailable();
  const [result] = await pool.query(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [userData.username, userData.password_hash, userData.role || 'admin']
  );
  return {
    id: result.insertId,
    username: userData.username,
    password_hash: userData.password_hash,
    role: userData.role || 'admin',
  };
};
