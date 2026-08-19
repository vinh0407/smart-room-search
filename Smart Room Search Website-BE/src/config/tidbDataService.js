// Client gọi TiDB Cloud Data Service qua HTTPS fetch (tương thích Cloudflare Workers).
// Không dùng mysql2 trên Workers — DB truy cập qua endpoint HTTP của Data App.
// Env: TIDB_DATA_SERVICE_URL, TIDB_DATA_PUBLIC_KEY, TIDB_DATA_PRIVATE_KEY
// Auth: thử Basic trước; nếu server trả challenge Digest (theo Code Example chính thức
// của TiDB `curl --digest --user`), tự tính MD5 digest và gọi lại.

import { createHash } from 'node:crypto';

const REQUEST_TIMEOUT_MS = 15000;

// Cấu hình lấy từ env bindings (Cloudflare) hoặc process.env (Node local).
let envConfig = null;

/**
 * Nhận env bindings từ fetch(request, env, ctx) — BẮT BUỘC gọi ở đầu handler
 * trên Cloudflare Workers (không dùng process.env cho secrets).
 * Node local không gọi hàm này — tự fallback process.env (dotenv).
 */
export function setConfig(env) {
  envConfig = env || null;
}

const src = () => envConfig || process.env;

const config = () => ({
  url: (src().TIDB_DATA_SERVICE_URL || '').trim(),
  publicKey: (src().TIDB_DATA_PUBLIC_KEY || '').trim(),
  privateKey: (src().TIDB_DATA_PRIVATE_KEY || '').trim(),
});

// Chỉ bật chế độ Data Service khi đủ URL + cả 2 key.
// Là hàm (không phải const) vì env chỉ có sẵn khi fetch() chạy.
export const isDataService = () => Boolean(
  config().url && config().publicKey && config().privateKey
);

const getBasicAuth = (publicKey, privateKey) =>
  `Basic ${btoa(`${publicKey}:${privateKey}`)}`;

const md5 = (s) => createHash('md5').update(s).digest('hex');

const parseDigestChallenge = (header) => {
  const out = {};
  const re = /(\w+)\s*=\s*(?:"([^"]*)"|([^\s,]+))/g;
  let m;
  while ((m = re.exec(header)) !== null) out[m[1]] = m[2] !== undefined ? m[2] : m[3];
  return out;
};

// Gọi fetch kèm timeout; nếu gặp challenge Digest thì tính response và gọi lại 1 lần.
const authFetch = async (url, init, publicKey, privateKey) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const first = await fetch(url, { ...init, signal: controller.signal });
    if (first.status !== 401) return first;

    const challenge = first.headers.get('WWW-Authenticate') || '';
    const digestMatch = challenge.match(/^Digest\s+(.*)$/i);
    if (!digestMatch) return first;

    const p = parseDigestChallenge(digestMatch[1]);
    const realm = p.realm || '';
    const nonce = p.nonce || '';
    const qop = p.qop && String(p.qop).includes('auth') ? 'auth' : '';
    const opaque = p.opaque || '';
    const u = new URL(url);
    const uri = u.pathname + u.search;
    const nc = '00000001';
    const cnonce = Math.random().toString(16).slice(2, 12);
    const ha1 = md5(`${publicKey}:${realm}:${privateKey}`);
    const ha2 = md5(`${init.method || 'GET'}:${uri}`);
    const response = qop
      ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      : md5(`${ha1}:${nonce}:${ha2}`);

    const parts = [
      `username="${publicKey}"`,
      `realm="${realm}"`,
      `nonce="${nonce}"`,
      `uri="${uri}"`,
    ];
    if (qop) parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
    parts.push(`response="${response}"`);
    if (opaque) parts.push(`opaque="${opaque}"`);

    const retry = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Digest ${parts.join(', ')}` },
      signal: controller.signal,
    });
    return retry;
  } catch (error) {
    if (error && error.name === 'AbortError') {
      console.error('[tidb] request timeout after', REQUEST_TIMEOUT_MS, 'ms');
      throw Object.assign(new Error('TiDB Data Service request timeout'), { statusCode: 504 });
    }
    if (!error || error.statusCode === undefined) {
      console.error('[tidb] unreachable:', error && error.message);
      throw Object.assign(
        new Error(`TiDB Data Service unreachable (${(error && error.message) || 'network error'})`),
        { statusCode: 502, cause: error }
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

// Chuẩn hóa response của Data Service về dạng chung.
// SELECT → { rows: [...] }; INSERT/UPDATE/DELETE → { insertId, affectedRows }.
const normalize = (raw) => {
  let node = raw;
  if (node && typeof node === 'object' && 'data' in node) node = node.data;

  const out = { rows: [], insertId: null, affectedRows: null, raw: node };
  if (Array.isArray(node)) {
    out.rows = node;
    return out;
  }
  if (!node || typeof node !== 'object') return out;

  if (Array.isArray(node.rows)) out.rows = node.rows;

  if (Array.isArray(node.result)) {
    const isWrite = node.result.some(
      (r) => r && typeof r === 'object' && ('insert_id' in r || 'row_affected' in r)
    );
    if (isWrite) {
      const meta = node.result[0] || {};
      out.insertId = meta.insert_id ?? meta.insertId ?? null;
      out.affectedRows = meta.row_affected ?? meta.rowAffected ?? meta.affectedRows ?? null;
    } else {
      out.rows = node.result;
    }
  }

  if (node.insert_id !== undefined) out.insertId = node.insert_id;
  if (node.row_affected !== undefined) out.affectedRows = node.row_affected;

  return out;
};

/**
 * Gọi một endpoint của Data App.
 * @param {string} endpointPath  Ví dụ: '/rooms', '/rooms/{id}'
 * @param {object} options       { method, params, body }
 *                               GET: params → query string; khác: params+body → JSON body
 */
export async function tidbRaw(endpointPath, options = {}) {
  const { url, publicKey, privateKey } = config();
  const { method = 'GET', params = {}, body = null } = options;

  const baseUrl = url.replace(/\/+$/, '');
  let fullUrl = `${baseUrl}/${String(endpointPath).replace(/^\/+/, '')}`;

  // Thay {param} trong path bằng giá trị thật (TiDB DS bind param từ URL path)
  fullUrl = fullUrl.replace(/\{([^}]+)\}/g, (match, name) => {
    const v = params[name];
    if (v === undefined || v === null || v === '') return match;
    return encodeURIComponent(String(v));
  });

  const headers = {
    Authorization: getBasicAuth(publicKey, privateKey),
    Accept: 'application/json',
  };

  let payload;
  if (method === 'GET') {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, String(value));
      }
    }
    const q = qs.toString();
    if (q) fullUrl += (fullUrl.includes('?') ? '&' : '?') + q;
  } else {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify({ ...params, ...(body || {}) });
  }

  const response = await authFetch(
    fullUrl,
    { method, headers, body: payload },
    publicKey,
    privateKey
  );

  const text = await response.text();
  return { status: response.status, text };
}

export async function tidb(endpointPath, options = {}) {
  const { url, publicKey, privateKey } = config();
  const { method = 'GET', params = {}, body = null } = options;

  if (!url || !publicKey || !privateKey) {
    throw Object.assign(
      new Error(
        'TiDB Data Service chưa được cấu hình (TIDB_DATA_SERVICE_URL / TIDB_DATA_PUBLIC_KEY / TIDB_DATA_PRIVATE_KEY)'
      ),
      { statusCode: 500 }
    );
  }

  const baseUrl = url.replace(/\/+$/, '');
  let fullUrl = `${baseUrl}/${String(endpointPath).replace(/^\/+/, '')}`;

  // Thay {param} trong path bằng giá trị thật (TiDB DS bind param từ URL path)
  fullUrl = fullUrl.replace(/\{([^}]+)\}/g, (match, name) => {
    const v = params[name];
    if (v === undefined || v === null || v === '') return match;
    return encodeURIComponent(String(v));
  });

  const headers = {
    Authorization: getBasicAuth(publicKey, privateKey),
    Accept: 'application/json',
  };

  let payload;
  if (method === 'GET') {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, String(value));
      }
    }
    const q = qs.toString();
    if (q) fullUrl += (fullUrl.includes('?') ? '&' : '?') + q;
  } else {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify({ ...params, ...(body || {}) });
  }

  const response = await authFetch(
    fullUrl,
    {
      method,
      headers,
      body: payload,
    },
    publicKey,
    privateKey
  );

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    console.error('[TiDB Data Service]', response.status, text.slice(0, 500));
    let message;
    if (response.status === 401) {
      message =
        'TiDB Data Service authentication failed (kiểm tra API key Public/Private)';
    } else if (response.status === 404) {
      const dsMsg =
        typeof data?.data?.result?.message === 'string'
          ? data.data.result.message
          : '';
      const pathMatch = dsMsg.match(/request_path:\s*([^,]+),\s*method:\s*([A-Z]+)/);
      if (pathMatch) {
        message = `TiDB Data Service: endpoint CHƯA TỒN TẠI — ${pathMatch[2]} ${pathMatch[1]} (tạo endpoint theo TIDB-DATA-SERVICE-SETUP.md, dùng cú pháp {id}/{username})`;
      } else {
        message = `TiDB Data Service HTTP ${response.status} (${endpointPath}) — endpoint chưa tồn tại, xem TIDB-DATA-SERVICE-SETUP.md`;
      }
    } else if (response.status === 504) {
      message = `TiDB Data Service timeout (${endpointPath}) — kiểm tra lại SQL endpoint hoặc tăng timeout`;
    } else {
      message = `TiDB Data Service HTTP ${response.status}`;
    }
    throw Object.assign(new Error(message), {
      statusCode: response.status,
      detail: data,
    });
  }

  return normalize(data);
}
