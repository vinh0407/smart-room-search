import axios from 'axios';

function normalizeApiBase(url: string): string {
  const raw = String(url || '').trim().replace(/\/+$/, '');
  if (!raw) return '/api';
  return /\/api$/i.test(raw) ? raw : `${raw}/api`;
}

const api = axios.create({
  // Local: http://localhost:4000/api (BE Express) hoặc http://localhost:8787/api (wrangler dev)
  // Production: https://smart-room-api.<your-subdomain>.workers.dev/api
  // Tự thêm /api nếu VITE_API_URL chỉ tới gốc domain (vd: ...workers.dev)
  baseURL: normalizeApiBase(import.meta.env.VITE_API_URL as string | undefined),
  // Worker Cloudflare / TiDB kết nối nhanh; giữ timeout cao cho kết nối đầu
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Anti-cache for GET requests
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }

  return config;
});

export default api;
