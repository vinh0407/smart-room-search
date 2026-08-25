import axios from 'axios';

export interface ApiPreset {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const API_PRESETS: ApiPreset[] = [
  {
    id: 'local_tidb',
    name: 'BE Local (Express + TiDB / MySQL)',
    url: 'http://localhost:4000/api',
    description: 'Chạy BE Express local kết nối database TiDB Cloud / MySQL',
  },
  {
    id: 'vite_proxy',
    name: 'Vite Proxy nội bộ (/api)',
    url: '/api',
    description: 'Chuyển tiếp request qua Vite Dev Server proxy đến BE',
  },
  {
    id: 'cloudflare_tidb',
    name: 'TiDB Data Service / Cloudflare Worker',
    url: 'https://smart-room-api.smart-room-backend.workers.dev/api',
    description: 'Serverless Worker kết nối TiDB Cloud Data Service trực tiếp',
  },
];

export function normalizeApiBase(url: string): string {
  const raw = String(url || '').trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:4000/api';
  if (raw === '/api') return '/api';
  return /\/api$/i.test(raw) ? raw : `${raw}/api`;
}

function defaultApiBase(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL as string;
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  return isLocal
    ? 'http://localhost:4000/api'
    : 'https://smart-room-api.smart-room-backend.workers.dev/api';
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
    localStorage.getItem('admin_api_base') || defaultApiBase() || ''
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
  if (base === '/api') return '/health';
  return base.replace(/\/api$/i, '') + '/health';
}

export function getDbHealthUrl(): string {
  const base = api.defaults.baseURL || '';
  if (base === '/api') return '/api/health/db';
  return base.replace(/\/api$/i, '') + '/api/health/db';
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