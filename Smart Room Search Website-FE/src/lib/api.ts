import axios from 'axios';

function normalizeApiBase(url: string): string {
  const raw = String(url || '').trim().replace(/\/+$/, '');
  if (!raw) {
    return import.meta.env.PROD
      ? 'https://smart-room-api.smart-room-backend.workers.dev/api'
      : '/api';
  }
  return /\/api$/i.test(raw) ? raw : `${raw}/api`;
}

const api = axios.create({
  baseURL: normalizeApiBase(import.meta.env.VITE_API_URL as string | undefined),
  timeout: 60000,
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || `Lỗi ${error.response.status}`;
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Network error
      return Promise.reject(new Error('Không thể kết nối đến máy chủ'));
    } else {
      // Other error
      return Promise.reject(new Error(error.message || 'Đã có lỗi xảy ra'));
    }
  }
);

export default api;
