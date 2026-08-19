import axios from 'axios';

function normalizeApiBase(url: string): string {
  const raw = String(url || '').trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:4000/api';
  return /\/api$/i.test(raw) ? raw : `${raw}/api`;
}

export function resolveApiBase(): string {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('api');
  if (fromQuery) {
    const normalized = normalizeApiBase(fromQuery);
    localStorage.setItem('admin_api_base', normalized);
    return normalized;
  }
  return normalizeApiBase(
    localStorage.getItem('admin_api_base') ||
      (import.meta.env.VITE_API_URL as string | undefined) ||
      'http://localhost:4000/api'
  );
}

export const api = axios.create({
  baseURL: resolveApiBase(),
  timeout: 60000,
});

export function setApiBase(url: string): string {
  const normalized = normalizeApiBase(url);
  localStorage.setItem('admin_api_base', normalized);
  api.defaults.baseURL = normalized;
  return normalized;
}

export function getHealthUrl(): string {
  const base = api.defaults.baseURL || '';
  return base.replace(/\/api$/i, '') + '/health';
}

export function getToken(): string {
  return localStorage.getItem('admin_token') || '';
}

export function setToken(token: string) {
  localStorage.setItem('admin_token', token);
}

export function clearToken() {
  localStorage.removeItem('admin_token');
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.hash !== '#/login') {
      clearToken();
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (error: unknown): string => {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || err.message || 'Đã xảy ra lỗi';
};