import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isWorkers } from './db.js';

const __filename = (() => {
  try {
    return fileURLToPath(import.meta.url);
  } catch {
    return '/config/jsonDb.js';
  }
})();
const __dirname = path.dirname(__filename);

// Workers không có filesystem bền vững — cấm mọi fallback dữ liệu JSON.
// Nếu code chạm tới đây trên Workers nghĩa là DB không khả dụng → lỗi rõ ràng.
const assertWritable = () => {
  if (isWorkers) {
    throw new Error('Database không khả dụng trên Cloudflare Workers (JSON fallback bị vô hiệu hóa).');
  }
};

const getDataFilePath = (fileName) => {
  return path.join(__dirname, '../../data', fileName);
};

export const readJsonFile = (fileName, defaultValue = []) => {
  assertWritable();
  const filePath = getDataFilePath(fileName);
  const folderPath = path.dirname(filePath);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    return defaultValue;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[jsonDb] Error reading database file ${fileName}:`, error);
    return defaultValue;
  }
};

export const writeJsonFile = (fileName, data) => {
  assertWritable();
  const filePath = getDataFilePath(fileName);
  const folderPath = path.dirname(filePath);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`[jsonDb] Error writing database file ${fileName}:`, error);
  }
};
