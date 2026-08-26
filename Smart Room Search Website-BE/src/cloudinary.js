import jwt from 'jsonwebtoken';
import { createHmac } from 'node:crypto';

// Upload/delete ảnh qua Cloudinary Upload API (fetch) — tương thích Cloudflare Workers.
// Không dùng SDK cloudinary vì nó phụ thuộc fs/http/https không chạy trên workerd.
// Credentials lấy từ env/secrets: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB/ảnh
const MAX_FILES = 12;
const CLOUDINARY_FOLDER = 'smart-room/rooms';

export const corsHeaders = (request, env) => {
  const origin = request.headers.get('Origin');
  const allowedOrigins = String(env?.CORS_ORIGIN || process.env.CORS_ORIGIN || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  let allowOrigin = '*';
  if (allowedOrigins.length > 0) {
    allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
};

export const checkAuth = (request, env) => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ message: 'Token không hợp lệ' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) } }
    );
  }
  try {
    const secret = String((env && env.JWT_SECRET) || process.env.JWT_SECRET || '').trim();
    if (!secret) throw new Error('JWT_SECRET chưa được cấu hình');
    const decoded = jwt.verify(authHeader.split(' ')[1], secret);
    if (decoded.role !== 'admin') throw new Error('Admin role required');
    return null;
  } catch {
    return new Response(
      JSON.stringify({ message: 'Token không hợp lệ hoặc đã hết hạn' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) } }
    );
  }
};

const jsonError = (request, status, message, env) =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
  });

const cloudinaryConfig = (env) => ({
  cloudName: env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: env.CLOUDINARY_API_KEY || '',
  apiSecret: env.CLOUDINARY_API_SECRET || '',
});

// Chữ ký Cloudinary: HMAC-SHA1 của các params (trừ file/cloud_name/resource_type/type/signature) sắp xếp theo tên.
const signParams = (params, apiSecret) => {
  const str = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHmac('sha1', apiSecret).update(str).digest('hex');
};

export const handleUpload = async (request, env) => {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig(env);
  if (!cloudName || !apiKey || !apiSecret) {
    return jsonError(request, 500, 'Chưa cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)', env);
  }

  try {
    const formData = await request.formData();
    const files = [...formData.entries()]
      .filter(([key, value]) => key === 'images' && value instanceof File)
      .map(([, value]) => value);

    if (files.length === 0) {
      return jsonError(request, 400, 'Chưa có file ảnh nào được chọn', env);
    }
    if (files.length > MAX_FILES) {
      return jsonError(request, 400, `Tối đa ${MAX_FILES} ảnh mỗi lần upload`, env);
    }

    const urls = [];
    for (const file of files) {
      if (!ALLOWED_TYPES[file.type]) {
        return jsonError(request, 400, 'Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF, AVIF', env);
      }
      if (file.size > MAX_FILE_SIZE) {
        return jsonError(request, 400, 'Ảnh vượt quá giới hạn 10MB mỗi file', env);
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const params = { timestamp, folder: CLOUDINARY_FOLDER, api_key: apiKey };
      const signature = signParams(params, apiSecret);

      const body = new FormData();
      body.append('file', file);
      body.append('folder', CLOUDINARY_FOLDER);
      body.append('timestamp', String(timestamp));
      body.append('api_key', apiKey);
      body.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body,
      });
      const data = await res.json();
      if (!res.ok || !data.secure_url) {
        console.error('[cloudinary] upload failed:', res.status, data?.error?.message || JSON.stringify(data));
        return jsonError(request, 502, 'Upload ảnh lên Cloudinary thất bại', env);
      }
      urls.push(data.secure_url);
    }

    return new Response(JSON.stringify({ urls }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
    });
  } catch (error) {
    console.error('[cloudinary] upload error:', error);
    return jsonError(request, 500, 'Lỗi khi upload ảnh', env);
  }
};

// Rút public_id từ URL Cloudinary: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/<folder>/<file>
export const publicIdFromUrl = (url) => {
  const marker = '/image/upload/';
  const idx = String(url || '').indexOf(marker);
  if (idx === -1) return null;
  const path = decodeURIComponent(String(url).slice(idx + marker.length).split('?')[0]);
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  if (/^v\d+$/.test(parts[0])) parts.shift();
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1].replace(/\.(jpe?g|png|webp|gif|avif|heic|svg)$/i, '');
  if (!last) return null;
  parts[parts.length - 1] = last;
  return parts.join('/');
};

export const handleDelete = async (request, env, target) => {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig(env);
  if (!cloudName || !apiKey || !apiSecret) {
    return jsonError(request, 500, 'Chưa cấu hình Cloudinary (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)', env);
  }

  const publicId = publicIdFromUrl(target) || (target && /^[a-zA-Z0-9_./-]+$/.test(target) ? target : null);
  if (!publicId) {
    return jsonError(request, 400, 'Chỉ hỗ trợ xóa ảnh Cloudinary (URL res.cloudinary.com hoặc public_id)', env);
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = { timestamp, public_id: publicId, api_key: apiKey };
    const signature = signParams(params, apiSecret);

    const body = new FormData();
    body.append('public_id', publicId);
    body.append('timestamp', String(timestamp));
    body.append('api_key', apiKey);
    body.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body,
    });
    const data = await res.json();
    if (!res.ok || data.result !== 'ok') {
      console.error('[cloudinary] destroy failed:', res.status, data?.error?.message || data?.result);
      return jsonError(request, 404, 'Không tìm thấy ảnh', env);
    }
    return new Response(JSON.stringify({ message: 'Đã xóa ảnh' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request, env) },
    });
  } catch (error) {
    console.error('[cloudinary] destroy error:', error);
    return jsonError(request, 500, 'Lỗi khi xóa ảnh', env);
  }
};
