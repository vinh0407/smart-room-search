import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let __dirname = '/';
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch {
  // Trên Workers bundle import.meta.url có thể undefined — chỉ cần khi đọc file (Node).
}
export const schemaPath = path.join(__dirname, '../../sql/schema.sql');

// TiDB không hỗ trợ FULLTEXT INDEX — cần bỏ câu lệnh này khi chạy trên TiDB
export const isTiDB = (versionString = '') => /tidb/i.test(versionString);

export const getSchemaSql = (isTiDBConnection) => {
  let sql = fs.readFileSync(schemaPath, 'utf8');
  if (isTiDBConnection) {
    sql = sql.replace(
      /CREATE\s+FULLTEXT\s+INDEX[\s\S]*?;/gi,
      '-- FULLTEXT index skipped (TiDB does not support FULLTEXT)\n'
    );
  }
  return sql;
};

// Chạy schema từng câu lệnh một, bỏ qua lỗi "đã tồn tại"
// (index/table) để có thể chạy lại nhiều lần mà không hỏng.
const IGNORED_ERRORS = [/duplicate key name/i, /already exists/i, /er_dup_keyname/i];

export const splitStatements = (schemaSql) =>
  schemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

export const applySchema = async (connection, schemaSql, label = 'schema') => {
  const statements = splitStatements(schemaSql);
  let applied = 0;
  for (const stmt of statements) {
    try {
      await connection.query(stmt);
      applied += 1;
    } catch (error) {
      if (IGNORED_ERRORS.some((re) => re.test(error.message))) {
        console.log(`[${label}] skipped (already exists): ${stmt.slice(0, 70).replace(/\s+/g, ' ')}...`);
      } else {
        throw error;
      }
    }
  }
  return applied;
};